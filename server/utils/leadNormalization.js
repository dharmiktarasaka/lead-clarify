/**
 * Lead Data Normalization Utilities
 * Normalizes company names, domains, phone numbers, and locations
 * for robust cross-source comparison without altering user-stored values.
 */

// Common legal suffixes across global and Indian business entities
const LEGAL_SUFFIX_REGEX = /\b(pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|llc|inc\.?|incorporated|corp\.?|corporation|co\.?|company|enterprises?|industries|solutions?|services?|group|holdings?|agency)\b/gi;

/**
 * Normalizes a company name for fuzzy/equivalence comparison.
 * e.g. "ABC Industries Pvt. Ltd." -> "abc"
 *      "ABC Industries" -> "abc"
 * @param {string} name
 * @returns {string}
 */
function normalizeCompanyName(name) {
  if (!name || typeof name !== "string") return "";

  let cleaned = name
    .toLowerCase()
    .replace(LEGAL_SUFFIX_REGEX, "") // strip legal suffixes
    .replace(/[^\w\s]/g, " ")       // remove punctuation
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim();

  return cleaned;
}

/**
 * Normalizes a website URL or string to its canonical root domain.
 * e.g. "https://www.abcindustries.com/about?ref=1" -> "abcindustries.com"
 *      "http://abcindustries.com:8080/" -> "abcindustries.com"
 *      "www.abcindustries.com" -> "abcindustries.com"
 * @param {string} urlOrDomain
 * @returns {string}
 */
function normalizeDomain(urlOrDomain) {
  if (!urlOrDomain || typeof urlOrDomain !== "string") return "";

  let cleaned = urlOrDomain.trim().toLowerCase();

  // Strip leading protocol if present
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/i, "");

  // Strip path, query params, hash, and port
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0].split(":")[0];

  return cleaned.trim();
}

/**
 * Normalizes a phone number for comparison.
 * Extracts digits and handles country codes (like +91 or +1).
 * @param {string} phone
 * @returns {string} 10-digit national number or canonical international digits
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";

  // Remove all non-digits except a leading +
  const hasPlus = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  // Common India format (+91 or leading 0): extract 10 digits
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }

  // International / US (+1): if 11 digits starting with 1, return last 10
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

/**
 * Normalizes location strings into distinct search tokens.
 * @param {string} location
 * @returns {string[]} array of clean tokens (city, state, country)
 */
function normalizeLocation(location) {
  if (!location || typeof location !== "string") return [];

  return location
    .toLowerCase()
    .replace(/[^\w\s,]/g, "")
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 2);
}

/**
 * Calculates Jaccard / token similarity between two strings (0 to 1).
 * @param {string} strA
 * @param {string} strB
 * @returns {number}
 */
function tokenSimilarity(strA, strB) {
  if (!strA || !strB) return 0;
  if (strA === strB) return 1;

  const tokensA = new Set(strA.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(strB.toLowerCase().split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

module.exports = {
  normalizeCompanyName,
  normalizeDomain,
  normalizePhone,
  normalizeLocation,
  tokenSimilarity
};
