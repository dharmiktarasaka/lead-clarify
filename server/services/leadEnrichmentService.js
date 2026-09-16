const phoneRegex = /(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}|(?:\+91[\s-]?)?[6789]\d{9}|0\d{2,4}[\s-]?\d{6,8}|\b\d{10}\b/g;

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
      if (/ahmedabad|surat|vadodara|rajkot|mumbai|delhi|pune|bangalore|gujarat|india|chicago|illinois|new york|california|texas|london/i.test(p)) {
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
  // 1. DuckDuckGo HTML Search
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://duckduckgo.com/",
        "Origin": "https://duckduckgo.com",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      body: "q=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
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

      if (snippets.length > 0 || links.length > 0) {
        return { snippets, links };
      }
    }
  } catch (err) {
    console.warn("[Enrichment] DDG HTML search warning:", err.message);
  }

  // 2. DuckDuckGo Lite Fallback (Reliable on datacenter/cloud IPs)
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html"
      },
      body: "q=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const html = await res.text();
      const snippets = [];
      const snipRegex = /<td class="result-snippet">([\s\S]*?)<\/td>/gi;
      let m;
      while ((m = snipRegex.exec(html)) !== null && snippets.length < 8) {
        const clean = m[1].replace(/<[^>]+>/g, "").trim();
        if (clean) snippets.push(clean);
      }

      const links = [];
      const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"/gi;
      while ((m = linkRegex.exec(html)) !== null && links.length < 8) {
        const cleanUrl = decodeDuckDuckGoUrl(m[1]);
        if (cleanUrl && cleanUrl.startsWith("http")) {
          links.push(cleanUrl);
        }
      }

      if (snippets.length > 0 || links.length > 0) {
        return { snippets, links };
      }
    }
  } catch (err) {
    console.warn("[Enrichment] DDG Lite search warning:", err.message);
  }

  return { snippets: [], links: [] };
}

async function scrapeSinglePage(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith("http")) return { emails: [], phones: [], textSnippet: "" };
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { emails: [], phones: [], textSnippet: "" };
    const html = await res.text();

    // 1. Plaintext emails
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const textEmails = html.match(emailRegex) || [];

    // 2. Mailto link emails
    const mailtoRegex = /href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const mailtoEmails = [];
    let mm;
    while ((mm = mailtoRegex.exec(html)) !== null) {
      mailtoEmails.push(mm[1]);
    }

    // Filter out dummy/framework/service emails
    const badDomains = [
      "example", "sentry", "wixpress", "cloudflare", "domain.com", "email.com",
      "duckduckgo", "google", "github", "schema.org", "wix.com", "wordpress", "gravatar"
    ];
    const emails = [...new Set([...textEmails, ...mailtoEmails])].filter((e) => {
      const lower = e.toLowerCase();
      return (
        !badDomains.some((d) => lower.includes(d)) &&
        !/\.(png|jpg|jpeg|webp|svg|gif|js|css|woff|woff2)$/i.test(e)
      );
    });

    const phones = [...new Set(html.match(phoneRegex) || [])];

    // Clean plain text snippet for founder/doctor extraction
    const plainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { emails, phones, textSnippet: plainText.slice(0, 600) };
  } catch {
    return { emails: [], phones: [], textSnippet: "" };
  }
}

async function scrapeWebsiteComprehensive(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith("http")) return { emails: [], phones: [], snippets: [] };
  try {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return { emails: [], phones: [], snippets: [] };
    }

    const origin = parsedUrl.origin;
    const targetPath = parsedUrl.pathname;

    const candidateUrls = [targetUrl];
    if (targetPath !== "/" && targetPath !== "") {
      candidateUrls.push(origin);
    }
    candidateUrls.push(
      `${origin}/contact`,
      `${origin}/contact-us`,
      `${origin}/about`,
      `${origin}/about-us`,
      `${origin}/our-team`,
      `${origin}/team`
    );

    const allEmails = [];
    const allPhones = [];
    const textSnippets = [];

    // Scrape primary target URL
    const primary = await scrapeSinglePage(targetUrl);
    allEmails.push(...primary.emails);
    allPhones.push(...primary.phones);
    if (primary.textSnippet) textSnippets.push(primary.textSnippet);

    // If emails not found on primary URL, scrape subpages in parallel
    if (allEmails.length === 0) {
      const remainingUrls = [...new Set(candidateUrls.slice(1))].slice(0, 4);
      const results = await Promise.allSettled(remainingUrls.map((u) => scrapeSinglePage(u)));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          if (r.value.emails?.length) allEmails.push(...r.value.emails);
          if (r.value.phones?.length) allPhones.push(...r.value.phones);
          if (r.value.textSnippet) textSnippets.push(r.value.textSnippet);
        }
      }
    }

    return {
      emails: [...new Set(allEmails)],
      phones: [...new Set(allPhones)],
      snippets: textSnippets
    };
  } catch {
    return { emails: [], phones: [], snippets: [] };
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
  const phoneInText = (lead.location || "").match(phoneRegex);
  const existingFoundPhone = phoneInText ? phoneInText[0].trim() : "";

  // 2. Perform live web search with cleaned query
  const query = buildCleanSearchQuery(lead.companyName, lead.location);
  const { snippets, links } = await searchWeb(query);

  // 3. Find candidate official website or high-authority directory profile
  const candidateWebsite =
    (lead.website && lead.website.startsWith("http") ? lead.website : "") ||
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

  // 4. Scrape official site / contact subpages if available
  let scraped = { emails: [], phones: [], snippets: [] };
  if (candidateWebsite && candidateWebsite.startsWith("http") && !candidateWebsite.includes("justdial.com")) {
    scraped = await scrapeWebsiteComprehensive(candidateWebsite);
  }

  // 5. Build strict anti-dummy prompt for AI extraction
  const prompt = `You are an elite B2B Data Verification Specialist.
Extract ONLY 100% REAL, VERIFIED contact details for this business based SOLELY on the live web search snippets, scraped website data, and discovered links provided below.

Business Name: ${lead.companyName}
Location: ${lead.location || "India"}
Reference Phone: ${existingFoundPhone || lead.phone || "None"}

LIVE WEB SEARCH SNIPPETS:
${snippets.length > 0 ? snippets.join("\n\n") : "None retrieved"}

DISCOVERED WEB LINKS:
${links.length > 0 ? links.join("\n") : "None retrieved"}

CANDIDATE SCRAPED EMAILS FROM WEBSITE:
${scraped.emails.join(", ") || "None"}

CANDIDATE SCRAPED PHONES FROM WEBSITE:
${scraped.phones.join(", ") || "None"}

CANDIDATE WEBSITE TEXT / ABOUT SNIPPETS:
${scraped.snippets.join("\n---\n") || "None"}

STRICT TRUTHFULNESS & ANTI-DUMMY DIRECTIVES:
1. "contactName": Extract the actual Doctor, Founder, Owner, Practitioner, or Director name found in website snippets or links (e.g. Justina, Dr. Vishnu Patel, Rajesh Patel). If no specific real person name is found, return "". NEVER invent a fake person name.
2. "phone": The real verified phone number found in website scraped data, search snippets, or reference phone (e.g. "${existingFoundPhone || lead.phone || ""}"). If none found, return "".
3. "website": The official website URL (e.g. "${candidateWebsite || ""}") or verified directory profile link. If none found, return "". NEVER invent dummy domain names.
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
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
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
    const geminiModels = [
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-3.5-flash"
    ];
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
  // Combine AI parsed findings with high-confidence scraped data
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
  scrapeWebsite: scrapeWebsiteComprehensive
};
