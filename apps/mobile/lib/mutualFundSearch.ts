/**
 * Mutual Fund Search - Search Indian mutual funds by name
 * Source: MFApi comprehensive scheme list
 */

interface MFScheme {
  schemeCode: string;
  schemeName: string;
}

// Cache for all schemes (fetched once, lasts session)
let allSchemesCache: MFScheme[] | null = null;

/**
 * Fetch all mutual fund schemes from MFApi
 * This is cached for the session to avoid repeated API calls
 */
async function getAllMFSchemes(): Promise<MFScheme[]> {
  if (allSchemesCache) {
    return allSchemesCache;
  }

  try {
    const response = await fetch("https://api.mfapi.in/mf");

    if (!response.ok) {
      console.error("Failed to fetch MF schemes:", response.status);
      return [];
    }

    const schemes = await response.json();

    // Cache the result (ensure scheme codes are strings)
    allSchemesCache = schemes.map((s: any) => ({
      schemeCode: String(s.schemeCode),
      schemeName: s.schemeName,
    }));

    console.log(`Loaded ${allSchemesCache.length} mutual fund schemes`);
    return allSchemesCache;
  } catch (error) {
    console.error("Error fetching MF schemes:", error);
    return [];
  }
}

/**
 * Search mutual funds by name
 * Returns top 10 matches sorted by relevance
 */
export async function searchMutualFunds(query: string): Promise<Array<{
  symbol: string;      // scheme code
  name: string;        // scheme name
  exchange: string;    // "MF" for mutual fund
  type: string;        // "mutual_fund"
}>> {
  if (!query.trim() || query.length < 3) {
    return [];
  }

  const schemes = await getAllMFSchemes();
  const searchTerm = query.toLowerCase().trim();

  // Filter and rank schemes
  const matches = schemes
    .map((scheme) => {
      const schemeName = scheme.schemeName.toLowerCase();

      // Calculate relevance score
      let score = 0;

      // Exact match at start (highest priority)
      if (schemeName.startsWith(searchTerm)) {
        score = 1000;
      }
      // Contains all words
      else if (searchTerm.split(" ").every((word) => schemeName.includes(word))) {
        score = 500;
      }
      // Partial match
      else if (schemeName.includes(searchTerm)) {
        score = 100;
      }

      return { scheme, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Top 10 matches
    .map((item) => ({
      symbol: String(item.scheme.schemeCode), // Ensure string
      name: item.scheme.schemeName,
      exchange: "MF",
      type: "mutual_fund",
    }));

  return matches;
}

/**
 * Get scheme details by code
 */
export async function getMFSchemeByCode(schemeCode: string): Promise<{
  schemeName: string;
  latestNAV: number;
} | null> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      schemeName: data.meta.scheme_name,
      latestNAV: parseFloat(data.data[0].nav),
    };
  } catch (error) {
    console.error(`Error fetching scheme ${schemeCode}:`, error);
    return null;
  }
}

/**
 * Clear the schemes cache (useful for forcing refresh)
 */
export function clearMFSchemesCache() {
  allSchemesCache = null;
}
