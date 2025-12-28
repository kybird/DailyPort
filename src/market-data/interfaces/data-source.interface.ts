/**
 * Data Source Interface Definitions
 * 
 * This file defines the core interfaces that all data source implementations must follow.
 * This ensures consistency across different data sources and enables easy switching.
 */

import type {
  QuoteData,
  HistoricalData,
  IndexData,
  BatchQuoteRequest,
  BatchQuoteResponse,
  HistoricalDataParams,
  SearchParams,
  DataSourceMetadata,
  MarketDataError,
  Market,
  AssetClass
} from './market-data.interface'

// Re-export types that are used by other modules
export type {
  DataSourceMetadata,
  MarketDataError,
  Market,
  AssetClass,
  BatchQuoteRequest,
  BatchQuoteResponse,
  HistoricalDataParams,
  HistoricalData
} from './market-data.interface'

/**
 * Core Data Source Interface
 * 
 * All data source implementations must implement this interface.
 * This provides a unified way to access market data from different sources.
 */
export interface IMarketDataSource {
  // Basic Information
  readonly name: string
  readonly metadata: DataSourceMetadata
  
  // Lifecycle Management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  // Health Check
  isHealthy(): Promise<boolean>
  
  // Core Data Operations
  getQuote(symbol: string): Promise<QuoteData | MarketDataError>
  getBatchQuotes(request: BatchQuoteRequest): Promise<BatchQuoteResponse>
  getHistoricalData(params: HistoricalDataParams): Promise<HistoricalData | MarketDataError>
  
  // Optional Operations (based on capabilities)
  getIndexData?(market: Market): Promise<IndexData[] | MarketDataError>
  search?(params: SearchParams): Promise<QuoteData[] | MarketDataError>
  
  // Utility Methods
  supports(symbol: string, assetClass?: AssetClass): boolean
  getSupportedSymbols?(market?: Market, assetClass?: AssetClass): Promise<string[]>
  
  // Rate Limit Management
  getRateLimitInfo?(): Promise<{
    remaining: number
    resetTime: number
    limit: number
  } | null>
}

/**
 * Data Source Configuration
 */
export interface DataSourceConfig {
  name: string
  enabled: boolean
  priority: number // Lower number = higher priority
  
  // Authentication
  apiKey?: string
  apiSecret?: string
  baseUrl?: string
  
  // Rate Limiting
  rateLimit?: {
    requestsPerSecond?: number
    requestsPerMinute?: number
    requestsPerDay?: number
  }
  
  // Timeout & Retry
  timeout?: number // in milliseconds
  maxRetries?: number
  retryDelay?: number // in milliseconds
  
  // Caching
  cache?: {
    enabled: boolean
    ttl: number // in seconds
  }
  
  // Source-specific settings
  settings?: Record<string, unknown>
}

/**
 * Data Source Manager Configuration
 */
export interface DataSourceManagerConfig {
  // Primary Data Source
  primary: string
  
  // Fallback Data Sources (in order of priority)
  fallback: string[]
  
  // Global Settings
  timeout?: number
  maxRetries?: number
  
  // Caching Strategy
  caching: {
    enabled: boolean
    strategy: 'memory' | 'redis' | 'supabase'
    ttl: {
      realtime: number // seconds
      historical: number // seconds
    }
  }
  
  // Monitoring
  monitoring: {
    enabled: boolean
    metricsInterval: number // seconds
  }
}

/**
 * Cache Interface
 */
export interface IMarketDataCache {
  // Quote Cache
  getQuote(symbol: string): Promise<QuoteData | null>
  setQuote(symbol: string, data: QuoteData, ttl?: number): Promise<void>
  deleteQuote(symbol: string): Promise<void>
  
  // Historical Data Cache
  getHistoricalData(key: string): Promise<HistoricalData | null>
  setHistoricalData(key: string, data: HistoricalData, ttl?: number): Promise<void>
  deleteHistoricalData(key: string): Promise<void>
  
  // Batch Cache Operations
  getBatchQuotes(symbols: string[]): Promise<(QuoteData | null)[]>
  setBatchQuotes(quotes: QuoteData[], ttl?: number): Promise<void>
  
  // Cache Management
  clear(): Promise<void>
  size(): Promise<number>
  
  // Health
  isHealthy(): Promise<boolean>
}

/**
 * HTTP Client Interface
 * 
 * Standardized HTTP client for data sources to use.
 * This helps with consistent error handling, retries, and rate limiting.
 */
export interface IHttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>
  post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>
  
  // Request configuration
  setDefaultTimeout(timeout: number): void
  setDefaultHeaders(headers: Record<string, string>): void
  
  // Rate limiting
  setRateLimit(requestsPerSecond: number): void
}

/**
 * HTTP Request Options
 */
export interface RequestOptions {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  signal?: AbortSignal
}

/**
 * HTTP Response
 */
export interface HttpResponse<T> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
}

/**
 * Data Source Factory Interface
 * 
 * Factory for creating and managing data source instances.
 */
export interface IDataSourceFactory {
  // Registration
  register(sourceClass: new (config: DataSourceConfig) => IMarketDataSource): void
  
  // Creation
  create(name: string, config: DataSourceConfig): IMarketDataSource
  
  // Discovery
  getAvailableSources(): string[]
  getSourceMetadata(name: string): DataSourceMetadata
  
  // Management
  setDefaultConfig(config: Partial<DataSourceConfig>): void
  getDefaultConfig(): Partial<DataSourceConfig>
}

/**
 * Data Source Registry
 * 
 * Registry for managing multiple data sources and their configurations.
 */
export interface IDataSourceRegistry {
  // Registration
  registerSource(source: IMarketDataSource): void
  unregisterSource(name: string): void
  
  // Retrieval
  getSource(name: string): IMarketDataSource | null
  getAllSources(): IMarketDataSource[]
  getSourcesByAssetClass(assetClass: AssetClass): IMarketDataSource[]
  
  // Priority Management
  setPriority(name: string, priority: number): void
  getPrimarySource(assetClass?: AssetClass): IMarketDataSource | null
  getFallbackSources(assetClass?: AssetClass): IMarketDataSource[]
  
  // Health
  getHealthySources(): IMarketDataSource[]
  isAnySourceHealthy(): Promise<boolean>
}

/**
 * Event Emitter Interface
 * 
 * For emitting events from data sources (rate limits, errors, etc.).
 */
export interface IEventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): void
  off(event: string, listener: (...args: unknown[]) => void): void
  emit(event: string, ...args: unknown[]): void
  
  // Once
  once(event: string, listener: (...args: unknown[]) => void): void
  
  // Remove all listeners
  removeAllListeners(event?: string): void
}

/**
 * Data Source Events
 */
export type DataSourceEvents = {
  'connected': (source: string) => void
  'disconnected': (source: string) => void
  'error': (source: string, error: MarketDataError) => void
  'rate-limit': (source: string, info: { resetTime: number; limit: number }) => void
  'data-fetched': (source: string, symbol: string, dataType: string) => void
  'cache-hit': (symbol: string, dataType: string) => void
  'cache-miss': (symbol: string, dataType: string) => void
}

/**
 * Metrics Interface
 * 
 * For collecting performance and usage metrics.
 */
export interface IMetricsCollector {
  // Counters
  incrementCounter(name: string, tags?: Record<string, string>): void
  setGauge(name: string, value: number, tags?: Record<string, string>): void
  
  // Histograms
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void
  
  // Timing
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void
  
  // Flushing
  flush(): Promise<void>
}
