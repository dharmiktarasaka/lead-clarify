/**
 * Lead Validation & Quality Heuristic Engine
 * Identifies fake, dummy, placeholder, spam, or invalid leads during import.
 */

// Known disposable, temporary, and test email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
  "guerrillamail.com", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "sharklasers.com", "fake.com", "fakemail.com", "example.com", "example.org",
  "example.net", "test.com", "testing.com", "demo.com", "sample.com",
  "null.com", "none.com", "asdf.com", "qwerty.com", "xyz.com", "invalid.com",
  "nomail.com", "na.com", "placeholder.com", "trash.com", "junk.com",
  "spam.com", "spambox.me", "maildrop.cc", "dispostable.com"
]);

// Obvious dummy email prefixes / local parts
const DUMMY_EMAIL_PREFIXES = [
  /^test(\d+)?$/i,
  /^testing(\d+)?$/i,
  /^demo(\d+)?$/i,
  /^dummy(\d+)?$/i,
  /^fake(\d+)?$/i,
  /^sample(\d+)?$/i,
  /^admin$/i,
  /^administrator$/i,
  /^user(\d+)?$/i,
  /^noemail(\d+)?$/i,
  /^na$/i,
  /^none$/i,
  /^null$/i,
  /^asdf+/i,
  /^qwerty+/i,
  /^xyz+/i,
  /^abc+/i,
  /^123+/i,
  /^someone$/i,
  /^nobody$/i,
];

// Dummy contact name patterns
const DUMMY_NAME_PATTERNS = [
  /^(test|tester|testing|test user|test lead)$/i,
  /^(demo|demo user|sample|sample user)$/i,
  /^(dummy|fake|fake user|dummy lead)$/i,
  /^(john doe|jane doe|john smith|jane smith)$/i,
  /^(foo|bar|foobar|baz)$/i,
  /^(asdf|asdfgh|qwerty|zxcv)$/i,
  /^(none|null|n\/a|na|nil|unknown|undefined)$/i,
  /^(someone|somebody|nobody|no name)$/i,
  /^(tbd|to be determined|not available)$/i,
  /^[0-9]+$/, // purely numeric names
  /^([a-z])\1{3,}$/i // repeating single characters e.g. "aaaa"
];

// Dummy company name patterns
const DUMMY_COMPANY_PATTERNS = [
  /^(test|test company|test corp|test inc|test llc|testing)$/i,
  /^(demo|demo company|demo inc|sample|sample company|sample corp)$/i,
  /^(dummy|dummy inc|dummy corp|dummy company)$/i,
  /^(fake|fake company|fake corp)$/i,
  /^(my company|company|your company|any company)$/i,
  /^(asdf|asdf llc|qwerty|xyz|xyz inc|abc|abc corp)$/i,
  /^(none|null|n\/a|na|nil|unknown|undefined|tbd)$/i,
  /^[0-9]+$/,
  /^([a-z])\1{3,}$/i
];

// Sequential or repetitive dummy phone patterns
const DUMMY_PHONE_PATTERNS = [
  /^0+$/,
  /^1+$/,
  /^9+$/,
  /^(0123456789|1234567890|0987654321)$/,
  /^(12345678|123456789|123456|12345)$/,
  /^(1111111111|2222222222|3333333333|4444444444|5555555555|6666666666|7777777777|8888888888|9999999999|0000000000)$/,
  /^(1122334455|1212121212|1231231234|9988776655)$/
];

/**
 * Validates a lead object, cleanly distinguishing between:
 * 1. Data Validity (fake, dummy, placeholder, or unusable data -> isScrap: true)
 * 2. Data Completeness (missing phone, website, email, or location -> incomplete active lead)
 *
 * @param {Object} lead - The lead record being imported
 * @returns {Object} { isScrap, reasons, scrapReasons, classification, completenessStatus, missingFields }
 */
