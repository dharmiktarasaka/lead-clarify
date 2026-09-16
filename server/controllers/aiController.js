const Lead = require("../models/Lead");
const { analyzeLeadWithGemini } = require("../services/aiService");
const { deductUserCredits, getAndRefillCredits } = require("../services/creditService");

// Credit cost per lead for AI analysis
const AI_LEAD_CREDIT_COST = 98;

const analyzeSingleLead = async (req, res) => {
  try {
    // Check credit balance first
    const user = await getAndRefillCredits(req.user.id);
    if (!user || user.credits < AI_LEAD_CREDIT_COST) {
      return res.status(402).json({
        message: `Insufficient credits! AI Analysis costs ${AI_LEAD_CREDIT_COST} credits per lead, but you have ${user?.credits || 0} remaining. Your credits will automatically refill to 1,000 tomorrow.`,
        insufficientCredits: true,
        remainingCredits: user?.credits || 0
      });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found or unauthorized access." });
    }

    const aiResult = await analyzeLeadWithGemini(lead);

    lead.score = typeof aiResult.score === "number" ? aiResult.score : 70;
    lead.aiAnalysis = JSON.stringify(aiResult);
    lead.aiMessage =
      aiResult.outreachChannels?.whatsapp ||
      aiResult.outreachChannels?.emailBody ||
      aiResult.outreachMessage ||
      "";

    if (aiResult.suggestedStatus && (lead.status === "new" || !lead.status)) {
      lead.status = aiResult.suggestedStatus;
    }

    await lead.save();

    // Deduct exactly 98 credits after successful AI analysis
    const creditResult = await deductUserCredits(req.user.id, AI_LEAD_CREDIT_COST, "AI Single Lead Analysis");

    res.json({
      message: `Lead "${lead.companyName}" analyzed successfully with AI (-${AI_LEAD_CREDIT_COST} credits).`,
      lead,
      aiResult,
      creditsUsed: AI_LEAD_CREDIT_COST,
      remainingCredits: creditResult.remainingCredits
    });
  } catch (error) {
    console.error("AI Single Analysis Error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message || "Failed to analyze lead with Gemini AI." });
  }
};

const analyzeBatchLeads = async (req, res) => {
  try {
    const user = await getAndRefillCredits(req.user.id);
    if (!user || user.credits < AI_LEAD_CREDIT_COST) {
      return res.status(402).json({
        message: `Insufficient credits! AI Analysis costs ${AI_LEAD_CREDIT_COST} credits per lead, but you have ${user?.credits || 0} remaining. Your credits will automatically refill to 1,000 tomorrow.`,
        insufficientCredits: true,
        remainingCredits: user?.credits || 0
      });
    }

    const { leadIds, limit = 10 } = req.body;

    let query = { owner: req.user.id };
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    } else {
      // Analyze leads that don't have aiAnalysis yet or have 0 score
      query.$or = [
        { aiAnalysis: null },
        { aiAnalysis: "" },
        { aiAnalysis: { $exists: false } },
        { score: 0 }
      ];
    }

    // Limit batch to the leads user can afford with their remaining credits
    const maxAffordable = Math.floor(user.credits / AI_LEAD_CREDIT_COST);
    const cappedLimit = Math.min(limit, 25, maxAffordable);
    const leads = await Lead.find(query).limit(cappedLimit);

    if (leads.length === 0) {
      return res.json({
        message: "No unanalyzed leads found.",
        analyzedCount: 0,
        leads: []
      });
    }

    const updatedLeads = [];
    const errors = [];

    for (const lead of leads) {
      try {
        const aiResult = await analyzeLeadWithGemini(lead);
        lead.score = typeof aiResult.score === "number" ? aiResult.score : 70;
        lead.aiAnalysis = JSON.stringify(aiResult);
        lead.aiMessage =
          aiResult.outreachChannels?.whatsapp ||
          aiResult.outreachChannels?.emailBody ||
          aiResult.outreachMessage ||
          "";

        if (aiResult.suggestedStatus && (lead.status === "new" || !lead.status)) {
          lead.status = aiResult.suggestedStatus;
        }

        await lead.save();
        updatedLeads.push(lead);

        // Respect Google Gemini rate limits between sequential calls
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.error(`[AI Batch] Error analyzing lead "${lead.companyName}":`, err.message);
        errors.push({
          leadId: lead._id,
          companyName: lead.companyName,
          error: err.message
        });
      }
    }

    // If all leads failed, return an explicit error so UI can display it
    if (updatedLeads.length === 0 && errors.length > 0) {
      return res.status(500).json({
        message: errors[0].error || "Failed to analyze leads with Gemini AI.",
        analyzedCount: 0,
        failedCount: errors.length,
        errors
      });
    }

    // Deduct 98 credits per successfully analyzed lead
    let creditResult = null;
    if (updatedLeads.length > 0) {
      try {
        const totalCreditsToDeduct = updatedLeads.length * AI_LEAD_CREDIT_COST;
        creditResult = await deductUserCredits(req.user.id, totalCreditsToDeduct, "Batch AI Analysis");
      } catch (credErr) {
        console.warn("Credit deduction warning:", credErr.message);
      }
    }

    res.json({
      message:
        errors.length > 0
          ? `Analyzed ${updatedLeads.length} leads successfully (${errors.length} failed).`
          : `Successfully analyzed ${updatedLeads.length} lead${updatedLeads.length > 1 ? "s" : ""} with Gemini AI.`,
      analyzedCount: updatedLeads.length,
      failedCount: errors.length,
      leads: updatedLeads,
      remainingCredits: creditResult ? creditResult.remainingCredits : undefined,
      errors
    });
  } catch (error) {
    console.error("Batch AI Error:", error);
    if (error.insufficientCredits || error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        insufficientCredits: true,
        remainingCredits: error.remainingCredits
      });
    }
    res.status(500).json({ message: error.message || "Batch AI analysis failed." });
  }
};

module.exports = {
  analyzeSingleLead,
  analyzeBatchLeads
};
