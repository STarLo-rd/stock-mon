import { getPlanRules, MutualFundAccess, TOP_15_MUTUAL_FUNDS, TOP_30_MUTUAL_FUNDS } from '../src/config/subscription-plans';

/**
 * Test script to verify mutual fund access control
 */

console.log('=== MUTUAL FUND ACCESS CONTROL TEST ===\n');

// Test FREE plan
console.log('1. FREE Plan Rules:');
const freeRules = getPlanRules('FREE');
console.log(`   - Stock Access: ${freeRules.stockAccess.join(', ')}`);
console.log(`   - Mutual Fund Access: ${freeRules.mutualFundAccess}`);
console.log(`   - Indices Access: ${freeRules.indicesAccess.join(', ')}`);
console.log(`   - Total Mutual Funds: ${TOP_15_MUTUAL_FUNDS.length}\n`);

// Test PREMIUM plan
console.log('2. PREMIUM Plan Rules:');
const premiumRules = getPlanRules('PREMIUM');
console.log(`   - Stock Access: ${premiumRules.stockAccess.join(', ')}`);
console.log(`   - Mutual Fund Access: ${premiumRules.mutualFundAccess}`);
console.log(`   - Indices Access: ${premiumRules.indicesAccess.join(', ')}`);
console.log(`   - Total Mutual Funds: ${TOP_30_MUTUAL_FUNDS.length}\n`);

// Test PRO plan
console.log('3. PRO Plan Rules:');
const proRules = getPlanRules('PRO');
console.log(`   - Stock Access: ${proRules.stockAccess.join(', ')}`);
console.log(`   - Mutual Fund Access: ${proRules.mutualFundAccess}`);
console.log(`   - Indices Access: ${proRules.indicesAccess.join(', ')}`);
console.log(`   - Total Mutual Funds: ALL\n`);

// Verify TOP_30 includes TOP_15
console.log('4. Validation Checks:');
const top15InTop30 = TOP_15_MUTUAL_FUNDS.every(fund => TOP_30_MUTUAL_FUNDS.includes(fund));
console.log(`   ✓ All TOP_15 funds are in TOP_30: ${top15InTop30}`);

// Check for duplicates in TOP_30
const uniqueFunds = new Set(TOP_30_MUTUAL_FUNDS);
const hasDuplicates = uniqueFunds.size !== TOP_30_MUTUAL_FUNDS.length;
console.log(`   ✓ No duplicates in TOP_30: ${!hasDuplicates}`);
console.log(`   ✓ Unique funds count: ${uniqueFunds.size}\n`);

// Display sample funds
console.log('5. Sample Funds:');
console.log('   FREE plan funds (first 5):');
TOP_15_MUTUAL_FUNDS.slice(0, 5).forEach((fund, i) => {
  console.log(`     ${i + 1}. ${fund}`);
});

console.log('\n   PREMIUM plan additional funds (first 5 beyond FREE):');
const additionalFunds = TOP_30_MUTUAL_FUNDS.filter(fund => !TOP_15_MUTUAL_FUNDS.includes(fund));
additionalFunds.slice(0, 5).forEach((fund, i) => {
  console.log(`     ${i + 1}. ${fund}`);
});

console.log('\n=== TEST COMPLETE ===');

// Test the enum
console.log('\n6. MutualFundAccess Enum:');
console.log(`   - TOP_15: ${MutualFundAccess.TOP_15}`);
console.log(`   - TOP_30: ${MutualFundAccess.TOP_30}`);
console.log(`   - ALL: ${MutualFundAccess.ALL}`);
