/**
 * Lead Intelligence & Sales Strategy Service
 * Supports Groq (Meta LLaMA 3.3 - 14,400 free req/day) with Google Gemini backup
 */

const GROQ_PRIMARY_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_FALLBACK_MODELS = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "groq/compound"
];

const GEMINI_PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

/**
 * Executes an AI completion request using Groq
 */
async function callGroqApi(prompt, apiKey) {
  const models = [
    GROQ_PRIMARY_MODEL,
    ...GROQ_FALLBACK_MODELS.filter((m) => m !== GROQ_PRIMARY_MODEL)
  ];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are an elite B2B sales intelligence researcher and digital growth auditor. Respond in strict, valid JSON only without markdown formatting."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.error?.message || `Groq API error: ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error(`Empty response from Groq model ${model}`);
      }

      return { rawText, modelUsed: `Groq (${model})` };
    } catch (err) {
      lastError = err;
      console.warn(`[Groq AI] Model ${model} failed (${err.message}). Trying fallback model...`);
      continue;
    }
  }

  throw lastError || new Error("Failed to generate response from Groq API.");
}

/**
 * Executes a Gemini API request with automatic fallback across compatible models.
 */
async function callGeminiApi(prompt, apiKey) {
  const modelsToTry = [
    GEMINI_PRIMARY_MODEL,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_PRIMARY_MODEL)
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.error?.message || `Gemini API error: ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        err.code = errData.error?.code || response.status;
        throw err;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Empty response returned by Gemini model ${model}`);
      }

      return { rawText, modelUsed: `Gemini (${model})` };
    } catch (err) {
      lastError = err;
      if (err.status === 429 || err.status === 503 || err.status === 404) {
        console.warn(`[Gemini AI] Model ${model} returned ${err.status}. Attempting fallback...`);
        continue;
      }
      throw err;
    }
  }

  if (lastError?.status === 429) {
    throw new Error("Gemini API rate limit reached. Please wait a moment before re-analyzing.");
  }
  throw lastError || new Error("Failed to generate response from Gemini API.");
}

/**
 * Analyzes a lead record with Gemini AI to generate actionable B2B intelligence.
 * @param {Object} lead - Lead document from database
 * @returns {Promise<Object>} Structured sales intelligence analysis
 */
