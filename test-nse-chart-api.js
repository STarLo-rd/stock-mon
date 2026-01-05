const axios = require('axios');

/**
 * Test script for NSE Chart API
 * Tests if we can fetch chart data from NSE for different symbols and timeframes
 */

async function testNSEChart(symbol, timeframe) {
  try {
    const nseSymbol = symbol === 'NIFTY50' ? 'NIFTY 50' : symbol;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${symbol} (${timeframe})`);
    console.log(`NSE Symbol: ${nseSymbol}`);
    console.log('='.repeat(60));

    const response = await axios.get(
      'https://www.nseindia.com/api/NextApi/apiClient/historicalGraph',
      {
        params: {
          functionName: 'getGraphChart',
          type: nseSymbol,
          flag: timeframe,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/',
        },
        timeout: 10000,
      }
    );

    const graphData = response.data?.data?.grapthData || [];

    if (graphData.length === 0) {
      console.log('❌ No data returned from NSE API');
      return false;
    }

    console.log(`✅ Success! Received ${graphData.length} data points`);
    console.log('\nFirst 3 data points:');
    graphData.slice(0, 3).forEach((point, i) => {
      const timestamp = new Date(point[0]);
      const price = point[1];
      console.log(`  ${i + 1}. ${timestamp.toISOString().split('T')[0]} | ₹${price.toFixed(2)}`);
    });

    console.log('\nLast data point:');
    const last = graphData[graphData.length - 1];
    const lastTimestamp = new Date(last[0]);
    const lastPrice = last[1];
    console.log(`  ${lastTimestamp.toISOString().split('T')[0]} | ₹${lastPrice.toFixed(2)}`);

    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data).substring(0, 200));
    }
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 NSE Chart API Test Suite');
  console.log('Testing chart data fetching from NSE API\n');

  const tests = [
    // Index tests
    { symbol: 'NIFTY50', timeframe: '1M', description: 'NIFTY 50 Index - 1 Month' },
    { symbol: 'NIFTY50', timeframe: '1Y', description: 'NIFTY 50 Index - 1 Year' },

    // Stock tests
    { symbol: 'RELIANCE', timeframe: '1M', description: 'RELIANCE Stock - 1 Month' },
    { symbol: 'TCS', timeframe: '1M', description: 'TCS Stock - 1 Month' },
    { symbol: 'INFY', timeframe: '6M', description: 'INFY Stock - 6 Months' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testNSEChart(test.symbol, test.timeframe);
    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Wait 2 seconds between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log('='.repeat(60));

  if (passed === tests.length) {
    console.log('\n🎉 All tests passed! NSE Chart API is working.');
  } else {
    console.log('\n⚠️  Some tests failed. NSE API might be down or rate limiting.');
  }
}

runTests().catch(console.error);
