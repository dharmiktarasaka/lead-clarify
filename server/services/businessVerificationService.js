/**
 * Business Listing & Registry Verification Service
 * Abstracted provider for cross-referencing business entity existence.
 *
 * CRITICAL RULE:
 * If no external business provider or API key is configured, returns
 * `businessExists: null` (never assumes false if unchecked).
 */

const { normalizeCompanyName, normalizePhone, normalizeLocation } = require("../utils/leadNormalization");

/**
 * Searches for a business listing through configured provider(s).
 * @param {Object} lead
 * @returns {Promise<{ found: boolean|null, name?: string, phone?: string, website?: string, address?: string, source?: string, confidence?: number, reason?: string }>}
 */
async function lookupBusinessListing(lead) {
  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.BUSINESS_REGISTRY_API_KEY;

  // If no external provider key is configured, return null (unchecked)
  if (!placesApiKey) {
    return {
      found: null,
      source: null,
      reason: "No external business registry provider configured"
    };
  }

  try {
    // Example Google Places Text Search integration if key is provided
    const query = `${lead.companyName} ${lead.location || ""}`.trim();
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${placesApiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return {
        found: null,
        source: "business_listing",
        reason: `Provider HTTP error: ${res.status}`
      };
    }

    const data = await res.json();
    if (data.status === "OK" && data.results && data.results.length > 0) {
      const topResult = data.results[0];
      return {
        found: true,
        name: topResult.name,
        address: topResult.formatted_address || "",
        placeId: topResult.place_id,
        rating: topResult.rating,
        userRatingsTotal: topResult.user_ratings_total,
        source: "google_places",
        confidence: 90
      };
    } else if (data.status === "ZERO_RESULTS") {
      return {
        found: false,
        source: "google_places",
        confidence: 80,
        reason: "Zero matching business listings found"
      };
    } else {
      return {
        found: null,
        source: "google_places",
        reason: `Provider status: ${data.status}`
      };
    }
  } catch (err) {
    return {
      found: null,
      source: "business_listing",
      reason: `Lookup error: ${err.message}`
    };
  }
}

module.exports = {
  lookupBusinessListing
};
