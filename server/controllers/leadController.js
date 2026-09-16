const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const ImportBatch = require("../models/ImportBatch");
const { validateLead } = require("../services/leadValidationService");
const { verifyLeadRecord } = require("../services/leadVerificationService");
const { deductUserCredits, getAndRefillCredits } = require("../services/creditService");

// Credit cost for Auto-Find Details (AI Web) per lead
const AUTO_FIND_CREDIT_COST = 98;

const createLead = async (req, res) => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      website,
      industry,
      location,
      source,
      notes
    } = req.body;

    if (!companyName) {
      return res.status(400).json({
        message: "Company name is required"
      });
    }

    const lead = await Lead.create({
      owner: req.user.id,
      companyName,
      contactName,
      email,
      phone,
      website,
      industry,
      location,
      source: source || "manual",
      notes,
      isScrap: false
    });

    res.status(201).json({ lead });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getLeads = async (req, res) => {
  try {
    const { status, industry, search, sortBy, order, verificationStatus, minVerificationScore } = req.query;

    const filter = {
      owner: req.user.id,
      isScrap: { $ne: true }
    };

    if (status) {
      filter.status = status;
    }

    if (industry) {
      filter.industry = { $regex: industry, $options: "i" };
    }

    if (verificationStatus) {
      if (verificationStatus === "needs_review") {
        filter["verification.warnings.0"] = { $exists: true };
      } else {
        filter["verification.status"] = verificationStatus;
      }
    }

    if (minVerificationScore) {
      filter["verification.score"] = { $gte: Number(minVerificationScore) };
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }

    const sortField = sortBy || "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const leads = await Lead.find(filter)
      .sort({ [sortField]: sortOrder });

    const counts = {
      total: leads.length,
      new: leads.filter(l => l.status === "new").length,
      contacted: leads.filter(l => l.status === "contacted").length,
      replied: leads.filter(l => l.status === "replied").length,
      qualified: leads.filter(l => l.status === "qualified").length,
      won: leads.filter(l => l.status === "won").length,
      lost: leads.filter(l => l.status === "lost").length,
      hot: leads.filter(l => l.score >= 80).length,
      warm: leads.filter(l => l.score >= 50 && l.score < 80).length,
      cold: leads.filter(l => l.score < 50).length,
      // Verification Intelligence KPIs
      verified: leads.filter(l => l.verification?.status === "verified" || l.verification?.status === "high_confidence").length,
      highConfidence: leads.filter(l => l.verification?.status === "high_confidence").length,
      partiallyVerified: leads.filter(l => l.verification?.status === "partially_verified").length,
      unverified: leads.filter(l => !l.verification || l.verification.status === "unverified").length,
      needsReview: leads.filter(l => l.verification?.warnings && l.verification.warnings.length > 0).length
    };

    res.json({ leads, counts });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found"
      });
    }

    res.json({ lead });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found"
      });
    }

    const allowedFields = [
      "companyName", "contactName", "email", "phone",
      "website", "industry", "location", "source",
      "status", "score", "notes", "aiAnalysis", "aiMessage"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    await lead.save();

    res.json({ lead });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found"
      });
    }

    res.json({
      message: "Lead deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const deleteBatchLeads = async (req, res) => {
  try {
    const { leadIds, all } = req.body;
    let query = { owner: req.user.id };

    if (all) {
      const result = await Lead.deleteMany(query);
      return res.json({
        message: `All ${result.deletedCount} leads deleted successfully.`,
        deletedCount: result.deletedCount
      });
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "No lead IDs provided for deletion." });
    }

    query._id = { $in: leadIds };
    const result = await Lead.deleteMany(query);

    res.json({
      message: `${result.deletedCount} leads deleted successfully.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const importCSV = async (req, res) => {
  try {
    const { leads: csvLeads, fileName } = req.body;

    if (!csvLeads || !Array.isArray(csvLeads) || csvLeads.length === 0) {
      return res.status(400).json({
        message: "Please provide an array of leads"
      });
    }

    const standardFields = new Set([
      "companyName", "contactName", "email", "phone",
      "website", "industry", "location", "notes", "source", "status", "score"
    ]);

    const effectiveFileName =
      (fileName && String(fileName).trim()) ||
      `Spreadsheet_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Process each lead candidate and validate against fake/dummy heuristics
    let cleanCount = 0;
    let incompleteCount = 0;
    let scrapCount = 0;

    const leadsToInsert = csvLeads.map((l, index) => {
      // Flexible lookup for company name
      const companyName =
        l.companyName ||
        l.company ||
        l.businessName ||
        l.organization ||
        l.org ||
        l.name ||
        l.firm ||
        `Lead #${index + 1}`;

      const contactName =
        l.contactName ||
        l.contact ||
        l.person ||
        l.fullName ||
        l.owner ||
        "";

      const email = l.email || l.emailAddress || l.mail || "";
      const phone = l.phone || l.mobile || l.telephone || l.phoneNumber || l.cell || "";
      const website = l.website || l.url || l.site || l.domain || "";
      const industry = l.industry || l.sector || l.category || "";
      const location = l.location || l.city || l.address || l.country || "";
      const notes = l.notes || l.note || l.comments || l.description || "";

      // Capture all extra dynamic columns into customFields
      const dynamicFields = {};
      for (const [key, val] of Object.entries(l)) {
        if (!standardFields.has(key) && key !== "customFields" && val !== undefined && val !== null && val !== "") {
          dynamicFields[key] = val;
        }
      }

      const leadCandidate = {
        owner: req.user.id,
        companyName: String(companyName).trim(),
        contactName: String(contactName).trim(),
        email: String(email).trim(),
        phone: String(phone).trim(),
        website: String(website).trim(),
        industry: String(industry).trim(),
        location: String(location).trim(),
        notes: String(notes).trim(),
        source: "spreadsheet-import",
        status: "new",
        score: 0,
        customFields: { ...dynamicFields, ...(l.customFields || {}) }
      };

      // Heuristic quality & dummy validation check
      const validation = validateLead(leadCandidate);
      leadCandidate.isScrap = validation.isScrap;
      leadCandidate.scrapReasons = validation.scrapReasons || validation.reasons || [];
      leadCandidate.completenessStatus = validation.completenessStatus || "complete";
      leadCandidate.missingFields = validation.missingFields || [];

      if (validation.isScrap) {
        scrapCount++;
      } else {
        cleanCount++;
        if (validation.classification === "incomplete" || validation.completenessStatus === "incomplete") {
          incompleteCount++;
        }
      }

      return leadCandidate;
    });

    if (leadsToInsert.length === 0) {
      return res.status(400).json({
        message: "No leads could be parsed from the file."
      });
    }

    // Create the batch record for folder organization
    const batch = await ImportBatch.create({
      owner: req.user.id,
      fileName: effectiveFileName,
      totalRows: leadsToInsert.length,
      cleanCount,
      incompleteCount,
      scrapCount
    });

    // Tag each lead with the batch ID and file name
    for (const item of leadsToInsert) {
      item.importBatchId = batch._id;
      item.importFileName = batch.fileName;
    }

    const inserted = await Lead.insertMany(leadsToInsert);

    res.status(201).json({
      message: `Import processed: ${cleanCount} active leads (${incompleteCount} incomplete, needs enrichment), and ${scrapCount} dummy/fake leads moved to Scraps folder.`,
      count: cleanCount,
      total: inserted.length,
      cleanCount,
      incompleteCount,
      scrapCount,
      batchId: batch._id,
      fileName: batch.fileName,
      leadIds: inserted.filter(l => !l.isScrap).map(l => l._id)
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const enrichSingleLead = async (req, res) => {
  try {
    // 1. Verify user has at least 98 credits
    const user = await getAndRefillCredits(req.user.id);
    if (!user || user.credits < AUTO_FIND_CREDIT_COST) {
      return res.status(402).json({
        message: `Insufficient credits! Auto-Find Details costs ${AUTO_FIND_CREDIT_COST} credits per lead, but you have ${user?.credits || 0} remaining. Your credits will automatically refill to 1,000 tomorrow.`,
        insufficientCredits: true,
        remainingCredits: user?.credits || 0
      });
    }

    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user.id });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Guard: If all contact details are already found, block auto-find and do not deduct credits
    const isComplete = (val) => Boolean(val && typeof val === "string" && val.trim() !== "" && val !== "—" && val !== "N/A" && val !== "null" && val !== "undefined");
    if (isComplete(lead.contactName) && isComplete(lead.email) && isComplete(lead.phone) && isComplete(lead.website)) {
      return res.status(400).json({
        message: "All contact details (Contact Name, Email, Phone, Website) are already present for this lead. No credits were deducted.",
        alreadyComplete: true,
        lead
      });
    }

    const { enrichLeadWithWeb } = require("../services/leadEnrichmentService");
    const enriched = await enrichLeadWithWeb(lead);

    let changed = false;
    if (enriched.website && enriched.website !== lead.website) {
      lead.website = enriched.website;
      changed = true;
    }
    if (enriched.phone && enriched.phone !== lead.phone) {
      lead.phone = enriched.phone;
      changed = true;
    }
    if (enriched.email && enriched.email !== lead.email) {
      lead.email = enriched.email;
      changed = true;
    }
    if (enriched.contactName && enriched.contactName !== lead.contactName) {
      lead.contactName = enriched.contactName;
      changed = true;
    }
    if (enriched.location && enriched.location !== lead.location && enriched.location.length > 5) {
      lead.location = enriched.location;
      changed = true;
    }

    // Clean any prior dummy values if no real email or website exists
    if (!enriched.email && lead.email && (lead.email.includes("@vishvadentalorthodontic") || lead.email.includes("dummy") || lead.email.includes("example"))) {
      lead.email = "";
      changed = true;
    }
    if (!enriched.website && lead.website && (lead.website.includes("vishvadentalorthodontic.in") || lead.website.includes("dummy") || lead.website.includes("example"))) {
      lead.website = "";
      changed = true;
    }
    if (lead.contactName && (lead.contactName.toLowerCase().includes("founder / center director") || lead.contactName.toLowerCase().includes("founder / manager"))) {
      lead.contactName = enriched.contactName || "";
      changed = true;
    }

    const hasPhone = !!lead.phone && lead.phone !== "—" && lead.phone !== "N/A";
    const hasEmail = !!lead.email && lead.email !== "—" && lead.email !== "N/A";
    const hasWebsite = !!lead.website && lead.website !== "—" && lead.website !== "N/A";
    lead.completenessStatus = (hasPhone && (hasEmail || hasWebsite)) ? "complete" : "incomplete";

    const missing = [];
    if (!hasPhone) missing.push("phone");
    if (!hasEmail) missing.push("email");
    if (!hasWebsite) missing.push("website");
    lead.missingFields = missing;

    if (changed) {
      await lead.save();
    }

    if (!changed) {
      return res.json({
        message: "No new contact details could be found online for this business. No credits were deducted.",
        hasNewData: false,
        lead,
        enriched,
        creditsUsed: 0,
        remainingCredits: user.credits
      });
    }

    // Deduct exactly 98 credits ONLY when real new contact details were discovered and saved
    const creditResult = await deductUserCredits(req.user.id, AUTO_FIND_CREDIT_COST, "Auto-Find Details (AI Web)");

    res.json({
      message: `Lead contact details discovered and saved using AI! (-${AUTO_FIND_CREDIT_COST} credits)`,
      hasNewData: true,
      lead,
      enriched,
      creditsUsed: AUTO_FIND_CREDIT_COST,
      remainingCredits: creditResult.remainingCredits
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message });
  }
};

const enrichBatchLeads = async (req, res) => {
  try {
    const user = await getAndRefillCredits(req.user.id);
    if (!user || user.credits < AUTO_FIND_CREDIT_COST) {
      return res.status(402).json({
        message: `Insufficient credits! Auto-Find Details costs ${AUTO_FIND_CREDIT_COST} credits per lead, but you have ${user?.credits || 0} remaining. Your credits will automatically refill to 1,000 tomorrow.`,
        insufficientCredits: true,
        remainingCredits: user?.credits || 0
      });
    }

    const { leadIds, limit = 10 } = req.body;
    let query = { owner: req.user.id };
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    } else {
      query.$or = [
        { email: { $in: [null, "", "—", "N/A"] } },
        { phone: { $in: [null, "", "—", "N/A"] } },
        { website: { $in: [null, "", "—", "N/A"] } }
      ];
    }

    const maxAffordable = Math.floor(user.credits / AUTO_FIND_CREDIT_COST);
    const cappedLimit = Math.min(limit, 15, maxAffordable);
    const leads = await Lead.find(query).limit(cappedLimit);
    if (leads.length === 0) {
      return res.json({
        message: "No leads found requiring contact enrichment.",
        enrichedCount: 0,
        leads: []
      });
    }

    const { enrichLeadWithWeb } = require("../services/leadEnrichmentService");
    const updated = [];

    for (const lead of leads) {
      try {
        const enriched = await enrichLeadWithWeb(lead);
        let leadChanged = false;
        if (enriched.website && enriched.website !== lead.website) {
          lead.website = enriched.website;
          leadChanged = true;
        }
        if (enriched.phone && enriched.phone !== lead.phone) {
          lead.phone = enriched.phone;
          leadChanged = true;
        }
        if (enriched.email && enriched.email !== lead.email) {
          lead.email = enriched.email;
          leadChanged = true;
        }
        if (enriched.contactName && enriched.contactName !== lead.contactName) {
          lead.contactName = enriched.contactName;
          leadChanged = true;
        }
        if (enriched.location && enriched.location !== lead.location && enriched.location.length > 5) {
          lead.location = enriched.location;
          leadChanged = true;
        }
        if (leadChanged) {
          const hasPhone = !!lead.phone && lead.phone !== "—" && lead.phone !== "N/A";
          const hasEmail = !!lead.email && lead.email !== "—" && lead.email !== "N/A";
          const hasWebsite = !!lead.website && lead.website !== "—" && lead.website !== "N/A";
          lead.completenessStatus = (hasPhone && (hasEmail || hasWebsite)) ? "complete" : "incomplete";

          const missing = [];
          if (!hasPhone) missing.push("phone");
          if (!hasEmail) missing.push("email");
          if (!hasWebsite) missing.push("website");
          lead.missingFields = missing;

          await lead.save();
          updated.push(lead);
        }
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error(`Error enriching lead ${lead.companyName}:`, err.message);
      }
    }

    if (updated.length === 0) {
      return res.json({
        message: "Oops! No more information found from Google or web searches.",
        enrichedCount: 0,
        leads: []
      });
    }

    let creditResult = null;
    if (updated.length > 0) {
      try {
        creditResult = await deductUserCredits(req.user.id, updated.length * AUTO_FIND_CREDIT_COST, "Batch Auto-Find Details");
      } catch (credErr) {
        console.warn("Credit deduction warning:", credErr.message);
      }
    }

    res.json({
      message: `Successfully enriched ${updated.length} lead${updated.length > 1 ? "s" : ""} with real web data! (-${updated.length * AUTO_FIND_CREDIT_COST} credits)`,
      enrichedCount: updated.length,
      leads: updated,
      remainingCredits: creditResult ? creditResult.remainingCredits : undefined
    });
  } catch (error) {
    console.error("Batch enrichment error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// SCRAP / JUNK LEADS CONTROLLERS & FOLDER ENGINE
// ==========================================

const getScrapFolders = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Fetch all batches for user
    const batches = await ImportBatch.find({ owner: ownerId }).sort({ createdAt: -1 });

    // 2. Aggregate active scraps currently remaining in each batch
    const remainingScrapAgg = await Lead.aggregate([
      { $match: { owner: ownerId, isScrap: true } },
      { $group: { _id: "$importBatchId", activeCount: { $sum: 1 } } }
    ]);

    const scrapMap = {};
    let totalActiveScraps = 0;
    for (const item of remainingScrapAgg) {
      if (item._id) {
        scrapMap[String(item._id)] = item.activeCount;
      }
      totalActiveScraps += item.activeCount;
    }

    // Also count any orphan scraps (without batchId) if any
    const orphanScrapsCount = await Lead.countDocuments({
      owner: ownerId,
      isScrap: true,
      importBatchId: { $exists: false }
    });
    totalActiveScraps += orphanScrapsCount;

    const folders = batches.map(b => {
      const activeScraps = scrapMap[String(b._id)] || 0;
      return {
        _id: b._id,
        fileName: b.fileName,
        totalRows: b.totalRows,
        cleanCount: b.cleanCount,
        incompleteCount: b.incompleteCount || 0,
        originalScrapCount: b.scrapCount,
        activeScraps,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      };
    });

    res.json({
      folders,
      totalActiveScraps
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getScraps = async (req, res) => {
  try {
    const { batchId, search, reason } = req.query;
    const filter = {
      owner: req.user.id,
      isScrap: true
    };

    if (batchId && batchId !== "all") {
      filter.importBatchId = batchId;
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { importFileName: { $regex: search, $options: "i" } }
      ];
    }

    if (reason) {
      filter.scrapReasons = { $regex: reason, $options: "i" };
    }

    const scraps = await Lead.find(filter).sort({ createdAt: -1 });

    res.json({
      scraps,
      count: scraps.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const recoverSingleScrap = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id,
      isScrap: true
    });

    if (!lead) {
      return res.status(404).json({ message: "Scrapped lead not found." });
    }

    lead.isScrap = false;
    lead.recoveredAt = new Date();
    await lead.save();

    res.json({
      message: `Lead "${lead.companyName || lead.contactName || "Record"}" recovered back to active leads!`,
      lead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const recoverBatchScraps = async (req, res) => {
  try {
    const { leadIds, batchId, all } = req.body;
    let query = { owner: req.user.id, isScrap: true };

    if (all) {
      // recover all scraps
    } else if (batchId) {
      query.importBatchId = batchId;
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    } else {
      return res.status(400).json({ message: "Please specify lead IDs, a batch ID, or all to recover." });
    }

    const result = await Lead.updateMany(query, {
      $set: {
        isScrap: false,
        recoveredAt: new Date()
      }
    });

    res.json({
      message: `Successfully recovered ${result.modifiedCount} lead(s) back to active leads!`,
      recoveredCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSingleScrap = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
      isScrap: true
    });

    if (!lead) {
      return res.status(404).json({ message: "Scrapped lead not found." });
    }

    res.json({
      message: "Scrap lead permanently deleted."
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBatchScraps = async (req, res) => {
  try {
    const { leadIds, batchId, all } = req.body;
    let query = { owner: req.user.id, isScrap: true };

    if (all) {
      // delete all scraps
    } else if (batchId) {
      query.importBatchId = batchId;
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    } else {
      return res.status(400).json({ message: "Please specify lead IDs, a batch ID, or all to delete." });
    }

    const result = await Lead.deleteMany(query);

    res.json({
      message: `Permanently removed ${result.deletedCount} scrap lead(s).`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// VERIFIED LEAD INTELLIGENCE CONTROLLERS
// ==========================================

const verifySingleLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const force = req.body?.force === true;
    const creditResult = await deductUserCredits(req.user.id, 1, "Verify Single Lead");
    const verifiedLead = await verifyLeadRecord(lead, { force });

    res.json({
      message: `Lead verified: ${verifiedLead.verification.status.replace("_", " ").toUpperCase()} (${verifiedLead.verification.score}%)`,
      verification: verifiedLead.verification,
      lead: verifiedLead,
      remainingCredits: creditResult.remainingCredits
    });
  } catch (error) {
    console.error("Single verification error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message });
  }
};

const bulkVerifyLeads = async (req, res) => {
  try {
    let { leadIds } = req.body;
    if (leadIds && typeof leadIds === "object" && !Array.isArray(leadIds) && Array.isArray(leadIds.leadIds)) {
      leadIds = leadIds.leadIds;
    }
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "Please provide an array of lead IDs to verify." });
    }

    // Safety: limit maximum batch size to 100 per request
    const cappedIds = leadIds.slice(0, 100);
    const leads = await Lead.find({
      _id: { $in: cappedIds },
      owner: req.user.id,
      isScrap: { $ne: true }
    });

    const CONCURRENCY_LIMIT = parseInt(process.env.VERIFICATION_CONCURRENCY || "5", 10);
    const verifiedResults = [];

    // Controlled concurrent execution chunk by chunk to avoid network flooding
    for (let i = 0; i < leads.length; i += CONCURRENCY_LIMIT) {
      const chunk = leads.slice(i, i + CONCURRENCY_LIMIT);
      const chunkPromises = chunk.map(lead =>
        verifyLeadRecord(lead, { force: true }).catch(err => {
          console.error(`Verification failed for lead ${lead._id}:`, err.message);
          return lead;
        })
      );
      const chunkResults = await Promise.all(chunkPromises);
      verifiedResults.push(...chunkResults);
    }

    const summary = {
      total: verifiedResults.length,
      highConfidence: verifiedResults.filter(l => l.verification?.status === "high_confidence").length,
      verified: verifiedResults.filter(l => l.verification?.status === "verified").length,
      partiallyVerified: verifiedResults.filter(l => l.verification?.status === "partially_verified").length,
      unverified: verifiedResults.filter(l => !l.verification || l.verification.status === "unverified").length,
      needsReview: verifiedResults.filter(l => l.verification?.warnings && l.verification.warnings.length > 0).length
    };

    let creditResult = null;
    if (verifiedResults.length > 0) {
      try {
        creditResult = await deductUserCredits(req.user.id, verifiedResults.length, "Bulk Verification");
      } catch (credErr) {
        console.warn("Credit deduction warning:", credErr.message);
      }
    }

    res.json({
      message: `Verification complete: ${summary.verified + summary.highConfidence} verified, ${summary.partiallyVerified} partial, ${summary.unverified} unverified.`,
      summary,
      leads: verifiedResults,
      remainingCredits: creditResult ? creditResult.remainingCredits : undefined
    });
  } catch (error) {
    console.error("Bulk verification error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message });
  }
};

const getLeadVerification = async (req, res) => {
  try {
    const lead = await Lead.findOne(
      { _id: req.params.id, owner: req.user.id },
      "companyName website phone email location verification"
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({
      verification: lead.verification || {
        status: "unverified",
        score: 0,
        signals: {},
        warnings: [],
        sources: []
      },
      lead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const applyLeadEvidence = async (req, res) => {
  try {
    const { field, value } = req.body;
    const allowedFields = ["phone", "email", "website", "companyName", "location"];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: `Field "${field}" cannot be updated from evidence.` });
    }

    if (!value || typeof value !== "string") {
      return res.status(400).json({ message: "Valid replacement value is required." });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead[field] = value.trim();

    // Clear conflict warning about this field if any
    if (lead.verification && Array.isArray(lead.verification.warnings)) {
      lead.verification.warnings = lead.verification.warnings.filter(
        w => !w.toLowerCase().includes(field.toLowerCase())
      );
    }

    await lead.save();

    res.json({
      message: `Updated lead ${field} to verified value "${value}".`,
      lead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  deleteBatchLeads,
  importCSV,
  enrichSingleLead,
  enrichBatchLeads,
  getScrapFolders,
  getScraps,
  recoverSingleScrap,
  recoverBatchScraps,
  deleteSingleScrap,
  deleteBatchScraps,
  verifySingleLead,
  bulkVerifyLeads,
  getLeadVerification,
  applyLeadEvidence
};
