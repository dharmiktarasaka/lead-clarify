/**
 * Website Verification Service
 * Safely inspects lead websites for reachability, HTTPS, canonical domain,
 * and extracts public contact evidence with strict SSRF protection.
 */

const { normalizeDomain } = require("../utils/leadNormalization");

// Private & local network patterns for SSRF prevention
const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254"
]);

/**
 * Validates a target URL against SSRF vulnerabilities.
 * @param {string} rawUrl
 * @returns {{ safe: boolean, error?: string, parsedUrl?: URL }}
 */
function validateUrlForSSRF(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, error: "Empty or invalid URL" };
  }

  const trimmed = rawUrl.trim().toLowerCase();

  // Reject explicitly forbidden schemes
  if (/^(file|ftp|gopher|javascript|data|blob|ws|wss|chrome|ldap):/i.test(trimmed)) {
    return { safe: false, error: "Disallowed protocol scheme" };
  }

  let parsed;
  try {
    const formatted = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    parsed = new URL(formatted);
  } catch (err) {
    return { safe: false, error: "Malformed URL syntax" };
  }

  // Only permit HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: `Disallowed protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Direct check for local/internal hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { safe: false, error: `Restricted hostname: ${hostname}` };
  }

  // Check IPv4 private and link-local ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, a, b, c, d] = ipv4Match.map(Number);
    if (
      a === 10 ||                              // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||     // 172.16.0.0/12
      (a === 192 && b === 168) ||              // 192.168.0.0/16
      (a === 169 && b === 254) ||              // 169.254.0.0/16 Link-local
      a === 127 ||                              // Loopback
      a === 0                                   // 0.0.0.0
    ) {
      return { safe: false, error: `Forbidden private IP address: ${hostname}` };
    }
  }

  return { safe: true, parsedUrl: parsed };
}

/**
 * Safely fetches a website and extracts public verification signals.
 * @param {string} websiteUrl
 * @param {number} timeoutMs
 * @returns {Promise<Object>} Verification details
 */
async function verifyWebsite(websiteUrl, timeoutMs = 7000) {
  const result = {
    reachable: false,
    https: false,
    statusCode: null,
    canonicalDomain: "",
    finalUrl: "",
    title: "",
    scrapedPhones: [],
    scrapedEmails: [],
    socialLinks: [],
    warning: null
  };

  if (!websiteUrl) {
    return result;
  }

  const ssrfCheck = validateUrlForSSRF(websiteUrl);
  if (!ssrfCheck.safe) {
    result.warning = `Security validation rejected URL: ${ssrfCheck.error}`;
    return result;
  }

  const targetUrl = ssrfCheck.parsedUrl.href;
  result.canonicalDomain = normalizeDomain(ssrfCheck.parsedUrl.hostname);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal,
      redirect: "follow"
    });

    clearTimeout(timer);

    result.statusCode = response.status;
    result.finalUrl = response.url;
    result.https = response.url.startsWith("https://");
    result.reachable = response.status >= 200 && response.status < 400;

    // Check redirected domain
    try {
      const finalParsed = new URL(response.url);
      result.canonicalDomain = normalizeDomain(finalParsed.hostname);
    } catch {}

    if (result.reachable) {
      // Read body with 500KB cap
      const reader = response.body.getReader();
      const chunks = [];
      let totalBytes = 0;
      const MAX_BYTES = 500 * 1024; // 500 KB limit

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalBytes += value.length;
        if (totalBytes >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }

      const decoder = new TextDecoder("utf-8");
      const html = chunks.map(c => decoder.decode(c, { stream: true })).join("");

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        result.title = titleMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 150);
      }

      // Extract visible emails
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      const rawEmails = html.match(emailRegex) || [];
      result.scrapedEmails = [...new Set(rawEmails.map(e => e.toLowerCase()))].filter(
        (e) => !/\.(png|jpg|jpeg|webp|svg|gif|js|css|woff|woff2|ico)$/i.test(e) &&
               !e.includes("sentry") &&
               !e.includes("polyfill")
      ).slice(0, 5);

      // Extract visible phone numbers (India + international common formats)
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6789]\d{9}\b|\b0\d{2,4}[-.\s]?\d{6,8}\b/g;
      const rawPhones = html.match(phoneRegex) || [];
      result.scrapedPhones = [...new Set(rawPhones.map(p => p.trim()))].filter(
        p => p.replace(/\D/g, "").length >= 7 && p.replace(/\D/g, "").length <= 15
      ).slice(0, 5);

      // Extract social profile links
      const socialRegex = /href=["'](https?:\/\/(?:www\.)?(?:linkedin\.com\/company|facebook\.com|instagram\.com|twitter\.com|x\.com)\/[^"'\s>]+)["']/gi;
      const socialMatches = [];
      let sm;
      while ((sm = socialRegex.exec(html)) !== null && socialMatches.length < 4) {
        socialMatches.push(sm[1]);
      }
      result.socialLinks = [...new Set(socialMatches)];
    }
  } catch (err) {
    result.reachable = false;
    if (err.name === "AbortError") {
      result.warning = `Connection timed out after ${timeoutMs / 1000}s`;
    } else {
      result.warning = `Website unreachable: ${err.message}`;
    }
  }

  return result;
}

module.exports = {
  validateUrlForSSRF,
  verifyWebsite
};