function validateLead(lead) {
  const scrapReasons = [];
  const missingFields = [];

  const contactName = (lead.contactName || "").trim();
  const companyName = (lead.companyName || "").trim();
  const rawEmail = (lead.email || "").trim().toLowerCase();
  const rawPhone = (lead.phone || "").trim();
  const website = (lead.website || "").trim();
  const location = (lead.location || "").trim();

  // ==========================================
  // SECTION A: DATA VALIDITY (FAKE / DUMMY CHECKS)
  // Only strong fake/dummy markers push to scrapReasons
  // ==========================================

  // 1. Email Heuristic Checks
  let hasValidEmail = false;
  if (rawEmail) {
    const emailParts = rawEmail.split("@");
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
      scrapReasons.push(`Malformed email format ("${lead.email}")`);
    } else {
      const [localPart, domain] = emailParts;

      // Disposable / fake domain
      if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        scrapReasons.push(`Disposable / test email domain (@${domain})`);
      }

      // Dummy local part
      for (const pattern of DUMMY_EMAIL_PREFIXES) {
        if (pattern.test(localPart)) {
          scrapReasons.push(`Placeholder email prefix ("${localPart}@...")`);
          break;
        }
      }

      // Keyboard mash in local part (e.g., asdfghjk, qwertyyy)
      if (/^[asdfghjkl]{6,}$/i.test(localPart) || /^([a-z])\1{4,}$/i.test(localPart)) {
        scrapReasons.push(`Suspicious gibberish email ("${rawEmail}")`);
      }

      if (scrapReasons.length === 0) {
        hasValidEmail = true;
      }
    }
  }

  // 2. Phone Heuristic Checks
  let hasValidPhone = false;
  if (rawPhone) {
    const digitsOnly = rawPhone.replace(/\D/g, "");
    
    // Obvious placeholder strings in phone
    if (/^(n\/?a|none|null|nil|test|fake|tbd|xxx|call|unknown)$/i.test(rawPhone)) {
      scrapReasons.push(`Placeholder value in phone ("${rawPhone}")`);
    } else if (digitsOnly.length > 0) {
      // Check length (typically 7-16 digits for phone numbers)
      if (digitsOnly.length < 7) {
        scrapReasons.push(`Incomplete phone number (${digitsOnly.length} digits)`);
      } else if (digitsOnly.length > 16) {
        scrapReasons.push(`Excessively long phone number (${digitsOnly.length} digits)`);
      }

      // Check dummy sequence patterns
      for (const pattern of DUMMY_PHONE_PATTERNS) {
        if (pattern.test(digitsOnly)) {
          scrapReasons.push(`Sequential / repeating dummy phone ("${rawPhone}")`);
          break;
        }
      }

      // Check all repeating digits e.g. 5555555555
      if (digitsOnly.length >= 7 && /^(\d)\1+$/.test(digitsOnly)) {
        if (!scrapReasons.some(r => r.includes("repeating dummy phone"))) {
          scrapReasons.push(`Repeating dummy phone digits ("${rawPhone}")`);
        }
      }

      if (!scrapReasons.some(r => r.includes("phone"))) {
        hasValidPhone = true;
      }
    }
  }

  // 3. Contact Name Heuristic Checks
  if (contactName) {
    for (const pattern of DUMMY_NAME_PATTERNS) {
      if (pattern.test(contactName)) {
        scrapReasons.push(`Dummy contact name ("${contactName}")`);
        break;
      }
    }

    // Keyboard mash strings for names
    if (/^[bcdfghjklmnpqrstvwxyz]{6,}$/i.test(contactName) || /^[asdfghjkl]{5,}$/i.test(contactName)) {
      scrapReasons.push(`Gibberish contact name ("${contactName}")`);
    }
  }

  // 4. Company Name Heuristic Checks
  if (companyName) {
    for (const pattern of DUMMY_COMPANY_PATTERNS) {
      if (pattern.test(companyName)) {
        scrapReasons.push(`Dummy company name placeholder ("${companyName}")`);
        break;
      }
    }

    if (/^[bcdfghjklmnpqrstvwxyz]{6,}$/i.test(companyName) || /^[asdfghjkl]{6,}$/i.test(companyName)) {
      scrapReasons.push(`Gibberish company name ("${companyName}")`);
    }
  }

  // 5. Website validity
  const hasWebsite = Boolean(
    website &&
    website.length > 3 &&
    !/^(none|null|n\/a|nil|test|fake)$/i.test(website)
  );

  // 6. Completely Empty Fallback Lead Check
  // Only classify as scrap if the company name was auto-generated and there are zero contact or identifying fields
  if (/^Lead #\d+$/i.test(companyName) && !contactName && !rawEmail && !rawPhone && !website && !location) {
    scrapReasons.push("Empty lead record with no identifying details");
  }

  // ==========================================
  // SECTION B: DATA COMPLETENESS
  // Missing fields do NOT cause isScrap = true!
  // ==========================================
  if (!hasValidPhone) {
    missingFields.push("Phone");
  }
  if (!hasValidEmail) {
    missingFields.push("Email");
  }
  if (!hasWebsite) {
    missingFields.push("Website");
  }
  if (!location) {
    missingFields.push("Location");
  }

  // ==========================================
  // SECTION C: CLASSIFICATION
  // ==========================================
  const isScrap = scrapReasons.length > 0;

  let classification = "valid";
  let completenessStatus = "complete";

  if (isScrap) {
    classification = "fake";
    completenessStatus = missingFields.length > 0 ? "incomplete" : "complete";
  } else if (missingFields.length > 0) {
    classification = "incomplete";
    completenessStatus = "incomplete";
  } else {
    classification = "valid";
    completenessStatus = "complete";
  }

  return {
    isScrap,
    reasons: scrapReasons, // Backwards compatibility for existing consumers
    scrapReasons,
    classification, // "valid" | "incomplete" | "fake"
    completenessStatus, // "complete" | "incomplete"
    missingFields
  };
}

module.exports = {
  validateLead,
  DISPOSABLE_EMAIL_DOMAINS
};
