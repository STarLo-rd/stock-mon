/**
 * Script to fetch scheme IDs for top 15 mutual funds
 * Run with: npx tsx scripts/fetch-mutual-fund-scheme-ids.ts
 */

import axios, { AxiosInstance } from 'axios';

// Create a direct API client to bypass Redis dependency
const apiClient: AxiosInstance = axios.create({
  baseURL: 'https://api.mfapi.in',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  },
  timeout: 10000,
});

/**
 * Search mutual fund schemes directly via API (bypassing Redis cache)
 */
async function searchSchemesDirect(query: string): Promise<Array<{ schemeCode: number; schemeName: string }>> {
  try {
    const response = await apiClient.get('/mf/search', {
      params: { q: query },
    });
    return response.data || [];
  } catch (error: any) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

/**
 * List of mutual funds to fetch scheme IDs for
 */
const MUTUAL_FUNDS_TO_FETCH = [
  'Quant Small Cap Fund Direct Growth',
  'Quant Infrastructure Fund Direct Growth',
  'Nippon India Small Cap Fund Direct Growth',
  'HDFC Mid Cap Fund Direct Growth',
  'Nippon India Multi Cap Fund Direct Growth',
  'Edelweiss Mid Cap Fund Direct Growth',
  'HDFC Flexi Cap Fund Direct Growth',
  'Parag Parikh Flexi Cap Fund Direct Growth',
  'HDFC Balanced Advantage Fund',
  'Quant Multi Asset Fund Direct Growth',
  'Axis Small Cap Fund',
  'Tata Small Cap Fund',
  'SBI Contra Fund Direct Growth',
  'Invesco India Mid Cap Fund Direct Growth',
  'Motilal Oswal Midcap Fund Direct Growth',
];

interface FundResult {
  searchQuery: string;
  schemeCode: string | null;
  schemeName: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Search for a mutual fund scheme by name
 */
async function findSchemeId(searchQuery: string): Promise<FundResult> {
  console.log(`\nSearching for: ${searchQuery}`);
  
  try {
    // Try exact search first
    let schemes = await searchSchemesDirect(searchQuery);
    
    // If no results, try with "Direct Plan Growth" suffix
    if (schemes.length === 0 && !searchQuery.toLowerCase().includes('direct')) {
      schemes = await searchSchemesDirect(`${searchQuery} Direct Plan Growth`);
    }
    
    // If still no results, try shorter query (remove "Fund" and "Direct Growth")
    if (schemes.length === 0) {
      const shortQuery = searchQuery
        .replace(/Fund Direct Growth/gi, '')
        .replace(/Fund/gi, '')
        .trim();
      schemes = await searchSchemesDirect(shortQuery);
    }
    
    if (schemes.length === 0) {
      console.log(`  ❌ No results found`);
      return {
        searchQuery,
        schemeCode: null,
        schemeName: null,
        confidence: 'low',
      };
    }
    
    // Find best match
    const upperQuery = searchQuery.toUpperCase();
    const exactMatch = schemes.find(
      (s) => s.schemeName.toUpperCase() === upperQuery ||
             s.schemeName.toUpperCase().includes(upperQuery) ||
             upperQuery.includes(s.schemeName.toUpperCase().split(' ')[0])
    );
    
    const bestMatch = exactMatch ?? schemes[0];
    
    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    const matchName = bestMatch.schemeName.toUpperCase();
    if (matchName.includes(upperQuery.split(' ')[0]) && matchName.includes('DIRECT') && matchName.includes('GROWTH')) {
      confidence = 'high';
    } else if (matchName.includes(upperQuery.split(' ')[0])) {
      confidence = 'medium';
    }
    
    console.log(`  ✅ Found: ${bestMatch.schemeName}`);
    console.log(`     Scheme Code: ${bestMatch.schemeCode}`);
    console.log(`     Confidence: ${confidence}`);
    
    return {
      searchQuery,
      schemeCode: bestMatch.schemeCode.toString(),
      schemeName: bestMatch.schemeName,
      confidence,
    };
  } catch (error: any) {
    console.error(`  ❌ Error searching: ${error.message}`);
    return {
      searchQuery,
      schemeCode: null,
      schemeName: null,
      confidence: 'low',
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Mutual Fund Scheme ID Fetcher');
  console.log('='.repeat(60));
  
  const results: FundResult[] = [];
  
  // Fetch scheme IDs with delay to avoid rate limiting
  for (const fund of MUTUAL_FUNDS_TO_FETCH) {
    const result = await findSchemeId(fund);
    results.push(result);
    
    // Delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  
  const highConfidence = results.filter((r) => r.confidence === 'high');
  const mediumConfidence = results.filter((r) => r.confidence === 'medium');
  const lowConfidence = results.filter((r) => r.confidence === 'low' || !r.schemeCode);
  
  console.log(`\nHigh Confidence: ${highConfidence.length}`);
  console.log(`Medium Confidence: ${mediumConfidence.length}`);
  console.log(`Low Confidence/Not Found: ${lowConfidence.length}`);
  
  // Print results in array format
  console.log('\n' + '='.repeat(60));
  console.log('Scheme IDs Array (copy to subscription-plans.ts)');
  console.log('='.repeat(60));
  console.log('\nexport const TOP_15_MUTUAL_FUNDS: string[] = [');
  
  results.forEach((result, index) => {
    if (result.schemeCode) {
      const comment = `// ${result.schemeName}`;
      console.log(`  '${result.schemeCode}', ${comment}`);
    } else {
      console.log(`  // TODO: Find scheme ID for: ${result.searchQuery}`);
    }
  });
  
  console.log('];\n');
  
  // Print manual verification needed
  if (lowConfidence.length > 0) {
    console.log('='.repeat(60));
    console.log('⚠️  Manual Verification Needed');
    console.log('='.repeat(60));
    lowConfidence.forEach((result) => {
      console.log(`\n${result.searchQuery}:`);
      console.log('  Please search manually and verify scheme ID');
    });
  }
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

