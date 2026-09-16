/**
 * Master Lead Verification Service
 * Orchestrates multi-signal verification, duplicate detection, caching,
 * and history tracking.
 */

const Lead = require("../models/Lead");
const { normalizeCompanyName, normalizeDomain, normalizePhone, tokenSimilarity } = require("../utils/leadNormalization");
const { verifyWebsite } = require("./websiteVerificationService");
const { lookupBusinessListing } = require("./businessVerificationService");
const { evaluateVerification } = require("./entityMatchingService");

const CACHE_TTL_HOURS = parseInt(process.env.VERIFICATION_CACHE_TTL_HOURS || "72", 10);

/**
 * Checks for potential duplicate businesses in the user's CRM.
 * @param {Object} lead - Lead being verified
 * @returns {Promise<boolean>} Whether a duplicate lead was found
 */
async function checkDuplicateLead(lead) {
  try {
    const ownerId = lead.owner;
    const leadId = lead._id;

    const normDomain = normalizeDomain(lead.website);
    const normPhone = normalizePhone(lead.phone);
    const normCompany = normalizeCompanyName(lead.companyName);

    // 1. Direct domain match
    if (normDomain && normDomain.length > 3) {
      const match = await Lead.findOne({
        _id: { $ne: leadId },
        owner: ownerId,
        website: { $regex: normDomain, $options: "i" },
        isScrap: { $ne: true }
      });
      if (match) return true;
    }

    // 2. Direct phone match
    if (normPhone && normPhone.length >= 7) {
      const match = await Lead.findOne({
        _id: { $ne: leadId },
        owner: ownerId,
        phone: { $regex: normPhone.slice(-7) },
        isScrap: { $ne: true }
      });
      if (match) return true;
    }

    // 3. Company name match
    if (normCompany && normCompany.length > 3) {
      const match = await Lead.findOne({
        _id: { $ne: leadId },
        owner: ownerId,
        companyName: { $regex: `^${normCompany}`, $options: "i" },
        isScrap: { $ne: true }
      });
      if (match) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Verifies a single lead record with caching and history tracking.
 * @param {string|Object} leadOrId - Lead document or ObjectId
 * @param {Object} options - { force?: boolean }
 * @returns {Promise<Object>} Updated Lead document with verification data
 */
async function verifyLeadRecord(leadOrId, options = {}) {
  let lead = leadOrId;
  if (typeof leadOrId === "string" || leadOrId instanceof String) {
    lead = await Lead.findById(leadOrId);
  }

  if (!lead) {
    throw new Error("Lead record not found");
  }

  // Check caching TTL (skip external network hits if verified recently and !force)
  if (!options.force && lead.verification && lead.verification.lastVerifiedAt) {
    const ageHours = (Date.now() - new Date(lead.verification.lastVerifiedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < CACHE_TTL_HOURS && lead.verification.status !== "unverified") {
      return lead;
    }
  }

  // 1. Check duplicate existence in user's leads
  const duplicateDetected = await checkDuplicateLead(lead);

  // 2. Inspect Website if available
  let websiteData = {};
  if (lead.website && lead.website.trim().length > 3) {
    websiteData = await verifyWebsite(lead.website);
  }

  // 3. Check Business Listing / Registry Provider
  const businessData = await lookupBusinessListing(lead);

  // 4. Entity Matching & Cross-Signal Scoring
  const verificationResult = evaluateVerification({
    lead,
    websiteData,
    businessData,
    duplicateDetected
  });

  // 5. Append to Verification History
  const historyEntry = {
    verifiedAt: new Date(),
    score: verificationResult.score,
    status: verificationResult.status,
    signals: verificationResult.signals
  };

  const existingHistory = Array.isArray(lead.verification?.verificationHistory)
    ? lead.verification.verificationHistory.slice(-9) // retain last 10 entries
    : [];

  verificationResult.verificationHistory = [...existingHistory, historyEntry];

  // 6. Persist to MongoDB
  lead.verification = verificationResult;
  await lead.save();

  return lead;
}

module.exports = {
  verifyLeadRecord,
  checkDuplicateLead
};
