function decodeDuckDuckGoUrl(href) {
  try {
    const match = href.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return href.startsWith("//") ? "https:" + href : href;
  } catch {
    return href;
  }
}

function buildCleanSearchQuery(companyName, location) {
  const cleanName = (companyName || "").replace(/[^\w\s&]/gi, " ").trim();
  let locTerm = "";
  if (location) {
    const locParts = location.split(/[,·\-\n]/).map((s) => s.trim()).filter(Boolean);
    for (const p of locParts) {
      if (/ahmedabad|surat|vadodara|rajkot|mumbai|delhi|pune|bangalore|gujarat|india/i.test(p)) {
        locTerm = p;
        break;
      }
    }
    if (!locTerm && locParts.length > 0) {
      locTerm = locParts[0].slice(0, 25);
    }
  }
  return `${cleanName} ${locTerm} contact phone website`.trim();
}

async function searchWeb(query) {
  try {
    // DuckDuckGo HTML search via POST with full browser headers for 100% reliable real results
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
        "Referer": "https://duckduckgo.com/",
        "Origin": "https://duckduckgo.com",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      body: "q=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
      return { snippets: [], links: [] };
    }

    const html = await res.text();

    const snippets = [];
    const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = snippetRegex.exec(html)) !== null && snippets.length < 8) {
      const clean = m[1].replace(/<[^>]+>/g, "").trim();
      if (clean) snippets.push(clean);
    }

    const links = [];
    const linkRegex = /<a class="result__url[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRegex.exec(html)) !== null && links.length < 8) {
      const cleanUrl = decodeDuckDuckGoUrl(lm[1]);
      if (cleanUrl && cleanUrl.startsWith("http")) {
        links.push(cleanUrl);
      }
    }

    return { snippets, links };
  } catch (err) {
    console.error("Web search error:", err.message);
    return { snippets: [], links: [] };
  }
}

async function scrapeWebsite(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith("http")) return { emails: [], phones: [] };
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(6000)
    });
    const html = await res.text();

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const rawEmails = html.match(emailRegex) || [];
    const emails = [...new Set(rawEmails)].filter(
      (e) =>
        !/\.(png|jpg|jpeg|webp|svg|gif|js|css|woff|woff2)$/i.test(e) &&
        !e.includes("example") &&
        !e.includes("sentry") &&
        !e.includes("wixpress")
    );

    const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{9}|079[\s-]?\d{7,8}|\b0\d{10}\b/g;
    const phones = [...new Set(html.match(phoneRegex) || [])];

    return { emails, phones };
  } catch (err) {
    return { emails: [], phones: [] };
  }
}

