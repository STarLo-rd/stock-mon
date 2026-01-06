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

  // Search for alternatives
  const searches = [
    'hdfc mid cap',
    'invesco mid cap',
    'kotak equity opportun',
    'axis midcap',
    'uti flexi',
    'sbi flexi',
    'nippon india growth',
    'mirae asset emerging',
    'dsp midcap',
    'franklin india',
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

    directGrowth.slice(0, 5).forEach(scheme => {
      console.log(`${scheme.schemeCode} | ${scheme.schemeName}`);
    });
  }
}

main();
