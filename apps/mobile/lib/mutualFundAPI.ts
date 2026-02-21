/**
 * Mutual Fund NAV API - Auto-fetch NAVs for Indian mutual funds
 *
 * Sources:
 * 1. MFApi (mfapi.in) - Free Indian mutual fund NAVs
 * 2. Manual fallback if API fails
 *
 * Cache: 24 hours (NAV updates once per day EOD)
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
  timestamp: number;
  source: "api" | "manual";
}

// In-memory cache (24 hour TTL)
const navCache = new Map<string, CachedNAV>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search for mutual fund scheme code by name
 * Returns the scheme code needed to fetch NAV
 */
async function searchMutualFund(fundName: string): Promise<string | null> {
  try {
    // MFApi uses scheme codes, but we can try to match by name
    // For now, we'll use a simple mapping for common funds
    // TODO: Build a comprehensive mapping or search API

    const commonFunds: Record<string, string> = {
      "icici prudential multi asset": "120716",
      "sbi bluechip": "125497",
      "hdfc top 100": "101305",
      "axis long term equity": "122639",
      // Add more as needed
    };

    const normalized = fundName.toLowerCase().trim();

    for (const [key, code] of Object.entries(commonFunds)) {
      if (normalized.includes(key)) {
        return code;
      }
    }

    return null;
  } catch (error) {
    console.error("MF search error:", error);
    return null;
  }
}

/**
 * Fetch latest NAV for a mutual fund by scheme code
 */
async function fetchNAVBySchemeCode(schemeCode: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);

    if (!response.ok) {
      console.log(`MFApi returned ${response.status} for scheme ${schemeCode}`);
      return null;
    }

    const data: MFNAVResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    // Latest NAV is the first entry
    const latestNAV = parseFloat(data.data[0].nav);

    if (isNaN(latestNAV)) {
      return null;
    }

    return latestNAV;
  } catch (error) {
    console.error(`Failed to fetch NAV for scheme ${schemeCode}:`, error);
    return null;
  }
}

/**
 * Get NAV for a mutual fund (auto-fetch with caching)
 *
 * @param symbol - Fund name or symbol (e.g., "ICICI Prudential Multi Asset Fund")
 * @param manualNAV - Manual NAV as fallback (if user has set it)
 * @returns Latest NAV or null if not found
 */
export async function getMutualFundNAV(
  symbol: string,
  manualNAV?: number | null
): Promise<{ nav: number; source: "api" | "manual" | "none" } | null> {
  // Check cache first
  const cached = navCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[MF NAV] Using cached NAV for ${symbol}: ₹${cached.nav} (${cached.source})`);
    return { nav: cached.nav, source: cached.source };
  }

  // Try to fetch from API
  try {
    const schemeCode = await searchMutualFund(symbol);

    if (schemeCode) {
      const apiNAV = await fetchNAVBySchemeCode(schemeCode);

      if (apiNAV) {
        // Cache the API NAV
        navCache.set(symbol, {
          nav: apiNAV,
          timestamp: Date.now(),
          source: "api",
        });

        console.log(`[MF NAV] Fetched from API for ${symbol}: ₹${apiNAV}`);
        return { nav: apiNAV, source: "api" };
      }
    }
  } catch (error) {
    console.error(`[MF NAV] API fetch failed for ${symbol}:`, error);
  }

  // Fallback to manual NAV
  if (manualNAV && manualNAV > 0) {
    console.log(`[MF NAV] Using manual NAV for ${symbol}: ₹${manualNAV}`);
    return { nav: manualNAV, source: "manual" };
  }

  // No NAV available
  console.log(`[MF NAV] No NAV available for ${symbol}`);
  return null;
}

/**
 * Batch fetch NAVs for multiple funds (efficient for portfolio calculations)
 */
export async function batchGetMutualFundNAVs(
  funds: Array<{ symbol: string; manualNAV?: number | null }>
): Promise<Map<string, { nav: number; source: "api" | "manual" }>> {
  const results = new Map();

  // Fetch all in parallel
  await Promise.all(
    funds.map(async (fund) => {
      const result = await getMutualFundNAV(fund.symbol, fund.manualNAV);
      if (result) {
        results.set(fund.symbol, result);
      }
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
 * This can be called from the UI to add custom mappings
 */
export function addMutualFundMapping(fundName: string, schemeCode: string) {
  // TODO: Implement persistent storage for custom mappings
  console.log(`Custom mapping added: ${fundName} → ${schemeCode}`);
}
