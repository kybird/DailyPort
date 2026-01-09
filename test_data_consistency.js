/**
 * Data Consistency Test
 * 
 * Compares data from SDK vs Legacy methods to ensure consistency
 * Tests multiple stocks and validates data accuracy
 */

// Import both methods
let getMarketData, getLegacyWrapper;

try {
  // Import legacy method
  const legacyModule = require('./src/utils/market-data.js');
  getMarketData = legacyModule.getMarketData;
  
  // Import SDK method
  const sdkModule = require('./packages/market-data-sdk/dist/adapters/legacy-wrapper.js');
  getLegacyWrapper = sdkModule.getLegacyWrapper;
} catch (error) {
  console.error('Failed to load modules:', error);
  process.exit(1);
}

// Test symbols
const TEST_SYMBOLS = [
  '005930', // Samsung Electronics
  '373220', // LG Energy Solution
  '000660', // SK Hynix
  '069500', // KODEX 200 (ETF)
  '051910', // Samsung Electronics Preferred
  '005490', // Samsung Fire & Marine Insurance
  '051930'  // Samsung Engineering & Construction
];

async function testDataConsistency() {
  console.log('🔍 Starting Data Consistency Test...\n');
  
  // Initialize SDK wrapper
  const wrapper = getLegacyWrapper();
  await wrapper.initialize();
  
  const results = [];
  
  for (const symbol of TEST_SYMBOLS) {
    console.log(`\n📊 Testing ${symbol}...`);
    
    try {
      // Test with SDK enabled
      const sdkResult = await wrapper.getMarketData(symbol);
      
      // Test with SDK disabled (legacy method)
      process.env.USE_MARKET_DATA_SDK = 'false';
      const legacyResult = await getMarketData(symbol);
      
      // Restore SDK setting
      process.env.USE_MARKET_DATA_SDK = 'true';
      
      if (sdkResult && legacyResult) {
        const comparison = {
          symbol,
          sdk: {
            price: sdkResult.currentPrice,
            change: sdkResult.changePrice,
            changePercent: sdkResult.changePercent,
            source: sdkResult.source,
            per: sdkResult.per,
            pbr: sdkResult.pbr,
            marketCap: sdkResult.marketCap
          },
          legacy: {
            price: legacyResult.currentPrice,
            change: legacyResult.changePrice,
            changePercent: legacyResult.changePercent,
            source: legacyResult.source,
            per: legacyResult.per,
            pbr: legacyResult.pbr,
            marketCap: legacyResult.marketCap
          }
        };
        
        // Calculate differences
        const priceDiff = Math.abs(comparison.sdk.price - comparison.legacy.price);
        const changeDiff = Math.abs((comparison.sdk.change || 0) - (comparison.legacy.change || 0));
        const changePercentDiff = Math.abs((comparison.sdk.changePercent || 0) - (comparison.legacy.changePercent || 0));
        const perDiff = Math.abs((comparison.sdk.per || 0) - (comparison.legacy.per || 0));
        const pbrDiff = Math.abs((comparison.sdk.pbr || 0) - (comparison.legacy.pbr || 0));
        const marketCapDiff = Math.abs((comparison.sdk.marketCap || 0) - (comparison.legacy.marketCap || 0));
        
        const isConsistent = 
          priceDiff < 1 && // Price difference less than 1 KRW
          changeDiff < 1 && // Change difference less than 1 KRW
          changePercentDiff < 0.1 && // Change percent difference less than 0.1%
          perDiff < 0.5 && // PER difference less than 0.5
          pbrDiff < 0.5 && // PBR difference less than 0.5
          marketCapDiff < comparison.legacy.marketCap * 0.01; // Market cap difference less than 1%
        
        console.log(`  Price: SDK=${comparison.sdk.price}, Legacy=${comparison.legacy.price}, Diff=${priceDiff} KRW`);
        console.log(`  Change: SDK=${comparison.sdk.change}, Legacy=${comparison.legacy.change}, Diff=${changeDiff} KRW`);
        console.log(`  Change%: SDK=${comparison.sdk.changePercent}%, Legacy=${comparison.legacy.changePercent}%, Diff=${changePercentDiff}%`);
        console.log(`  PER: SDK=${comparison.sdk.per}, Legacy=${comparison.legacy.per}, Diff=${perDiff}`);
        console.log(`  PBR: SDK=${comparison.sdk.pbr}, Legacy=${comparison.legacy.pbr}, Diff=${pbrDiff}`);
        console.log(`  Source: SDK=${comparison.sdk.source}, Legacy=${comparison.legacy.source}`);
        console.log(`  ✅ Consistent: ${isConsistent}`);
        
        results.push({
          ...comparison,
          isConsistent,
          priceDiff,
          changePercentDiff,
          perDiff,
          pbrDiff
        });
        
      } else {
        console.log(`  ❌ Failed to get data for ${symbol}`);
        results.push({
          symbol,
          error: 'Failed to fetch data',
          isConsistent: false
        });
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${symbol}:`, error);
      results.push({
        symbol,
        error: error.message || 'Unknown error',
        isConsistent: false
      });
    }
  }
  
  // Summary
  console.log('\n📋 Consistency Test Summary:');
  const consistentCount = results.filter(r => r.isConsistent).length;
  const totalCount = results.length;
  const consistencyRate = (consistentCount / totalCount * 100).toFixed(1);
  
  console.log(`✅ Consistent Results: ${consistentCount}/${totalCount} (${consistencyRate}%)`);
  console.log(`❌ Inconsistent Results: ${totalCount - consistentCount}/${totalCount} (${(100 - consistencyRate)}%)`);
  
  if (consistentCount === totalCount) {
    console.log('🎉 Perfect consistency! All test symbols have identical data.');
  } else {
    console.log('⚠️  Some inconsistencies detected. Review the following:');
    
    const inconsistent = results.filter(r => !r.isConsistent);
    inconsistent.forEach(result => {
      if (result.priceDiff > 1) {
        console.log(`  💰 ${result.symbol}: Price diff ${result.priceDiff} KRW`);
      }
      if (result.changePercentDiff > 0.1) {
        console.log(`  📈 ${result.symbol}: Change% diff ${result.changePercentDiff}%`);
      }
      if (result.perDiff > 0.5) {
        console.log(`  📊 ${result.symbol}: PER diff ${result.perDiff}`);
      }
      if (result.pbrDiff > 0.5) {
        console.log(`  📊 ${result.symbol}: PBR diff ${result.pbrDiff}`);
      }
    });
  }
  
  await wrapper.cleanup();
  console.log('\n✅ Data consistency test completed!');
  
  return {
    totalTests: totalCount,
    consistentTests: consistentCount,
    consistencyRate: parseFloat(consistencyRate),
    results
  };
}

// Run tests
if (require.main === module) {
  testDataConsistency().then(summary => {
    console.log('\n📊 Final Summary:');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Consistent Tests: ${summary.consistentTests}`);
    console.log(`Consistency Rate: ${summary.consistencyRate}%`);
    
    if (summary.consistencyRate >= 95) {
      console.log('🎉 EXCELLENT: Data consistency is excellent!');
      process.exit(0);
    } else if (summary.consistencyRate >= 90) {
      console.log('✅ GOOD: Data consistency is very good!');
      process.exit(0);
    } else if (summary.consistencyRate >= 80) {
      console.log('⚠️  FAIR: Data consistency is acceptable but needs improvement.');
      process.exit(1);
    } else {
      console.log('❌ POOR: Data consistency is below acceptable levels.');
      process.exit(2);
    }
  });
}

module.exports = {
  testDataConsistency
};
