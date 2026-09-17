const User = require("../models/User");
const Lead = require("../models/Lead");
const Notification = require("../models/Notification");
const { getAndRefillCredits } = require("../services/creditService");

// -------------------------------------------------------------
// 1. System & Platform Stats
// -------------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const suspendedUsers = await User.countDocuments({ status: "suspended" });
    const adminCount = await User.countDocuments({ role: "admin" });

    // Time ranges
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const loginsToday = await User.countDocuments({ lastLogin: { $gte: startOfDay } });
    const loginsWeek = await User.countDocuments({ lastLogin: { $gte: startOfWeek } });

    // Sum of all user logins
    const loginSumAgg = await User.aggregate([
      { $group: { _id: null, totalLogins: { $sum: "$loginCount" } } }
    ]);
    const totalLoginsCount = loginSumAgg[0]?.totalLogins || 0;

    // Leads & AI Analytics
    const totalLeads = await Lead.countDocuments();
    const hotLeads = await Lead.countDocuments({ score: { $gte: 80 } });
    const warmLeads = await Lead.countDocuments({ score: { $gte: 50, $lt: 80 } });
    const coldLeads = await Lead.countDocuments({ score: { $lt: 50 } });

    const enrichedLeads = await Lead.countDocuments({
      $and: [
        { phone: { $nin: [null, "", "—", "N/A"] } },
        { email: { $nin: [null, "", "—", "N/A"] } }
      ]
    });

    const aiAnalyzedCount = await Lead.countDocuments({
      aiAnalysis: { $exists: true, $ne: null }
    });

    // Recent 6 active users
    const recentActiveUsers = await User.find({ lastLogin: { $ne: null } })
      .select("name email role status lastLogin loginCount")
      .sort({ lastLogin: -1 })
      .limit(6);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        admins: adminCount,
        loginsToday,
        loginsWeek,
        totalPlatformLogins: totalLoginsCount
      },
      leads: {
        total: totalLeads,
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
        enriched: enrichedLeads,
        aiAnalyzed: aiAnalyzedCount
      },
      recentActiveUsers
    });
  } catch (error) {
    console.error("Admin getStats error:", error);
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------------------------
// 2. User Management
// -------------------------------------------------------------
const getUsers = async (req, res) => {
  try {
    const { search = "", role = "", status = "", page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageLimit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ lastLogin: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Attach lead counts for each user
    const userIds = users.map((u) => u._id);
    const leadCounts = await Lead.aggregate([
      { $match: { owner: { $in: userIds } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } }
    ]);

    const leadMap = {};
    leadCounts.forEach((lc) => {
      leadMap[lc._id.toString()] = lc.count;
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      leadCount: leadMap[u._id.toString()] || 0
    }));

    res.json({
      users: enrichedUsers,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / pageLimit),
        limit: pageLimit
      }
    });
  } catch (error) {
    console.error("Admin getUsers error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const leads = await Lead.find({ owner: user._id })
      .select("companyName contactName email phone location score status createdAt")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const totalLeads = await Lead.countDocuments({ owner: user._id });

    res.json({
      user,
      totalLeads,
      recentLeads: leads
    });
  } catch (error) {
    console.error("Admin getUserById error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot suspend your own admin account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `User account status updated to ${status}.`,
      user
    });
  } catch (error) {
    console.error("Admin updateUserStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    if (req.params.id === req.user.id && role !== "admin") {
      return res.status(400).json({ message: "You cannot demote yourself from admin." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `User role changed to ${role}.`,
      user
    });
  } catch (error) {
    console.error("Admin updateUserRole error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, mode = "add" } = req.body;

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Please provide a valid credit amount greater than 0." });
    }

    let user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user = await getAndRefillCredits(user);

    const oldCredits = user.credits || 0;
    let newCredits = mode === "set" ? numAmount : oldCredits + numAmount;

    user.credits = newCredits;
    if (newCredits > (user.maxDailyCredits || 1000)) {
      user.maxDailyCredits = newCredits;
    }

    await user.save();

    // Issue in-app notification to the customer
    try {
      await Notification.create({
        user: user._id,
        title: "⚡ Credits Received!",
        message: mode === "set"
          ? `An administrator updated your account credit balance to ${newCredits.toLocaleString()} credits.`
          : `An administrator granted +${numAmount.toLocaleString()} credits to your account! Your new balance is ${newCredits.toLocaleString()} credits.`,
        type: "credit_grant",
        amount: numAmount,
        newBalance: newCredits,
        read: false
      });
    } catch (notifErr) {
      console.error("Failed to create credit grant notification:", notifErr);
    }

    res.json({
      message: `Successfully transferred ${numAmount.toLocaleString()} credits to ${user.name} (${user.email}). New balance: ${newCredits.toLocaleString()} credits.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        maxDailyCredits: user.maxDailyCredits
      },
      creditsAdded: numAmount,
      totalCredits: newCredits
    });
  } catch (error) {
    console.error("Admin updateUserCredits error:", error);
    res.status(500).json({ message: error.message });
  }
};

const sendCreditsByLookup = async (req, res) => {
  try {
    const { userId, email, amount, mode = "add" } = req.body;

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Please provide a valid credit amount greater than 0." });
    }

    let user = null;
    if (userId) {
      if (typeof userId === "string" && userId.trim().match(/^[0-9a-fA-F]{24}$/)) {
        user = await User.findById(userId.trim());
      }
    }
    if (!user && (email || userId)) {
      const searchTarget = (email || userId).trim().toLowerCase();
      user = await User.findOne({ email: searchTarget });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found. Please verify the User ID or Email address." });
    }

    user = await getAndRefillCredits(user);

    const oldCredits = user.credits || 0;
    let newCredits = mode === "set" ? numAmount : oldCredits + numAmount;

    user.credits = newCredits;
    if (newCredits > (user.maxDailyCredits || 1000)) {
      user.maxDailyCredits = newCredits;
    }

    await user.save();

    // Issue in-app notification to the customer
    try {
      await Notification.create({
        user: user._id,
        title: "⚡ Credits Received!",
        message: mode === "set"
          ? `An administrator updated your account credit balance to ${newCredits.toLocaleString()} credits.`
          : `An administrator granted +${numAmount.toLocaleString()} credits to your account! Your new balance is ${newCredits.toLocaleString()} credits.`,
        type: "credit_grant",
        amount: numAmount,
        newBalance: newCredits,
        read: false
      });
    } catch (notifErr) {
      console.error("Failed to create credit grant notification:", notifErr);
    }

    res.json({
      message: `Successfully transferred ${numAmount.toLocaleString()} credits to ${user.name} (${user.email}). New balance: ${newCredits.toLocaleString()} credits.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        maxDailyCredits: user.maxDailyCredits
      },
      creditsAdded: numAmount,
      totalCredits: newCredits
    });
  } catch (error) {
    console.error("Admin sendCreditsByLookup error:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Clean up all leads belonging to this user
    await Lead.deleteMany({ owner: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: `User ${user.email} and all associated leads have been permanently removed.`
    });
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------------------------
// 3. Global Leads Oversight
// -------------------------------------------------------------
const getGlobalLeads = async (req, res) => {
  try {
    const { search = "", status = "", minScore = 0, page = 1, limit = 25 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }
    if (status) query.status = status;
    if (Number(minScore) > 0) query.score = { $gte: Number(minScore) };

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageLimit;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate("owner", "name email role status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Lead.countDocuments(query)
    ]);

    res.json({
      leads,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / pageLimit),
        limit: pageLimit
      }
    });
  } catch (error) {
    console.error("Admin getGlobalLeads error:", error);
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------------------------
// 4. Live Login Activity Logs
// -------------------------------------------------------------
const getLoginLogs = async (req, res) => {
  try {
    const users = await User.find({ "loginHistory.0": { $exists: true } })
      .select("name email role status loginHistory")
      .lean();

    const flatLogs = [];
    users.forEach((u) => {
      if (Array.isArray(u.loginHistory)) {
        u.loginHistory.forEach((log) => {
          flatLogs.push({
            userId: u._id,
            userName: u.name,
            userEmail: u.email,
            userRole: u.role,
            userStatus: u.status,
            timestamp: log.timestamp,
            ip: log.ip,
            userAgent: log.userAgent
          });
        });
      }
    });

    // Sort newest first, top 50
    flatLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const logs = flatLogs.slice(0, 50);

    res.json({ logs });
  } catch (error) {
    console.error("Admin getLoginLogs error:", error);
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------------------------
// 5. Google Gemini AI Live Diagnostics & Use Cases (Admin Only)
// -------------------------------------------------------------
const getGeminiStatus = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const isConfigured = Boolean(apiKey);
    const maskedKey = isConfigured
      ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
      : "Not Configured";

    const aiAnalyzedLeads = await Lead.countDocuments({
      aiAnalysis: { $exists: true, $ne: null }
    });

    res.json({
      configured: isConfigured,
      maskedKey,
      defaultModel: "gemini-3.6-flash",
      provider: "Google Generative Language API",
      aiAnalyzedLeads,
      quotaTier: "Google AI Studio Free Tier (1,500 req/day, 15 RPM)",
      pricing: "₹0 / 100% Free"
    });
  } catch (error) {
    console.error("getGeminiStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};

const testGeminiPing = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ message: "GEMINI_API_KEY is not configured" });
    }

    const { prompt = "Respond in 1 sentence: What is the primary advantage of AI in B2B lead generation?" } = req.body;
    const model = req.body.model || "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const start = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const latencyMs = Date.now() - start;
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        statusCode: response.status,
        latencyMs,
        model,
        error: data.error?.message || "Gemini API request failed",
        statusText: data.error?.status || response.statusText,
        quotaLimit: response.status === 429
      });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No text returned";

    res.json({
      success: true,
      statusCode: 200,
      latencyMs,
      model,
      prompt,
      response: answer.trim(),
      usageMetadata: data.usageMetadata || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("testGeminiPing error:", error);
    res.status(500).json({ message: error.message });
  }
};

