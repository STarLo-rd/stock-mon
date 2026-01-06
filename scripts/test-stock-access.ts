import { NIFTY50_STOCKS, MIDCAP150_STOCKS, getPlanRules } from '../src/config/subscription-plans';

console.log('=== STOCK ACCESS CONTROL TEST ===\n');

// Check counts
console.log('1. Stock Counts:');
console.log(`   - NIFTY50 stocks: ${NIFTY50_STOCKS.length}`);
console.log(`   - MIDCAP150 stocks: ${MIDCAP150_STOCKS.length}\n`);

// Check for duplicates within each list
console.log('2. Duplicate Check:');
const nifty50Set = new Set(NIFTY50_STOCKS);
const midcap150Set = new Set(MIDCAP150_STOCKS);
console.log(`   - NIFTY50 unique: ${nifty50Set.size} (duplicates: ${NIFTY50_STOCKS.length - nifty50Set.size})`);
console.log(`   - MIDCAP150 unique: ${midcap150Set.size} (duplicates: ${MIDCAP150_STOCKS.length - midcap150Set.size})\n`);

// Check for overlaps between NIFTY50 and MIDCAP150
console.log('3. Overlap Check (stocks in both lists):');
const overlaps = NIFTY50_STOCKS.filter(stock => MIDCAP150_STOCKS.includes(stock));
if (overlaps.length > 0) {
  console.log(`   ⚠️  Found ${overlaps.length} overlapping stocks:`);
  overlaps.forEach(stock => console.log(`      - ${stock}`));
} else {
  console.log('   ✓ No overlaps - lists are mutually exclusive');
}
console.log('');

// Plan access verification
console.log('4. Plan Access Verification:');
const freeRules = getPlanRules('FREE');
const premiumRules = getPlanRules('PREMIUM');
const proRules = getPlanRules('PRO');

console.log('   FREE Plan:');
console.log(`      - Stock Access: ${freeRules.stockAccess.join(', ')}`);
console.log(`      - Total Stocks: ${NIFTY50_STOCKS.length}`);

console.log('\n   PREMIUM Plan:');
console.log(`      - Stock Access: ${premiumRules.stockAccess.join(', ')}`);
console.log(`      - Total Stocks: ${NIFTY50_STOCKS.length + MIDCAP150_STOCKS.length - overlaps.length}`);

console.log('\n   PRO Plan:');
console.log(`      - Stock Access: ${proRules.stockAccess.join(', ')}`);
console.log(`      - Total Stocks: ALL (unlimited)\n`);

// Sample stocks from each category
console.log('5. Sample Stocks:');
console.log('   NIFTY50 (first 5):');
NIFTY50_STOCKS.slice(0, 5).forEach((stock, i) => {
  console.log(`      ${i + 1}. ${stock}`);
});

console.log('\n   MIDCAP150 (first 5):');
MIDCAP150_STOCKS.slice(0, 5).forEach((stock, i) => {
  console.log(`      ${i + 1}. ${stock}`);
});

console.log('\n=== TEST COMPLETE ===');
