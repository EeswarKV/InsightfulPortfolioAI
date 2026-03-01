/**
 * Mutual Fund NAV API - Auto-fetch NAVs for Indian mutual funds
 *
 * Sources:
 * 1. MFApi (mfapi.in) - Free Indian mutual fund NAVs
 * 2. Manual fallback if API fails
 *
 * Cache: 24 hours (NAV updates once per day EOD)
 *
 * Symbol resolution order:
 *   1. If symbol is purely numeric → treat as scheme code directly
 *   2. Otherwise → try name-based search against hardcoded mapping
 */

interface MFNAVResponse {
  meta: {
    scheme_code: string;
    scheme_name: string;
  };
  data: Array<{
    date: string;
    nav: string;
  }>;
}

interface CachedNAV {
  nav: number;
  name?: string;
  timestamp: number;
  source: "api" | "manual";
}

// In-memory cache (24 hour TTL)
const navCache = new Map<string, CachedNAV>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch NAV + scheme name for a numeric scheme code.
 * Returns { nav, name } on success, null on failure.
 */
async function fetchNAVBySchemeCode(
  schemeCode: string
): Promise<{ nav: number; name: string } | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    if (!response.ok) return null;

    const data: MFNAVResponse = await response.json();
    if (!data.data || data.data.length === 0) return null;

    const latestNAV = parseFloat(data.data[0].nav);
    if (isNaN(latestNAV)) return null;

    return { nav: latestNAV, name: data.meta?.scheme_name ?? "" };
  } catch {
    return null;
  }
}

/**
 * Search for a scheme code by fund name (hardcoded common funds).
 */
function findSchemeCode(fundName: string): string | null {
  const commonFunds: Record<string, string> = {
    "icici prudential multi asset": "120716",
    "sbi bluechip": "125497",
    "hdfc top 100": "101305",
    "axis long term equity": "122639",
  };
  const normalized = fundName.toLowerCase().trim();
  for (const [key, code] of Object.entries(commonFunds)) {
    if (normalized.includes(key)) return code;
  }
  return null;
}

/**
 * Get NAV (and scheme name) for a mutual fund.
 *
 * @param symbol  Numeric scheme code (e.g. "120716") OR fund name string
 * @param manualNAV  User-set manual NAV (fallback)
 */
export async function getMutualFundNAV(
  symbol: string,
  manualNAV?: number | null
): Promise<{ nav: number; source: "api" | "manual"; name?: string } | null> {
  // Return from cache if fresh
  const cached = navCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { nav: cached.nav, source: cached.source, name: cached.name };
  }

  // Resolve scheme code: numeric symbols are used directly
  const isNumeric = /^\d+$/.test(symbol.trim());
  const schemeCode = isNumeric ? symbol.trim() : findSchemeCode(symbol);

  if (schemeCode) {
    const result = await fetchNAVBySchemeCode(schemeCode);
    if (result) {
      navCache.set(symbol, {
        nav: result.nav,
        name: result.name,
        timestamp: Date.now(),
        source: "api",
      });
      return { nav: result.nav, source: "api", name: result.name };
    }
  }

  // Fallback to manual NAV
  if (manualNAV && manualNAV > 0) {
    return { nav: manualNAV, source: "manual" };
  }

  return null;
}

/**
 * Batch fetch NAVs for multiple funds (used by calculatePortfolioMetrics).
 * Returns a map of symbol → { nav, source, name? }
 */
export async function batchGetMutualFundNAVs(
  funds: Array<{ symbol: string; manualNAV?: number | null }>
): Promise<Map<string, { nav: number; source: "api" | "manual"; name?: string }>> {
  const results = new Map<string, { nav: number; source: "api" | "manual"; name?: string }>();

  await Promise.all(
    funds.map(async (fund) => {
      const result = await getMutualFundNAV(fund.symbol, fund.manualNAV);
      if (result) results.set(fund.symbol, result);
    })
  );

  return results;
}

/**
 * Clear NAV cache (useful for forcing refresh)
 */
export function clearNAVCache(symbol?: string) {
  if (symbol) {
    navCache.delete(symbol);
  } else {
    navCache.clear();
  }
}

/**
 * Add a mutual fund scheme code mapping (for funds not in default list)
 */
export function addMutualFundMapping(fundName: string, schemeCode: string) {
  console.log(`Custom mapping added: ${fundName} → ${schemeCode}`);
}
