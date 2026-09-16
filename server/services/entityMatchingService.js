/**
 * Cross-Source Entity Matching & Verification Scoring Service
 * Compares imported lead attributes with website and business listing evidence,
 * computes transparent weighted verification score (0-100), detects conflicts,
 * and compiles evidence without altering user data.
 */

const {
  normalizeCompanyName,
  normalizeDomain,
  normalizePhone,
  normalizeLocation,
  tokenSimilarity
} = require("../utils/leadNormalization");
const { DISPOSABLE_EMAIL_DOMAINS } = require("./leadValidationService");

/**
 * Evaluates all gathered verification signals and calculates score & evidence.
 * @param {Object} lead - Original Lead document
 * @param {Object} websiteData - Results from websiteVerificationService
 * @param {Object} businessData - Results from businessVerificationService
 * @param {boolean} duplicateDetected - Whether duplicate exists in user's CRM
 * @returns {Object} Structured verification payload
 */
function evaluateVerification({ lead, websiteData = {}, businessData = {}, duplicateDetected = false }) {
  let score = 0;
  const sources = new Set(["lead_data"]);
  const warnings = [];
  const evidence = {};

  const signals = {
    businessExists: businessData.found !== undefined ? businessData.found : null,
    websiteReachable: Boolean(websiteData.reachable),
    websiteHttps: Boolean(websiteData.https),
    domainMatch: false,
    phoneValid: false,
    phoneMatched: false,
    emailValid: false,
    businessEmail: false,
    emailDomainMatch: false,
    locationMatch: false,
    duplicateDetected: Boolean(duplicateDetected)
  };

  // 1. Website Reachability & Security
  if (websiteData.reachable) {
    score += 15;
    sources.add("official_website");
    evidence.website = {
      url: websiteData.finalUrl || lead.website,
      status: websiteData.statusCode,
      title: websiteData.title || null
    };

    if (websiteData.https) {
      score += 5;
    }
  } else if (lead.website) {
    if (websiteData.warning) {
      warnings.push(websiteData.warning);
    }
  }

  // 2. Domain Matching
  const leadDomain = normalizeDomain(lead.website);
  if (leadDomain) {
    if (websiteData.canonicalDomain && (leadDomain === websiteData.canonicalDomain || websiteData.canonicalDomain.endsWith(leadDomain))) {
      signals.domainMatch = true;
      score += 15;
      evidence.domain = {
        leadDomain,
        matchedDomain: websiteData.canonicalDomain,
        source: "official_website"
      };
    }
  }

  // 3. Company Name Matching
  const normLeadCompany = normalizeCompanyName(lead.companyName);
  let companyMatched = false;

  if (websiteData.title) {
    const normTitle = normalizeCompanyName(websiteData.title);
    const titleSim = tokenSimilarity(normLeadCompany, normTitle);

    if (normTitle.includes(normLeadCompany) || normLeadCompany.includes(normTitle) || titleSim >= 0.4) {
      companyMatched = true;
      score += 15;
      evidence.companyName = {
        leadName: lead.companyName,
        websiteTitle: websiteData.title,
        source: "official_website"
      };
    } else if (normTitle.length > 5 && titleSim < 0.2) {
      warnings.push(`Brand mismatch warning: Company name "${lead.companyName}" has low similarity to website title "${websiteData.title}"`);
    }
  }

  if (businessData.found && businessData.name) {
    sources.add(businessData.source || "business_listing");
    const normBizName = normalizeCompanyName(businessData.name);
    const bizSim = tokenSimilarity(normLeadCompany, normBizName);

    if (normBizName.includes(normLeadCompany) || normLeadCompany.includes(normBizName) || bizSim >= 0.4) {
      if (!companyMatched) {
        score += 15;
        companyMatched = true;
      } else {
        score += 5; // Bonus for multi-source confirmation
      }
      evidence.businessRegistry = {
        name: businessData.name,
        address: businessData.address,
        source: businessData.source
      };
    }
  }

  // 4. Phone Number Verification & Matching
  const normLeadPhone = normalizePhone(lead.phone);
  if (normLeadPhone && normLeadPhone.length >= 7 && normLeadPhone.length <= 15) {
    // Check dummy sequences
    const isDummyPhone = /^0+$|^1+$|^9+$|^(1234567890|0123456789)$/.test(normLeadPhone) || /^(\d)\1{6,}$/.test(normLeadPhone);
    if (isDummyPhone) {
      score -= 30;
      warnings.push(`Dummy phone sequence detected ("${lead.phone}")`);
    } else {
      signals.phoneValid = true;
      score += 10;
    }
  }

  // Match phone against website scraped phones
  if (websiteData.scrapedPhones && websiteData.scrapedPhones.length > 0) {
    const normScrapedPhones = websiteData.scrapedPhones.map(normalizePhone).filter(Boolean);
    if (normLeadPhone && normScrapedPhones.includes(normLeadPhone)) {
      signals.phoneMatched = true;
      score += 15;
      evidence.phoneMatch = {
        leadPhone: lead.phone,
        matchedPhone: websiteData.scrapedPhones[normScrapedPhones.indexOf(normLeadPhone)],
        source: "official_website"
      };
    } else if (normLeadPhone && normScrapedPhones.length > 0) {
      // Conflict detected!
      warnings.push(`Phone conflict: Imported phone "${lead.phone}" differs from official website phone(s) "${websiteData.scrapedPhones.join(", ")}"`);
      evidence.suggestedPhone = {
        original: lead.phone,
        suggested: websiteData.scrapedPhones[0],
        source: "official_website",
        allDetected: websiteData.scrapedPhones
      };
    } else if (!normLeadPhone && websiteData.scrapedPhones.length > 0) {
      evidence.suggestedPhone = {
        original: null,
        suggested: websiteData.scrapedPhones[0],
        source: "official_website",
        allDetected: websiteData.scrapedPhones
      };
    }
  }

  // 5. Email Verification & Domain Alignment
  const leadEmail = (lead.email || "").trim().toLowerCase();
  if (leadEmail && leadEmail.includes("@")) {
    const [localPart, emailDomain] = leadEmail.split("@");

    if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
      score -= 35;
      warnings.push(`Disposable / test email domain detected (@${emailDomain})`);
    } else {
      signals.emailValid = true;
      score += 5;

      const isConsumerDomain = /^(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton|zoho)\./i.test(emailDomain);
      if (!isConsumerDomain) {
        signals.businessEmail = true;
      }

      // Domain match with website
      if (leadDomain && (emailDomain === leadDomain || emailDomain.endsWith(leadDomain) || leadDomain.endsWith(emailDomain))) {
        signals.emailDomainMatch = true;
        score += 10;
        evidence.emailDomainMatch = {
          email: lead.email,
          domain: leadDomain,
          source: "official_website"
        };
      }
    }
  }

  // Check scraped website emails for alternatives or confirmation
  if (websiteData.scrapedEmails && websiteData.scrapedEmails.length > 0) {
    if (leadEmail && websiteData.scrapedEmails.includes(leadEmail)) {
      score += 5;
      evidence.emailConfirmed = {
        email: lead.email,
        source: "official_website"
      };
    } else if (leadEmail && !signals.emailDomainMatch && websiteData.scrapedEmails.length > 0) {
      warnings.push(`Email difference: Imported email "${lead.email}" not listed on official website; found "${websiteData.scrapedEmails.join(", ")}"`);
      evidence.suggestedEmail = {
        original: lead.email,
        suggested: websiteData.scrapedEmails[0],
        source: "official_website",
        allDetected: websiteData.scrapedEmails
      };
    } else if (!leadEmail && websiteData.scrapedEmails.length > 0) {
      evidence.suggestedEmail = {
        original: null,
        suggested: websiteData.scrapedEmails[0],
        source: "official_website",
        allDetected: websiteData.scrapedEmails
      };
    }
  }

  // 6. Location Matching
  const leadLocTokens = normalizeLocation(lead.location);
  if (leadLocTokens.length > 0) {
    let locFound = false;

    // Check in website title, meta, or scraped text
    if (websiteData.title) {
      const normTitle = websiteData.title.toLowerCase();
      if (leadLocTokens.some(tok => normTitle.includes(tok))) {
        locFound = true;
      }
    }

    if (businessData.found && businessData.address) {
      const normBizAddr = businessData.address.toLowerCase();
      if (leadLocTokens.some(tok => normBizAddr.includes(tok))) {
        locFound = true;
      }
    }

    if (locFound) {
      signals.locationMatch = true;
      score += 10;
      evidence.location = {
        leadLocation: lead.location,
        matched: true
      };
    }
  }

  // 7. Duplicate Warning
  if (duplicateDetected) {
    warnings.push("Possible duplicate business detected in your existing CRM leads");
  }

  // Clamp score to 0–100
  let finalScore = Math.max(0, Math.min(100, score));

  // SAFETY CONSTRAINT: A lead CANNOT become HIGH CONFIDENCE (90-100) based on only 1 source!
  // If only "lead_data" exists, maximum confidence is capped at 39 (unverified)
  if (sources.size <= 1) {
    finalScore = Math.min(finalScore, 39);
    warnings.push("Single source: No corroborating external website or business listing available");
  } else if (sources.size === 2 && !signals.phoneMatched && !signals.domainMatch) {
    // Two sources but weak connection: cap at 69
    finalScore = Math.min(finalScore, 69);
  } else if (finalScore >= 90 && sources.size < 2) {
    finalScore = 89;
  }

  // Calculate status enum
  let status = "unverified";
  if (finalScore >= 90) {
    status = "high_confidence";
  } else if (finalScore >= 70) {
    status = "verified";
  } else if (finalScore >= 40) {
    status = "partially_verified";
  } else {
    status = "unverified";
  }

  // If critical conflicts exist, flag needs_review if partially or fully verified
  if (warnings.some(w => w.startsWith("Phone conflict") || w.startsWith("Brand mismatch"))) {
    // Keep score transparent, but highlight for review
    if (status === "verified" || status === "high_confidence") {
      // Still high evidence, but has a warning
    }
  }

  return {
    status,
    score: finalScore,
    signals,
    sources: Array.from(sources),
    warnings,
    evidence,
    lastVerifiedAt: new Date()
  };
}

module.exports = {
  evaluateVerification
};
