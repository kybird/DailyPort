/**
 * Market Data SDK - Main Entry Point
 * 
 * This is the main entry point for Market Data SDK.
 * It exports all the core interfaces, adapters, and utilities.
 */

// Import all types first to avoid circular dependencies
import type {
  AssetClass,
  Market,
  Currency,
  Timeframe,
  QuoteData,
  HistoricalData,
  HistoricalDataPoint,
  IndexData,
  TechnicalIndicators,
  CompleteMarketData,
  DataSourceMetadata,
  DataSourceCapabilities,
  RateLimitInfo,
  MarketDataError,
  MarketDataErrorType,
  SearchParams,
  HistoricalDataParams,
  BatchQuoteRequest,
  BatchQuoteResponse
} from './interfaces/market-data.interface'

import type {
  IMarketDataSource,
  IDataSourceFactory,
  IDataSourceRegistry,
  IMarketDataCache,
  IHttpClient,
  IEventEmitter,
  IMetricsCollector,
  DataSourceConfig,
  DataSourceManagerConfig,
  RequestOptions,
  HttpResponse,
  DataSourceEvents
} from './interfaces/data-source.interface'

// Legacy adapters removed for initial integration
// import {
//   LegacyMarketData,
//   LegacyIndexData,
//   LegacyDataSourceWrapper,
//   getLegacyWrapper,
//   initializeLegacyWrapper,
//   cleanupLegacyWrapper
// } from './adapters/legacy-wrapper'

// import {
//   LegacyMarketDataAdapter
// } from './adapters/legacy-adapter'

import { NaverStockDataSource } from './data-sources/naver-stock-source'
import { YahooStockDataSource } from './data-sources/yahoo-stock-source'
import { KRXIndexDataSource } from './data-sources/krx-index-source'

// Export all types
export type {
  AssetClass,
  Market,
  Currency,
  Timeframe,
  QuoteData,
  HistoricalData,
  HistoricalDataPoint,
  IndexData,
  TechnicalIndicators,
  CompleteMarketData,
  DataSourceMetadata,
  DataSourceCapabilities,
  RateLimitInfo,
  MarketDataError,
  MarketDataErrorType,
  SearchParams,
  HistoricalDataParams,
  BatchQuoteRequest,
  BatchQuoteResponse,
  IMarketDataSource,
  IDataSourceFactory,
  IDataSourceRegistry,
  IMarketDataCache,
  IHttpClient,
  IEventEmitter,
  IMetricsCollector,
  DataSourceConfig,
  DataSourceManagerConfig,
  RequestOptions,
  HttpResponse,
  DataSourceEvents
}

// Export legacy types with aliases to avoid conflicts
// export type { LegacyMarketData as LegacyMarketDataType, LegacyIndexData as LegacyIndexDataType }

// Export data source classes
export { NaverStockDataSource, YahooStockDataSource, KRXIndexDataSource }

// Export classes
// export { LegacyMarketDataAdapter, LegacyDataSourceWrapper, getLegacyWrapper, initializeLegacyWrapper, cleanupLegacyWrapper }

// Version Information
export const SDK_VERSION = '1.0.0'
export const SDK_NAME = '@dailyport/market-data-sdk'

/**
 * Simple in-memory data source registry implementation
 */
class SimpleDataSourceRegistry implements IDataSourceRegistry {
  private sources = new Map<string, IMarketDataSource>()

  registerSource(source: IMarketDataSource): void {
    this.sources.set(source.name, source)
    console.log(`[REGISTRY] Registered data source: ${source.name}`)
  }

  unregisterSource(name: string): void {
    this.sources.delete(name)
    console.log(`[REGISTRY] Unregistered data source: ${name}`)
  }

  getSource(name: string): IMarketDataSource | null {
    return this.sources.get(name) || null
  }

  getAllSources(): IMarketDataSource[] {
    return Array.from(this.sources.values())
  }

  getSourcesByAssetClass(assetClass: AssetClass): IMarketDataSource[] {
    return Array.from(this.sources.values()).filter(source => 
      source.metadata.supportedAssetClasses.includes(assetClass)
    )
  }

  setPriority(name: string, priority: number): void {
    const source = this.sources.get(name)
    if (source) {
      // Note: In this simple implementation, priority is handled by the order of sources
      console.log(`[REGISTRY] Set priority for ${name}: ${priority}`)
    }
  }

  getPrimarySource(assetClass?: AssetClass): IMarketDataSource | null {
    const sources = assetClass 
      ? this.getSourcesByAssetClass(assetClass)
      : this.getAllSources()
    
    // Return the first source (highest priority)
    return sources.length > 0 ? sources[0] : null
  }

  getFallbackSources(assetClass?: AssetClass): IMarketDataSource[] {
    const sources = assetClass 
      ? this.getSourcesByAssetClass(assetClass)
      : this.getAllSources()
    
    // Return all sources except the first one (fallback sources)
    return sources.slice(1)
  }

  getHealthySources(): IMarketDataSource[] {
    const healthySources: IMarketDataSource[] = []
    
    for (const source of this.sources.values()) {
      // For now, assume all sources are healthy if they're connected
      // In a real implementation, this would check actual health
      if (source.isConnected()) {
        healthySources.push(source)
      }
    }
    
    return healthySources
  }

