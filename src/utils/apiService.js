// API Service for keywordtool.io v2
// CRITICAL RULE: ONE API CALL per file. Never batch or loop.

const BASE_URL = 'https://api.keywordtool.io/v2/search/volume';
const QUOTA_URL = 'https://api.keywordtool.io/v2/quota';

export const SUPPORTED_ENGINES = [
  { id: 'google',     label: 'Google',      endpoint: 'google',     type: 'exact',     svgIcon: '/google-symbol.svg',        popular: true },
  { id: 'bing',       label: 'Bing',         endpoint: 'bing',       type: 'exact',     svgIcon: '/bing-symbol.svg',          popular: true },
  { id: 'youtube',    label: 'YouTube',      endpoint: 'youtube',    type: 'estimated', svgIcon: '/youtube-symbol.svg' },
  { id: 'amazon',     label: 'Amazon',       endpoint: 'amazon',     type: 'estimated', svgIcon: '/amazon-symbol.svg' },
  { id: 'play-store', label: 'Play Store',   endpoint: 'play-store', type: 'estimated', svgIcon: '/google-play-symbol.svg' },
  { id: 'etsy',       label: 'Etsy',         endpoint: 'etsy',       type: 'estimated', svgIcon: '/etsy-symbol.svg' },
  { id: 'perplexity', label: 'Perplexity',   endpoint: 'perplexity', type: 'estimated', svgIcon: null },  // no SVG provided
];

export const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India 🇮🇳',             locationId: 2356,  currency: 'INR' },
  { code: 'US', label: 'United States 🇺🇸',     locationId: 2840,  currency: 'USD' },
  { code: 'GB', label: 'United Kingdom 🇬🇧',    locationId: 2826,  currency: 'GBP' },
  { code: 'AU', label: 'Australia 🇦🇺',         locationId: 2036,  currency: 'AUD' },
  { code: 'CA', label: 'Canada 🇨🇦',            locationId: 2124,  currency: 'CAD' },
  { code: 'DE', label: 'Germany 🇩🇪',           locationId: 2276,  currency: 'EUR' },
  { code: 'SG', label: 'Singapore 🇸🇬',         locationId: 2702,  currency: 'SGD' },
  { code: 'AE', label: 'UAE 🇦🇪',               locationId: 2784,  currency: 'AED' },
];

/**
 * Fetch search volume data — SINGLE API CALL for all keywords (max 1000)
 */
export async function fetchKeywordVolume({ keywords, engine, country = 'IN', locationId = 2356, currency = 'INR' }) {
  const apiKey = import.meta.env.VITE_KEYWORD_TOOL_API_KEY;
  const url = `${BASE_URL}/${engine}`;

  const body = {
    apikey: apiKey,
    keyword: keywords,
    metrics_currency: currency,
    output: 'json',
  };

  // Google uses specific location IDs and language codes. Other engines might throw 404 validation errors if we pass these.
  if (engine === 'google') {
    body.metrics_location = [locationId];
    body.metrics_language = ['en'];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errMsg = `API Error: ${response.status}`;
    try {
      const err = await response.json();
      if (response.status === 401) errMsg = 'Invalid API key. Please check your .env file and restart the dev server.';
      else if (response.status === 429) errMsg = 'Rate limit reached. You have 0 API requests remaining today.';
      else if (response.status >= 500) errMsg = 'keywordtool.io API error. Please try again later.';
      else errMsg = err.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();

  // Log raw response for debugging (dev only)
  if (import.meta.env.DEV) {
    console.log('[SoS] API raw response:', data);
  }

  return data;
}

/**
 * Fetch keyword suggestions
 */
export async function fetchKeywordSuggestions({ keyword, engine = 'google', country = 'US', language = 'en', type = 'suggestions', currency = 'USD' }) {
  const apiKey = import.meta.env.VITE_KEYWORD_TOOL_API_KEY;
  const url = `https://api.keywordtool.io/v2/search/suggestions/${engine}`;

  const body = {
    apikey: apiKey,
    keyword: keyword,
    type: type,
    metrics_currency: currency,
    output: 'json',
  };

  if (engine === 'google') {
    body.metrics_location = country ? [COUNTRY_OPTIONS.find(c => c.code === country)?.locationId || 2840] : [];
    body.metrics_language = [language];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Suggestions API Error: ${response.status}`);
  }

  const data = await response.json();
  if (import.meta.env.DEV) console.log('[SoS] Suggestions raw response:', data);
  return data;
}

/**
 * Fetch competitor keywords (Analyze Competitors)
 */
export async function fetchCompetitorKeywords({ url, country = 'US', language = 'en', currency = 'USD' }) {
  const apiKey = import.meta.env.VITE_KEYWORD_TOOL_API_KEY;
  const endpoint = `https://api.keywordtool.io/v2/search/analyze-competitors/google`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      keyword: url,
      metrics_location: country ? [COUNTRY_OPTIONS.find(c => c.code === country)?.locationId || 2840] : [],
      metrics_language: [language],
      metrics_currency: currency,
      output: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Analyze Competitors API Error: ${response.status}`);
  }

  const data = await response.json();
  if (import.meta.env.DEV) console.log('[SoS] Competitor raw response:', data);
  return data;
}

/**
 * Check remaining API quota.
 * Normalizes every possible field name variant the keywordtool.io API might return.
 * Logs the raw response in dev mode so you can inspect it in browser DevTools.
 */
export async function checkQuota() {
  const apiKey = import.meta.env.VITE_KEYWORD_TOOL_API_KEY;
  if (!apiKey || apiKey === 'your_keywordtool_io_api_key_here') return null;

  try {
    const response = await fetch(`${QUOTA_URL}?apikey=${apiKey}`);
    if (!response.ok) return null;
    const raw = await response.json();

    // Always log raw quota response so you can verify the field names
    console.log('[SoS] Quota raw response:', JSON.stringify(raw, null, 2));

    // The API might return: top-level fields, or nested under 'data', 'quota', 'usage', etc.
    // Try the response directly, then common nested wrappers
    const candidates = [raw, raw.data, raw.quota, raw.usage, raw.result].filter(Boolean);

    let remaining = null;
    let made = null;
    let total = null;

    for (const obj of candidates) {
      if (typeof obj !== 'object') continue;

      // Try every known field name for "remaining"
      remaining = remaining ??
        obj.requests_remaining ??
        obj.apiCallsRemaining ??
        obj.calls_remaining ??
        obj.remaining ??
        obj.quota_remaining ??
        obj.left ??
        null;

      // Try every known field name for "used/made"
      made = made ??
        obj.requests_made ??
        obj.apiCallsMade ??
        obj.calls_made ??
        obj.used ??
        obj.quota_used ??
        null;

      // Try total quota
      total = total ??
        obj.quota ??
        obj.limit ??
        obj.daily_limit ??
        obj.requests_limit ??
        obj.total ??
        null;
    }

    // If we found total but not remaining, derive it
    if (remaining === null && total !== null && made !== null) {
      remaining = total - made;
    }
    // If we found total but not made, derive it
    if (made === null && total !== null && remaining !== null) {
      made = total - remaining;
    }

    console.log('[SoS] Quota parsed — remaining:', remaining, '| made:', made, '| total:', total);

    return {
      apiCallsRemaining: remaining,
      apiCallsMade: made,
      apiCallsTotal: total,
    };
  } catch (err) {
    console.warn('[SoS] Quota fetch failed:', err);
    return null;
  }
}


/**
 * Always returns false — production mode is always active.
 */
export function isSandboxMode() {
  return false;
}
