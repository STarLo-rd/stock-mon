import axios from 'axios';

interface MutualFundScheme {
  schemeCode: string;
  schemeName: string;
}

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
 * Search for schemes by keyword
 */
function searchSchemes(schemes: MutualFundScheme[], keyword: string): MutualFundScheme[] {
  const normalizedKeyword = keyword.toLowerCase();
  return schemes.filter(scheme =>
    scheme.schemeName.toLowerCase().includes(normalizedKeyword)
  );
}

async function main() {
  const allSchemes = await fetchAllSchemes();
  console.log(`Total schemes available: ${allSchemes.length}\n`);

  // Search patterns for better accuracy
  const searches = [
    'axis small cap fund direct growth',
    'sbi small cap fund direct growth',
    'hdfc mid cap opportunities fund direct growth',
    'nippon india growth fund direct growth mid',
    'edelweiss mid cap fund direct growth',
    'invesco india mid cap fund direct growth',
    'kotak emerging equity fund direct growth',
    'axis mid cap fund direct growth',
    'jm flexicap fund direct growth',
    'uti flexi cap fund direct growth',
    'sbi flexi cap fund direct growth',
    'hdfc large and mid cap fund direct growth',
  ];

  for (const search of searches) {
    console.log(`\n=== Searching for: ${search} ===`);
    const results = searchSchemes(allSchemes, search);

    // Filter for direct plan growth
    const filtered = results.filter(s => {
      const name = s.schemeName.toLowerCase();
      return name.includes('direct') && name.includes('growth');
    });

    console.log(`Found ${filtered.length} matches:`);
    filtered.slice(0, 5).forEach(scheme => {
      console.log(`  ${scheme.schemeCode} - ${scheme.schemeName}`);
    });
  }
}

main();
