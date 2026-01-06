import axios from 'axios';

interface MutualFundScheme {
  schemeCode: string;
  schemeName: string;
}

async function fetchAllSchemes(): Promise<MutualFundScheme[]> {
  const response = await axios.get('https://api.mfapi.in/mf');
  return response.data;
}

async function main() {
  const allSchemes = await fetchAllSchemes();

  const searches = [
    'axis small cap',
    'sbi small cap',
    'hdfc mid cap opportunities',
    'edelweiss mid cap',
    'invesco india mid cap',
    'kotak emerging equity',
    'axis mid cap',
    'jm flexicap',
    'uti flexi cap',
    'sbi flexi cap',
  ];

  for (const search of searches) {
    console.log(`\n=== ${search.toUpperCase()} ===`);
    const results = allSchemes.filter(s =>
      s.schemeName.toLowerCase().includes(search.toLowerCase())
    );

    const directGrowth = results.filter(s => {
      const name = s.schemeName.toLowerCase();
      return name.includes('direct') && (name.includes('growth') || name.includes('gro'));
    });

    directGrowth.slice(0, 3).forEach(scheme => {
      console.log(`${scheme.schemeCode} | ${scheme.schemeName}`);
    });
  }
}

main();