  async isAnySourceHealthy(): Promise<boolean> {
    const healthySources = this.getHealthySources()
    return healthySources.length > 0
  }
}

/**
 * Main SDK Class
 * 
 * This is the primary interface for using Market Data SDK.
 * It provides a simplified API for accessing market data from various sources.
 */
export class MarketDataSDK {
  private config: DataSourceManagerConfig
  private registry: IDataSourceRegistry
  private cache?: IMarketDataCache

  constructor(config: DataSourceManagerConfig) {
    this.config = config
    this.registry = new SimpleDataSourceRegistry()
  }

  /**
   * Initialize SDK
   */
  async initialize(): Promise<void> {
    console.log(`${SDK_NAME} v${SDK_VERSION} initializing...`)
    
    // Register built-in data sources
    await this.registerBuiltInSources()
    
    // Initialize cache based on configuration
    // TODO: Initialize cache based on config.caching.strategy
    
    console.log('SDK initialized successfully')
  }

  /**
   * Register built-in data sources
   */
  private async registerBuiltInSources(): Promise<void> {
    try {
      // Register Naver Finance (primary for Korean stocks)
      const naverSource = new NaverStockDataSource()
      await naverSource.connect()
      this.registry.registerSource(naverSource)
      
      // Register Yahoo Finance (fallback)
      const yahooSource = new YahooStockDataSource()
      await yahooSource.connect()
      this.registry.registerSource(yahooSource)
      
      // Register KRX Index (for market indices) - handle connection failure gracefully
      try {
        const krxSource = new KRXIndexDataSource()
        await krxSource.connect()
        this.registry.registerSource(krxSource)
      } catch (krxError) {
        console.warn('[SDK] KRX Index source failed to connect, continuing without it:', krxError instanceof Error ? krxError.message : krxError)
      }
      
      console.log('[SDK] Built-in data sources registered successfully')
    } catch (error) {
      console.error('[SDK] Failed to register built-in data sources:', error)
      throw error
    }
  }

  /**
   * Get market data for a single symbol
   */
  async getMarketData(symbol: string): Promise<QuoteData | MarketDataError> {
    const primarySource = this.registry.getPrimarySource()
    if (!primarySource) {
      return {
        type: 'DATA_NOT_AVAILABLE',
        message: 'No data source available',
        source: 'SDK',
        name: 'NoDataSourceError',
        retryable: false
      }
    }

    try {
      return await primarySource.getQuote(symbol)
    } catch (error) {
      // Try fallback sources
      const fallbackSources = this.registry.getFallbackSources()
      for (const fallbackSource of fallbackSources) {
        try {
          return await fallbackSource.getQuote(symbol)
        } catch (fallbackError) {
          continue
        }
      }
      
      return {
        type: 'DATA_NOT_AVAILABLE',
        message: `Failed to fetch data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: primarySource.name,
        name: 'DataFetchError',
        retryable: true
      }
    }
  }

  /**
   * Get batch market data for multiple symbols
   */
  async getBatchMarketData(symbols: string[]): Promise<BatchQuoteResponse> {
    // TODO: Implement batch processing
    throw new Error('Not implemented yet')
  }



  /**
   * Get index data
   */
  async getIndexData(market: Market): Promise<IndexData[] | MarketDataError> {
    // Try KRX Index source first for Korean markets
    if (market === 'KOSPI' || market === 'KOSDAQ') {
      const krxSource = this.registry.getSource('KRX_INDEX')
      if (krxSource && krxSource.isConnected() && krxSource.getIndexData) {
        try {
          return await krxSource.getIndexData(market)
        } catch (error) {
          console.warn(`[SDK] KRX Index source failed for ${market}:`, error)
        }
      }
    }

    // Fallback to other sources or return error
    return {
      type: 'DATA_NOT_AVAILABLE',
      message: `Index data not available for market: ${market}`,
      source: 'SDK',
      name: 'IndexNotImplementedError',
      retryable: false
    }
  }

  /**
   * Search for symbols
   */
  async search(params: SearchParams): Promise<QuoteData[] | MarketDataError> {
    // TODO: Implement search functionality
    throw new Error('Not implemented yet')
  }

  /**
   * Check if a symbol is supported
   */
  supports(symbol: string, assetClass?: AssetClass): boolean {
    // TODO: Implement symbol support checking
    return false
  }

  /**
   * Get SDK configuration
   */
  getConfig(): DataSourceManagerConfig {
    return { ...this.config }
  }

  /**
   * Get SDK health status
   */
  async getHealthStatus(): Promise<{
    sdk: 'healthy' | 'unhealthy'
    sources: Array<{
      name: string
      status: 'healthy' | 'unhealthy'
      lastError?: string
    }>
  }> {
    // TODO: Implement health checking
    return {
      sdk: 'healthy',
      sources: []
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // TODO: Implement cleanup
    console.log('SDK cleanup completed')
  }
}

// Default export for backward compatibility
export default MarketDataSDK

// Utility functions
export const createMarketDataSDK = (config: DataSourceManagerConfig): MarketDataSDK => {
  return new MarketDataSDK(config)
}