const analyzeLeadWithAI = async (lead) => {
  const groqApiKey =
    process.env.GROQ_API_KEY &&
    process.env.GROQ_API_KEY !== "your_groq_api_key_here"
      ? process.env.GROQ_API_KEY.trim()
      : null;
  const geminiApiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
      ? process.env.GEMINI_API_KEY.trim()
      : null;

  if (!groqApiKey && !geminiApiKey) {
    throw new Error(
      "No active AI API key configured. Please add GROQ_API_KEY (Meta LLaMA 3.3) or GEMINI_API_KEY to server/.env"
    );
  }

  // Compile verified and unverified data facts
  const verifiedFacts = [];
  const unverifiedFacts = [];

  if (lead.verification) {
    if (lead.verification.signals?.websiteReachable) {
      verifiedFacts.push(`Official website is verified reachable and active (${lead.website})`);
    } else if (lead.website) {
      unverifiedFacts.push(`Website is unverified or unreachable (${lead.website})`);
    }

    if (lead.verification.signals?.domainMatch) {
      verifiedFacts.push(`Domain confirmed to match business identity`);
    }
    if (lead.verification.signals?.phoneMatched) {
      verifiedFacts.push(`Phone number corroborated on official public listing (${lead.phone})`);
    } else if (lead.phone) {
      unverifiedFacts.push(`Phone number is uncorroborated by independent web sources (${lead.phone})`);
    }

    if (lead.verification.signals?.emailDomainMatch) {
      verifiedFacts.push(`Corporate email domain matches official website (${lead.email})`);
    }
    if (lead.verification.signals?.locationMatch) {
      verifiedFacts.push(`Physical business location corroborated (${lead.location})`);
    }

    if (Array.isArray(lead.verification.warnings) && lead.verification.warnings.length > 0) {
      lead.verification.warnings.forEach((w) => {
        const text = typeof w === "string" ? w : w?.message || String(w);
        unverifiedFacts.push(text);
      });
    }
  }

  const prompt = `You are an elite B2B sales intelligence researcher and digital growth auditor.
Analyze the following business lead using ONLY the information provided.

--- PROVIDED LEAD DATA ---
Company Name: ${lead.companyName || "Unknown / Not provided"}
Contact Name: ${lead.contactName || "Unknown / Not provided"}
Email: ${lead.email || "Unknown / Not provided"}
Phone: ${lead.phone || "Unknown / Not provided"}
Website: ${lead.website || "Unknown / Not provided"}
Industry: ${lead.industry || "General Business"}
Location: ${lead.location || "Unknown / Not provided"}
Additional Fields: ${lead.customFields ? JSON.stringify(lead.customFields) : "None"}

--- FACTUAL CORROBORATION ---
${verifiedFacts.length > 0 ? verifiedFacts.map((f) => `✓ ${f}`).join("\n") : "No verified external corroboration recorded yet."}
${unverifiedFacts.length > 0 ? unverifiedFacts.map((f) => `⚠️ ${f}`).join("\n") : ""}

--- CRITICAL RULES ---
1. STRICT HONESTY: Do NOT invent facts, fake contact numbers, emails, addresses, employee counts, revenue, or certifications.
2. MISSING DATA: If website, phone, or email is empty or "Unknown / Not provided", state that it is unknown. Do not hallucinate fake domains or phone numbers.
3. SALES SCORE VS VERIFICATION: Calculate a sales potential score (0-100) reflecting how lucrative this business prospect is for digital B2B services (SEO, web development, WhatsApp automation, local lead generation). This is separate from verification score.
4. ACTIONABLE INSIGHTS: Provide realistic, professional, non-spammy outreach drafts suitable for Indian & international B2B decision-makers.

Return a STRICT, valid JSON object matching this schema:
{
  "score": <integer 0-100 sales potential score>,
  "scoreCategory": <"Hot" | "Warm" | "Cold">,
  "scoreReason": <concise 1-sentence reason for this score>,
  "summary": <detailed 2-3 sentence executive overview of this business and its market position in its city/sector>,
  "inferredProfile": {
    "targetAudience": <string describing ideal high-paying customers in their location>,
    "coreServices": [<array of 3-5 specific services or specialties this business likely offers>],
    "inferredRole": <string: likely decision maker title, e.g. "Founder / Managing Director" or "Operations Head">,
    "estimatedTicketSize": <string: estimated average deal size, e.g. "₹5,000 - ₹50,000" or "$500 - $5,000">
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
    "whatsapp": <string: warm, professional ready-to-send WhatsApp message addressing them by name/company with clear call-to-action; if phone is missing, write a draft ready for when phone is acquired>,
    "emailSubject": <string: compelling, high-converting email subject line>,
    "emailBody": <string: 3-paragraph personalized cold email pitch>,
    "coldCallPitch": <string: 30-second phone elevator pitch script>
  },
  "suggestedStatus": <"qualified" if score >= 60, otherwise "new">
}

IMPORTANT: Return valid JSON only.`;

  let executionResult = null;

  // 1. Try Groq (Meta LLaMA 3.3) first if key is configured
  if (groqApiKey) {
    try {
      executionResult = await callGroqApi(prompt, groqApiKey);
    } catch (groqErr) {
      console.warn("[AI Service] Groq request failed, falling back to Gemini:", groqErr.message);
    }
  }

  // 2. Fallback to Gemini if Groq was not used or failed
  if (!executionResult && geminiApiKey) {
    executionResult = await callGeminiApi(prompt, geminiApiKey);
  }

  if (!executionResult) {
    throw new Error("Failed to execute AI analysis. Please check your GROQ_API_KEY or GEMINI_API_KEY.");
  }

  const { rawText, modelUsed } = executionResult;

  // Parse JSON cleanly
  try {
    const cleanedText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedText);

    // Normalize output fields
    if (!parsed.outreachChannels) {
      parsed.outreachChannels = {
        whatsapp: parsed.outreachMessage || "",
        emailSubject: `Idea for ${lead.companyName}`,
        emailBody: parsed.outreachMessage || "",
        coldCallPitch: parsed.outreachAngle || ""
      };
    }

    parsed.model = modelUsed;
    parsed.analyzedAt = new Date().toISOString();
    return parsed;
  } catch (parseErr) {
    console.error("[AI Service] JSON parse error, generating clean fallback structure:", parseErr);
    return {
      score: 70,
      scoreCategory: "Warm",
      scoreReason: "Potential local market opportunity with digital presence gaps",
      summary: rawText.substring(0, 250),
      model: modelUsed,
      analyzedAt: new Date().toISOString(),
      inferredProfile: {
        targetAudience: `Target customers and clients in ${lead.location || "the target region"}`,
        coreServices: [lead.industry || "General Services"],
        inferredRole: "Founder / Managing Director",
        estimatedTicketSize: "Standard Industry Pricing"
      },
      digitalAudit: {
        googleMapsGaps: `Optimize Google Business Profile to rank higher for local searches in ${lead.location || "your area"}.`,
        websiteBookingGaps: "Add instant WhatsApp chat and mobile-friendly enquiry booking.",
        socialReputationGaps: "Build 5-star Google reviews and client testimonials."
      },
      opportunities: [
        "Improve Google Maps discovery and local search visibility",
        "Implement automated WhatsApp appointment booking",
        "Launch targeted local promotional campaign"
      ],
      outreachAngle: "Improve local client acquisition and booking automation.",
      outreachChannels: {
        whatsapp: `Hi ${lead.contactName || lead.companyName} 👋\n\nI noticed your business in ${lead.location || "your area"} and saw a great opportunity to increase your client enquiries through local search.\n\nWould you be open to a quick 2-minute overview?`,
        emailSubject: `Quick idea regarding ${lead.companyName}`,
        emailBody: `Hi ${lead.contactName || "Team"},\n\nI noticed ${lead.companyName} in ${lead.location || "your area"} and wanted to share a few quick observations on how you can capture more clients online.\n\nBest regards,\nGrowth Team`,
        coldCallPitch: `Hi, I noticed ${lead.companyName} in ${lead.location || "your area"} and we help local businesses increase monthly appointments through automated Google and WhatsApp channels.`
      },
      suggestedStatus: "new"
    };
  }
};

module.exports = {
  analyzeLeadWithAI,
  analyzeLeadWithGemini: analyzeLeadWithAI // Backwards compatibility
};
