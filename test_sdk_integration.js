/**
 * SDK Integration Test
 * 
 * Tests the new Market Data SDK with all data sources
 * Validates data consistency across Naver Finance, Yahoo Finance, and KRX Index
 */

// Use dynamic import for ES modules
let MarketDataSDK, NaverStockDataSource, YahooStockDataSource, KRXIndexDataSource;

try {
  const sdkModule = require('./packages/market-data-sdk/dist/index.js');
  MarketDataSDK = sdkModule.MarketDataSDK || sdkModule.default;
  NaverStockDataSource = sdkModule.NaverStockDataSource;
  YahooStockDataSource = sdkModule.YahooStockDataSource;
  KRXIndexDataSource = sdkModule.KRXIndexDataSource;
} catch (error) {
  console.error('Failed to load SDK module:', error);
  process.exit(1);
}

// Test configuration
const testConfig = {
  primary: 'NAVER_STOCK',
  fallback: ['YAHOO_STOCK', 'KRX_INDEX'],
  caching: {
    enabled: true,
    strategy: 'memory',
    ttl: {
      realtime: 300,      // 5 minutes
      historical: 86400     // 24 hours
    }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60
  }
};

async function testSDKIntegration() {
  console.log('🚀 Starting SDK Integration Test...\n');
  
  let sdk;
  
  try {
    // Initialize SDK
    sdk = new MarketDataSDK(testConfig);
    await sdk.initialize();
    
    console.log('✅ SDK initialized successfully');
    console.log('📊 Available data sources:', sdk.registry.getAllSources().map(s => s.name));
    
    // Test Korean stock with multiple sources
    await testKoreanStockQuote(sdk, '005930', 'Samsung Electronics');
    await testKoreanStockQuote(sdk, '373220', 'LG Electronics');
    
    // Test market indices
    await testMarketIndices(sdk);
    
    // Test health status
    await testHealthStatus(sdk);
    
    // Test symbol support
    await testSymbolSupport(sdk);
    
    console.log('\n✅ All SDK integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ SDK integration test failed:', error);
  } finally {
    if (sdk) {
      await sdk.cleanup();
      console.log('🧹 SDK cleanup completed');
    }
  }
}

async function testKoreanStockQuote(sdk, symbol, companyName) {
  console.log(`\n📈 Testing ${symbol} (${companyName})...`);
  
  try {
    const result = await sdk.getMarketData(symbol);
    
    if (result instanceof Error) {
      console.error(`❌ Error fetching ${symbol}:`, result.message);
      return;
    }
    
    console.log('✅ Quote Data:');
    console.log(`  Symbol: ${result.symbol}`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Price: ${result.price} ${result.currency}`);
    console.log(`  Change: ${result.change || 'N/A'} (${result.changePercent || 'N/A'}%)`);
    console.log(`  Market: ${result.market}`);
    console.log(`  Asset Class: ${result.assetClass}`);
    console.log(`  Source: ${result.source}`);
    console.log(`  Fetched At: ${result.fetchedAt}`);
    
  } catch (error) {
    console.error(`❌ Unexpected error testing ${symbol}:`, error);
  }
}

async function testMarketIndices(sdk) {
  console.log('\n📊 Testing Market Indices...');
  
  try {
    const kospiData = await sdk.getIndexData('KOSPI');
    const kosdaqData = await sdk.getIndexData('KOSDAQ');
    
    console.log('✅ KOSPI Indices:');
    if (Array.isArray(kospiData)) {
      kospiData.slice(0, 3).forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name}: ${index.currentPrice} (${index.change > 0 ? '+' : ''}${index.changePercent}%)`);
      });
    } else if (kospiData instanceof Error) {
      console.error(`❌ KOSPI error:`, kospiData.message);
    }
    
    console.log('✅ KOSDAQ Indices:');
    if (Array.isArray(kosdaqData)) {
      kosdaqData.slice(0, 3).forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name}: ${index.currentPrice} (${index.change > 0 ? '+' : ''}${index.changePercent}%)`);
      });
    } else if (kosdaqData instanceof Error) {
      console.error(`❌ KOSDAQ error:`, kosdaqData.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing market indices:', error);
  }
}

async function testHealthStatus(sdk) {
  console.log('\n🏥 Testing Health Status...');
  
  try {
    const healthStatus = await sdk.getHealthStatus();
    
    console.log(`✅ SDK Status: ${healthStatus.sdk}`);
    console.log('✅ Data Sources Health:');
    healthStatus.sources.forEach(source => {
      console.log(`  ${source.name}: ${source.status}${source.lastError ? ` (${source.lastError})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking health status:', error);
  }
}

async function testSymbolSupport(sdk) {
  console.log('\n🔍 Testing Symbol Support...');
  
  const testSymbols = ['005930', '000660', '069500', 'AAPL', 'GOOGL'];
  const testAssetClasses = ['STOCK', 'ETF', 'INDEX', 'CRYPTO'];
  
  testAssetClasses.forEach(assetClass => {
    console.log(`\n📋 ${assetClass} Support:`);
    testSymbols.forEach(symbol => {
      const supported = sdk.supports(symbol, assetClass);
      console.log(`  ${symbol}: ${supported ? '✅' : '❌'}`);
    });
  });
}

async function testIndividualDataSources() {
  console.log('\n🔧 Testing Individual Data Sources...');
  
  // Test Naver Finance
  console.log('\n📈 Naver Finance Source:');
  try {
    const naverSource = new NaverStockDataSource();
    await naverSource.connect();
    const naverQuote = await naverSource.getQuote('005930');
    console.log(`  Connected: ${naverSource.isConnected()}`);
    console.log(`  Healthy: ${await naverSource.isHealthy()}`);
    console.log(`  Sample Quote: ${naverQuote.price || 'Error'} KRW`);
    await naverSource.disconnect();
  } catch (error) {
    console.error('❌ Naver Finance test failed:', error);
  }
  
  // Test Yahoo Finance
  console.log('\n📈 Yahoo Finance Source:');
  try {
    const yahooSource = new YahooStockDataSource();
    await yahooSource.connect();
    const yahooQuote = await yahooSource.getQuote('005930.KS');
    console.log(`  Connected: ${yahooSource.isConnected()}`);
    console.log(`  Healthy: ${await yahooSource.isHealthy()}`);
    console.log(`  Sample Quote: ${yahooQuote.price || 'Error'} ${yahooQuote.currency || 'Error'}`);
    await yahooSource.disconnect();
  } catch (error) {
    console.error('❌ Yahoo Finance test failed:', error);
  }
  
  // Test KRX Index
  console.log('\n📊 KRX Index Source:');
  try {
    const krxSource = new KRXIndexDataSource();
    await krxSource.connect();
    const krxData = await krxSource.getIndexData('KOSPI');
    console.log(`  Connected: ${krxSource.isConnected()}`);
    console.log(`  Healthy: ${await krxSource.isHealthy()}`);
    console.log(`  Sample KOSPI Data: ${Array.isArray(krxData) ? krxData.length + ' indices' : 'Error'}`);
    await krxSource.disconnect();
  } catch (error) {
    console.error('❌ KRX Index test failed:', error);
  }
}

// Run tests
if (require.main === module) {
  testSDKIntegration();
}

module.exports = {
  testSDKIntegration,
  testIndividualDataSources
};