async function enrichLeadWithWeb(lead) {
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
    throw new Error("Neither GROQ_API_KEY nor GEMINI_API_KEY is configured.");
  }

  // 1. Extract any existing phone numbers directly from raw location or lead text
  const phoneInText = (lead.location || "").match(/(?:\+91[\s-]?)?[6789]\d{9}|0\d{10}|079[\s-]?\d{7,8}/);
  const existingFoundPhone = phoneInText ? phoneInText[0].trim() : "";

  // 2. Perform live web search with cleaned query
  const query = buildCleanSearchQuery(lead.companyName, lead.location);
  const { snippets, links } = await searchWeb(query);

  // 3. Find candidate official website or high-authority directory profile
  const candidateWebsite =
    links.find(
      (l) =>
        !l.includes("justdial.com") &&
        !l.includes("facebook.com") &&
        !l.includes("instagram.com") &&
        !l.includes("indiamart.com") &&
        !l.includes("yellowpages") &&
        !l.includes("linkedin.com") &&
        !l.includes("tripadvisor") &&
        !l.includes("practo.com")
    ) ||
    links.find((l) => l.includes("practo.com") || l.includes("justdial.com")) ||
    links[0] ||
    "";

  // 4. Scrape official site if available
  let scraped = { emails: [], phones: [] };
  if (candidateWebsite && candidateWebsite.startsWith("http") && !candidateWebsite.includes("justdial.com")) {
    scraped = await scrapeWebsite(candidateWebsite);
  }

  // 5. Build strict anti-dummy prompt for AI extraction
  const prompt = `You are an elite B2B Data Verification Specialist.
Extract ONLY 100% REAL, VERIFIED contact details for this business based SOLELY on the live web search snippets, scraped data, and discovered links provided below.

Business Name: ${lead.companyName}
Location: ${lead.location || "India"}
Reference Phone: ${existingFoundPhone || lead.phone || "None"}

LIVE WEB SEARCH SNIPPETS:
${snippets.length > 0 ? snippets.join("\n\n") : "None retrieved"}

DISCOVERED WEB LINKS:
${links.length > 0 ? links.join("\n") : "None retrieved"}

CANDIDATE SCRAPED EMAILS FROM OFFICIAL WEBSITE:
${scraped.emails.join(", ") || "None"}

CANDIDATE SCRAPED PHONES FROM OFFICIAL WEBSITE:
${scraped.phones.join(", ") || "None"}

STRICT TRUTHFULNESS & ANTI-DUMMY DIRECTIVES:
1. "contactName": Extract the actual Doctor, Founder, Owner, or Director name found in snippets or links (e.g. Dr. Vishnu Patel, Rajesh Patel). If no specific real person name is found, return "". NEVER invent a fake person name.
2. "phone": The real verified phone number found in snippets, scraped data, or reference phone (e.g. "${existingFoundPhone || lead.phone || ""}"). If none found, return "".
3. "website": The official website URL (e.g. "http://www.vishvadental.com/") or verified directory profile link (Practo, Justdial, clinic profile) from DISCOVERED WEB LINKS. If none found, return "". NEVER invent dummy domain names.
4. "email": Real published email address from scraped data or snippets (e.g. "${scraped.emails[0] || ""}"). If no real email is found online, return "". NEVER invent fake emails like "contact@company.in".
5. "location": Clean physical address or locality in ${lead.location || "India"} from snippets.

Return STRICT JSON ONLY. Do not wrap in markdown or backticks.
Schema:
{
  "website": "...",
  "phone": "...",
  "email": "...",
  "contactName": "...",
  "location": "..."
}`;

  let rawText = null;

  // Try Groq first with multi-model fallback
  if (groqApiKey) {
    const groqModels = [
      process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "groq/compound"
    ];

    for (const model of groqModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You extract strictly 100% real, verified data. Never invent or hallucinate dummy websites, dummy emails, or dummy names. Return valid JSON only."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data.choices?.[0]?.message?.content;
          if (rawText) {
            console.log(`[Enrichment] Successfully extracted verified data via Groq (${model})`);
            break;
          }
        }
      } catch (err) {
        console.warn(`[Enrichment] Groq model ${model} error:`, err.message);
      }
    }
  }

  // Fallback to Gemini if needed
  if (!rawText && geminiApiKey) {
    const geminiModels = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
    for (const model of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.0
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) break;
        }
      } catch (err) {
        console.warn(`[Enrichment] Gemini error:`, err.message);
      }
    }
  }

  // Parse results
  let parsed = {};
  if (rawText) {
    try {
      parsed = JSON.parse(rawText.replace(/```json/gi, "").replace(/```/g, "").trim());
    } catch (e) {
      console.warn("[Enrichment] JSON parse error:", e.message);
    }
  }

  // STRICT REAL-DATA EXTRACTION:
  // Use real parsed data if valid, otherwise scraped or reference data.
  // NEVER use fabricated / dummy fallbacks.
  const realWebsite =
    parsed.website && parsed.website.startsWith("http") && !parsed.website.includes("example")
      ? parsed.website
      : candidateWebsite || "";

  const realPhone =
    parsed.phone && parsed.phone.length > 5
      ? parsed.phone
      : (scraped.phones[0] || existingFoundPhone || "");

  const realEmail =
    parsed.email && parsed.email.includes("@") && !parsed.email.includes("example") && !parsed.email.includes("sentry")
      ? parsed.email
      : (scraped.emails[0] || "");

  const realContact =
    parsed.contactName &&
    parsed.contactName.length > 2 &&
    !parsed.contactName.toLowerCase().includes("founder / center director") &&
    !parsed.contactName.toLowerCase().includes("founder / manager")
      ? parsed.contactName
      : "";

  const realLocation =
    parsed.location && parsed.location.length > 3
      ? parsed.location
      : (lead.location || "");

  return {
    website: realWebsite,
    phone: realPhone,
    email: realEmail,
    contactName: realContact,
    location: realLocation
  };
}

module.exports = {
  enrichLeadWithWeb,
  searchWeb,
  scrapeWebsite
};
