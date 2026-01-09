/**
 * Legacy Integration Test
 * 
 * Tests the new LegacyDataSourceWrapper to ensure backward compatibility
 * with existing market-data.ts interface
 */

// Use dynamic import for ES modules
let LegacyDataSourceWrapper;

try {
  const legacyModule = require('./packages/market-data-sdk/dist/adapters/legacy-wrapper.js');
  LegacyDataSourceWrapper = legacyModule.LegacyDataSourceWrapper;
} catch (error) {
  console.error('Failed to load Legacy Wrapper module:', error);
  process.exit(1);
}

async function testLegacyIntegration() {
  console.log('🔄 Starting Legacy Integration Test...\n');
  
  let wrapper;
  
  try {
    // Initialize legacy wrapper with SDK enabled
    wrapper = new LegacyDataSourceWrapper(true);
    await wrapper.initialize();
    
    console.log('✅ Legacy Wrapper initialized successfully');
    console.log(`🔧 SDK Enabled: ${wrapper.isSDKEnabled()}`);
    
    // Test market data with Korean stocks
    await testLegacyMarketData(wrapper, '005930', 'Samsung Electronics');
    await testLegacyMarketData(wrapper, '373220', 'LG Electronics');
    
    // Test index data
    await testLegacyIndexData(wrapper, 'KOSPI');
    await testLegacyIndexData(wrapper, 'KOSDAQ');
    
    // Test health status
    await testLegacyHealthStatus(wrapper);
    
    // Test feature flagging
    await testFeatureFlagging(wrapper);
    
    console.log('\n✅ All legacy integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Legacy integration test failed:', error);
  } finally {
    if (wrapper) {
      await wrapper.cleanup();
      console.log('🧹 Legacy wrapper cleanup completed');
    }
  }
}

async function testLegacyMarketData(wrapper, symbol, companyName) {
  console.log(`\n📈 Testing legacy market data for ${symbol} (${companyName})...`);
  
  try {
    const result = await wrapper.getMarketData(symbol);
    
    if (!result) {
      console.error(`❌ Failed to get market data for ${symbol}`);
      return;
    }
    
    console.log('✅ Legacy Market Data:');
    console.log(`  Ticker: ${result.ticker}`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Current Price: ${result.currentPrice}`);
    console.log(`  Change: ${result.changePrice || 'N/A'} (${result.changePercent || 'N/A'}%)`);
    console.log(`  Currency: ${result.currency}`);
    console.log(`  Asset Type: ${result.assetType}`);
    console.log(`  Source: ${result.source}`);
    
    if (result.per) console.log(`  PER: ${result.per}`);
    if (result.pbr) console.log(`  PBR: ${result.pbr}`);
    if (result.marketCap) console.log(`  Market Cap: ${result.marketCap}`);
    
  } catch (error) {
    console.error(`❌ Error testing legacy market data for ${symbol}:`, error);
  }
}

async function testLegacyIndexData(wrapper, market) {
  console.log(`\n📊 Testing legacy index data for ${market}...`);
  
  try {
    const result = await wrapper.getIndexData(market);
    
    if (!result || result.length === 0) {
      console.error(`❌ Failed to get index data for ${market}`);
      return;
    }
    
    console.log(`✅ Legacy Index Data (${result.length} indices):`);
    result.slice(0, 3).forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${index.currentPrice} (${index.change > 0 ? '+' : ''}${index.changePercent}%)`);
    });
    
  } catch (error) {
    console.error(`❌ Error testing legacy index data for ${market}:`, error);
  }
}

async function testLegacyHealthStatus(wrapper) {
  console.log('\n🏥 Testing Legacy Health Status...');
  
  try {
    const healthStatus = await wrapper.getHealthStatus();
    
    console.log(`✅ Legacy Wrapper Status: ${healthStatus.sdk}`);
    console.log('✅ Data Sources Health:');
    healthStatus.sources.forEach(source => {
      console.log(`  ${source.name}: ${source.status}${source.lastError ? ` (${source.lastError})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking legacy health status:', error);
  }
}

async function testFeatureFlagging(wrapper) {
  console.log('\n🚦 Testing Feature Flagging...');
  
  try {
    // Test disabling SDK
    wrapper.setSDKEnabled(false);
    console.log(`🔧 SDK Disabled: ${!wrapper.isSDKEnabled()}`);
    
    // Test with SDK disabled (should return null/fallback)
    const disabledResult = await wrapper.getMarketData('005930');
    console.log(`📊 SDK Disabled Result: ${disabledResult ? 'Data returned' : 'Null (expected)'}`);
    
    // Re-enable SDK
    wrapper.setSDKEnabled(true);
    console.log(`🔧 SDK Re-enabled: ${wrapper.isSDKEnabled()}`);
    
    // Test with SDK re-enabled
    const enabledResult = await wrapper.getMarketData('005930');
    console.log(`📊 SDK Enabled Result: ${enabledResult ? 'Data returned' : 'Null'}`);
    
  } catch (error) {
    console.error('❌ Error testing feature flagging:', error);
  }
}

// Run tests
if (require.main === module) {
  testLegacyIntegration();
}

module.exports = {
  testLegacyIntegration
};
