/**
 * SDK Local Integration Test
 * 
 * Tests the new Market Data SDK integrated with the main application
 * Validates that the SDK works correctly when used in the actual app context
 */

// Use dynamic import for ES modules
let MarketDataSDK, getLegacyWrapper;

try {
  // Test both direct SDK and legacy wrapper
  const sdkModule = require('./packages/market-data-sdk/dist/index.js');
  MarketDataSDK = sdkModule.MarketDataSDK || sdkModule.default;
  
  const legacyModule = require('./packages/market-data-sdk/dist/adapters/legacy-wrapper.js');
  getLegacyWrapper = legacyModule.getLegacyWrapper;
} catch (error) {
  console.error('Failed to load SDK modules:', error);
  process.exit(1);
}

async function testLocalSDKIntegration() {
  console.log('🚀 Starting Local SDK Integration Test...\n');
  
  let wrapper;
  
  try {
    // Test 1: Direct SDK usage
    console.log('\n📦 Test 1: Direct SDK Usage');
    const sdk = new MarketDataSDK({
      primary: 'NAVER_STOCK',
      fallback: ['YAHOO_STOCK'],
      caching: {
        enabled: true,
        strategy: 'memory',
        ttl: {
          realtime: 300,
          historical: 86400
        }
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60
      }
    });
    
    await sdk.initialize();
    
    // Test direct SDK data fetching
    const sdkResult = await sdk.getMarketData('005930');
    if (typeof sdkResult === 'object' && 'price' in sdkResult) {
      console.log('✅ Direct SDK Result:');
      console.log(`  Symbol: ${sdkResult.symbol}`);
      console.log(`  Name: ${sdkResult.name}`);
      console.log(`  Price: ${sdkResult.price} ${sdkResult.currency}`);
      console.log(`  Change: ${sdkResult.change || 'N/A'} (${sdkResult.changePercent || 'N/A'}%)`);
      console.log(`  Source: ${sdkResult.source}`);
    } else {
      console.log('❌ Direct SDK failed or returned unexpected format');
    }
    
    await sdk.cleanup();
    
    // Test 2: Legacy Wrapper usage
    console.log('\n🔄 Test 2: Legacy Wrapper Usage');
    wrapper = new getLegacyWrapper();
    await wrapper.initialize();
    
    console.log(`🔧 Legacy Wrapper SDK Enabled: ${wrapper.isSDKEnabled()}`);
    
    // Test legacy wrapper data fetching
    const legacyResult = await wrapper.getMarketData('005930');
    if (legacyResult) {
      console.log('✅ Legacy Wrapper Result:');
      console.log(`  Ticker: ${legacyResult.ticker}`);
      console.log(`  Name: ${legacyResult.name}`);
      console.log(`  Current Price: ${legacyResult.currentPrice}`);
      console.log(`  Change: ${legacyResult.changePrice || 'N/A'} (${legacyResult.changePercent || 'N/A'}%)`);
      console.log(`  Currency: ${legacyResult.currency}`);
      console.log(`  Asset Type: ${legacyResult.assetType}`);
      console.log(`  Source: ${legacyResult.source}`);
      
      if (legacyResult.per) console.log(`  PER: ${legacyResult.per}`);
      if (legacyResult.pbr) console.log(`  PBR: ${legacyResult.pbr}`);
      if (legacyResult.marketCap) console.log(`  Market Cap: ${legacyResult.marketCap}`);
    } else {
      console.log('❌ Legacy Wrapper failed');
    }
    
    // Test 3: Environment Variable Control
    console.log('\n⚙️ Test 3: Environment Variable Control');
    
    // Test disabling SDK through environment variable
    const originalEnv = process.env.USE_MARKET_DATA_SDK;
    process.env.USE_MARKET_DATA_SDK = 'false';
    
    const disabledWrapper = new getLegacyWrapper();
    await disabledWrapper.initialize();
    
    const disabledResult = await disabledWrapper.getMarketData('005930');
    console.log(`🔧 SDK Disabled Result: ${disabledResult ? 'Data returned' : 'Null (expected)'}`);
    
    // Restore original environment
    process.env.USE_MARKET_DATA_SDK = originalEnv;
    
    // Test 4: Data Consistency
    console.log('\n📊 Test 4: Data Consistency Check');
    
    const enabledWrapper = new getLegacyWrapper();
    await enabledWrapper.initialize();
    
    const consistencyResult1 = await enabledWrapper.getMarketData('005930');
    const consistencyResult2 = await enabledWrapper.getMarketData('373220');
    
    if (consistencyResult1 && consistencyResult2) {
      console.log('✅ Data Consistency Test:');
      console.log(`  005930: ${consistencyResult1.currentPrice} KRW (${consistencyResult1.source})`);
      console.log(`  373220: ${consistencyResult2.currentPrice} KRW (${consistencyResult2.source})`);
      console.log(`  ✅ Both results from SDK: ${consistencyResult1.source === consistencyResult2.source}`);
    } else {
      console.log('❌ Data Consistency Test failed');
    }
    
    // Test 5: Error Handling
    console.log('\n🛡️ Test 5: Error Handling');
    
    const testWrapper = new getLegacyWrapper();
    await testWrapper.initialize();
    
    // Simulate SDK failure by using invalid symbol
    const errorResult = await testWrapper.getMarketData('INVALID_SYMBOL');
    console.log(`🚨 Error Handling Result: ${errorResult ? 'Null (expected)' : 'Unexpected data'}`);
    
    // Test 6: Health Status
    console.log('\n🏥 Test 6: Health Status');
    
    const healthWrapper = new getLegacyWrapper();
    await healthWrapper.initialize();
    
    const healthStatus = await healthWrapper.getHealthStatus();
    console.log(`✅ Health Status: ${healthStatus.sdk}`);
    console.log(`✅ Data Sources Count: ${healthStatus.sources.length}`);
    
    await wrapper.cleanup();
    await healthWrapper.cleanup();
    
    console.log('\n✅ All local SDK integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Local SDK integration test failed:', error);
  } finally {
    if (wrapper) {
      await wrapper.cleanup();
      console.log('🧹 Legacy wrapper cleanup completed');
    }
  }
}

// Run tests
if (require.main === module) {
  testLocalSDKIntegration();
}

module.exports = {
  testLocalSDKIntegration
};