const testGeminiLiveLeadAudit = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ message: "GEMINI_API_KEY is not configured" });
    }

    const { companyName, industry, location, website, contactName, phone, email, notes } = req.body;
    if (!companyName) {
      return res.status(400).json({ message: "Company name is required for live audit" });
    }

    const prompt = `You are an elite B2B sales intelligence researcher and digital growth auditor.
Analyze the following business lead with deep domain knowledge and local market intelligence:

Company Name: ${companyName}
Contact Name: ${contactName || "Owner / Decision Maker"}
Industry: ${industry || "General Business"}
Location: ${location || "India"}
Website: ${website || "N/A"}
Phone: ${phone || "N/A"}
Email: ${email || "N/A"}
Additional Notes: ${notes || "None"}

Find every possible high-value detail, service offering, digital gap, customer demographic, and outreach angle.
Return a STRICT, valid JSON object matching this schema:
{
  "score": <integer 0-100 indicating lead sales priority and digital growth potential>,
  "scoreCategory": <"Hot" | "Warm" | "Cold">,
  "scoreReason": <concise 1-sentence reason for this score>,
  "summary": <detailed 2-3 sentence executive overview of this business and its market position in its city>,
  "inferredProfile": {
    "targetAudience": <string describing ideal high-paying customers in their location>,
    "coreServices": [<array of 3-5 specific services or specialties this business offers>],
    "inferredRole": <string: likely decision maker title, e.g. "Founder / Managing Director" or "Clinic Owner">,
    "estimatedTicketSize": <string: estimated average deal/ticket size, e.g. "₹2,000 - ₹15,000" or "$300 - $2,500">
  },
  "digitalAudit": {
    "googleMapsGaps": <string: specific local SEO & Google Business Profile opportunity in their location>,
    "websiteBookingGaps": <string: conversion bottlenecks, appointment booking or lead capture flaws>,
    "socialReputationGaps": <string: customer review acquisition, social proof, or video marketing gaps>
  },
  "opportunities": [
    <array of 3 to 4 actionable, high-ROI growth initiatives to pitch this business>
  ],
  "outreachAngle": <string: the single most compelling hook to get a reply from this business owner>,
  "outreachChannels": {
    "whatsapp": <string: warm, professional ready-to-send WhatsApp message addressing them by business/name, mentioning a specific local observation, offering a free 2-minute audit with a clear call-to-action>,
    "emailSubject": <string: compelling, high-converting email subject line>,
    "emailBody": <string: 3-paragraph personalized cold email pitch>,
    "coldCallPitch": <string: 30-second phone elevator pitch script>
  }
}

IMPORTANT: Return valid JSON only, without any markdown formatting, backticks, or wrapping.`;

    const model = req.body.model || "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const start = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    });

    const latencyMs = Date.now() - start;
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        statusCode: response.status,
        latencyMs,
        model,
        error: data.error?.message || "Gemini API failed to process lead audit",
        statusText: data.error?.status || response.statusText,
        quotaLimit: response.status === 429
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(500).json({ success: false, message: "Empty response from Gemini" });
    }

    let parsed = null;
    try {
      const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      parsed = { rawContent: rawText, parseNotice: "Raw output preserved" };
    }

    res.json({
      success: true,
      statusCode: 200,
      latencyMs,
      model,
      leadAudit: parsed,
      usageMetadata: data.usageMetadata || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("testGeminiLiveLeadAudit error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  updateUserCredits,
  sendCreditsByLookup,
  deleteUser,
  getGlobalLeads,
  getLoginLogs,
  getGeminiStatus,
  testGeminiPing,
  testGeminiLiveLeadAudit
};
