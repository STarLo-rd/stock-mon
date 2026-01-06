import { NIFTY50_STOCKS, MIDCAP150_STOCKS } from '../src/config/subscription-plans';

console.log('=== FIXING MIDCAP150 OVERLAPS ===\n');

// Find overlaps
const overlaps = MIDCAP150_STOCKS.filter(stock => NIFTY50_STOCKS.includes(stock));
console.log(`Found ${overlaps.length} overlapping stocks:`);
overlaps.forEach(stock => console.log(`  - ${stock}`));

// Remove overlaps from MIDCAP150
const cleanedMidcap = MIDCAP150_STOCKS.filter(stock => !NIFTY50_STOCKS.includes(stock));

console.log(`\nOriginal MIDCAP150 count: ${MIDCAP150_STOCKS.length}`);
console.log(`Cleaned MIDCAP150 count: ${cleanedMidcap.length}`);
console.log(`Removed: ${MIDCAP150_STOCKS.length - cleanedMidcap.length} stocks\n`);

// Generate clean array for code
console.log('=== CLEANED MIDCAP150_STOCKS ARRAY ===\n');
console.log('export const MIDCAP150_STOCKS: string[] = [');

// Format in groups of 5 for readability
for (let i = 0; i < cleanedMidcap.length; i += 5) {
  const group = cleanedMidcap.slice(i, i + 5);
  const formattedGroup = group.map(s => `'${s}'`).join(', ');
  console.log(`  ${formattedGroup}${i + 5 < cleanedMidcap.length ? ',' : ''}`);
}

console.log('];\n');

console.log(`Total PREMIUM stocks (NIFTY50 + MIDCAP): ${NIFTY50_STOCKS.length + cleanedMidcap.length}`);
