/**
 * Simple Data Consistency Test
 * 
 * Tests data consistency between SDK and Legacy methods
 */

// Import both methods
let getMarketData;

try {
  // Import legacy method
  const legacyModule = require('../src/utils/market-data.js');
  getMarketData = legacyModule.getMarketData;
  // Import SDK method
  const sdkModule = require('./packages/market-data-sdk/dist/adapters/legacy-wrapper.js');
  const getLegacyWrapper = sdkModule.getLegacyWrapper;
} catch (error) {
  console.error('Failed to load modules:', error);
  process.exit(1);
}

// Test symbols
const TEST_SYMBOLS = ['005930', '373220'];

async function testSimpleConsistency() {
  console.log('🔍 Starting Simple Data Consistency Test...\n');
  
  // Initialize SDK wrapper
  const wrapper = getLegacyWrapper();
  await wrapper.initialize();
  
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
        const priceDiff = Math.abs(sdkResult.currentPrice - legacyResult.currentPrice);
        const changeDiff = Math.abs((sdkResult.changePrice || 0) - (legacyResult.changePrice || 0));
        const changePercentDiff = Math.abs((sdkResult.changePercent || 0) - (legacyResult.changePercent || 0));
        const perDiff = Math.abs((sdkResult.per || 0) - (legacyResult.per || 0));
        const pbrDiff = Math.abs((sdkResult.pbr || 0) - (legacyResult.pbr || 0));
        const marketCapDiff = Math.abs((sdkResult.marketCap || 0) - (legacyResult.marketCap || 0));
        
        const isConsistent = 
          priceDiff < 1 &&
          changeDiff < 1 &&
          changePercentDiff < 0.1 &&
          perDiff < 0.5 &&
          pbrDiff < 0.5 &&
          marketCapDiff < legacyResult.marketCap * 0.01;
        
        console.log(`  Price: SDK=${sdkResult.currentPrice}, Legacy=${legacyResult.currentPrice}, Diff=${priceDiff} KRW`);
        console.log(`  Change: SDK=${sdkResult.changePrice}, Legacy=${legacyResult.changePrice}, Diff=${changeDiff} KRW`);
        console.log(`  Change%: SDK=${sdkResult.changePercent}%, Legacy=${legacyResult.changePercent}%, Diff=${changePercentDiff}%`);
        console.log(`  PER: SDK=${sdkResult.per}, Legacy=${legacyResult.per}, Diff=${perDiff}`);
        console.log(`  PBR: SDK=${sdkResult.pbr}, Legacy=${legacyResult.pbr}, Diff=${pbrDiff}`);
        console.log(`  Market Cap: SDK=${sdkResult.marketCap}, Legacy=${legacyResult.marketCap}, Diff=${marketCapDiff}`);
        console.log(`  Source: SDK=${sdkResult.source}, Legacy=${legacyResult.source}`);
        console.log(`  ✅ Consistent: ${isConsistent}`);
      } else {
        console.log(`  ❌ Failed to get data for ${symbol}`);
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${symbol}:`, error);
    }
  }
  
  await wrapper.cleanup();
  console.log('\n✅ Simple data consistency test completed!');
}

// Run tests
if (require.main === module) {
  testSimpleConsistency();
}
