import axios from 'axios';

interface MutualFundScheme {
  schemeCode: string;
  schemeName: string;
}

/**
 * List of top 30 mutual funds to fetch scheme IDs for
 */
const TOP_30_FUND_NAMES = [
  // Small Cap Funds
  'Quant Small Cap Fund Direct Plan Growth',
  'Nippon India Small Cap Fund Direct Plan Growth',
  'Axis Small Cap Fund Direct Plan Growth',
  'TATA Small Cap Fund Direct Plan Growth',
  'Bandhan Small Cap Fund Direct Plan Growth',
  'SBI Small Cap Fund Direct Plan Growth',

  // Mid Cap Funds
  'HDFC Mid Cap Opportunities Fund Direct Plan Growth',
  'Nippon India Growth Fund Direct Plan Growth',
  'Edelweiss Mid Cap Fund Direct Plan Growth',
  'Invesco India Mid Cap Fund Direct Plan Growth',
  'Kotak Emerging Equity Fund Direct Plan Growth',
  'Axis Mid Cap Fund Direct Plan Growth',

  // Flexi Cap Funds
  'Parag Parikh Flexi Cap Fund Direct Plan Growth',
  'HDFC Flexi Cap Fund Direct Plan Growth',
  'JM Flexicap Fund Direct Plan Growth',
  'UTI Flexi Cap Fund Direct Plan Growth',
  'SBI Flexi Cap Fund Direct Plan Growth',

  // Large & Mid Cap Funds
  'HDFC Large and Mid Cap Fund Direct Plan Growth',
  'ICICI Prudential Large & Mid Cap Fund Direct Plan Growth',
  'Invesco India Large & Mid Cap Fund Direct Plan Growth',
  'Motilal Oswal Large and Midcap Fund Direct Plan Growth',
  'Mirae Asset Large & Midcap Fund Direct Plan Growth',

  // Multi Cap / Hybrid
  'Nippon India Multi Cap Fund Direct Plan Growth',
  'Quant Multi Asset Allocation Fund Direct Plan Growth',
  'HDFC Balanced Advantage Fund Direct Plan Growth',

  // Sectoral/Thematic
  'Quant Infrastructure Fund Direct Plan Growth',
  'SBI Technology Opportunities Fund Direct Plan Growth',

  // Contra/Value
  'SBI Contra Fund Direct Plan Growth',
  'Invesco India Contra Fund Direct Plan Growth',

  // ELSS
  'HDFC ELSS Tax Saver Fund Direct Plan Growth',
];

/**
 * Fetch all mutual fund schemes from mfapi.in
 */
async function fetchAllSchemes(): Promise<MutualFundScheme[]> {
  try {
    console.log('Fetching all schemes from mfapi.in...');
    const response = await axios.get('https://api.mfapi.in/mf');
    return response.data;
  } catch (error) {
    console.error('Error fetching schemes:', error);
    throw error;
  }
}

/**
 * Search for a mutual fund by name (fuzzy matching)
 */
function findSchemeByName(
  schemes: MutualFundScheme[],
  searchName: string
): MutualFundScheme | null {
  // Normalize the search name
  const normalizedSearch = searchName.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // Try exact match first
  const exactMatch = schemes.find(scheme =>
    scheme.schemeName.toLowerCase() === normalizedSearch
  );
  if (exactMatch) return exactMatch;

  // Try partial match with key terms
  const searchTerms = normalizedSearch.split(' ').filter(term =>
    term.length > 3 &&
    !['fund', 'plan', 'growth', 'direct', 'option'].includes(term)
  );

  const partialMatches = schemes.filter(scheme => {
    const schemeName = scheme.schemeName.toLowerCase();
    return searchTerms.every(term => schemeName.includes(term)) &&
           schemeName.includes('direct') &&
           schemeName.includes('growth');
  });

  if (partialMatches.length === 1) return partialMatches[0];

  // If multiple matches, try to find the most relevant one
  if (partialMatches.length > 1) {
    // Prefer schemes with "growth option" or "growth plan"
    const growthMatches = partialMatches.filter(scheme =>
      scheme.schemeName.toLowerCase().includes('growth option') ||
      scheme.schemeName.toLowerCase().includes('growth plan')
    );
    if (growthMatches.length > 0) {
      return growthMatches[0];
    }
    return partialMatches[0];
  }

  return null;
}

/**
 * Main function to fetch and display scheme IDs
 */
async function main() {
  try {
    const allSchemes = await fetchAllSchemes();
    console.log(`Total schemes available: ${allSchemes.length}\n`);

    const results: { name: string; schemeCode: string; schemeName: string }[] = [];
    const notFound: string[] = [];

    for (const fundName of TOP_30_FUND_NAMES) {
      const scheme = findSchemeByName(allSchemes, fundName);

      if (scheme) {
        results.push({
          name: fundName,
          schemeCode: scheme.schemeCode,
          schemeName: scheme.schemeName,
        });
        console.log(`✓ Found: ${fundName}`);
        console.log(`  Scheme Code: ${scheme.schemeCode}`);
        console.log(`  Full Name: ${scheme.schemeName}\n`);
      } else {
        notFound.push(fundName);
        console.log(`✗ NOT FOUND: ${fundName}\n`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Found: ${results.length}/${TOP_30_FUND_NAMES.length}`);
    console.log(`Not Found: ${notFound.length}\n`);

    if (notFound.length > 0) {
      console.log('=== NOT FOUND ===');
      notFound.forEach(name => console.log(`- ${name}`));
      console.log('\n');
    }

    console.log('=== TYPESCRIPT ARRAY ===');
    console.log('export const TOP_30_MUTUAL_FUNDS: string[] = [');
    results.forEach(({ schemeCode, name }) => {
      console.log(`  '${schemeCode}', // ${name}`);
    });
    console.log('];\n');

  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main();
