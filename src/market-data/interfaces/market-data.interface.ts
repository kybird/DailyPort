/**
 * Market Data Interface Definitions
 * 
 * This file defines the core data models for market data across different asset classes.
 * All data sources should conform to these interfaces for consistency.
 */

// Asset Class Types
export type AssetClass = 'STOCK' | 'ETF' | 'CRYPTO' | 'BOND' | 'COMMODITY' | 'INDEX'

// Market Types
export type Market = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'CRYPTO' | 'GLOBAL'

// Currency Types
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'BTC' | 'ETH'

// Timeframe for Historical Data
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'

/**
 * Basic Quote Data - Real-time price information
 */
export interface QuoteData {
  // Basic Information
  symbol: string
  name: string
  assetClass: AssetClass
  market?: Market
  currency: Currency
  
  // Price Information
  price: number
  change?: number
  changePercent?: number
  
  // Volume Information
  volume?: number
  volume24h?: number // For crypto
  
  // Market Cap
  marketCap?: number
  
  // Stock-specific fields
  per?: number
  pbr?: number
  eps?: number
  high52Week?: number
  low52Week?: number
  
  // ETF-specific fields
  nav?: number // Net Asset Value
  premiumDiscount?: number // Premium/Discount percentage
  
  // Crypto-specific fields
  circulatingSupply?: number
  maxSupply?: number
  
  // Metadata
  source: string
  timestamp: string
  fetchedAt: string
}

/**
 * Historical Data Point
 */
export interface HistoricalDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose?: number // For stock splits/dividends
}

/**
 * Historical Data Response
 */
export interface HistoricalData {
  symbol: string
  assetClass: AssetClass
  timeframe: Timeframe
  data: HistoricalDataPoint[]
  source: string
  fetchedAt: string
}

/**
 * Market Index Data
 */
export interface IndexData {
  name: string
  indexClass: string
  currentPrice: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  tradingValue: number
  marketCap: number
  date: string
  source: string
  fetchedAt: string
}

/**
 * Technical Indicator Data
 */
export interface TechnicalIndicators {
  // Moving Averages
  sma?: { period: number; value: number }[]
  ema?: { period: number; value: number }[]
  
  // Momentum
  rsi?: { period: number; value: number }
  macd?: {
    macd: number
    signal: number
    histogram: number
  }
  
  // Volatility
  atr?: { period: number; value: number }
  bollingerBands?: {
    upper: number
    middle: number
    lower: number
  }
  
  // Volume
  obv?: number
  volumeSMA?: { period: number; value: number }
}

/**
 * Complete Market Data (Quote + Historical + Technical)
 */
export interface CompleteMarketData extends QuoteData {
  historical?: HistoricalData
  technical?: TechnicalIndicators
}

/**
 * Data Source Metadata
 */
export interface DataSourceMetadata {
  name: string
  version: string
  description: string
  supportedAssetClasses: AssetClass[]
  supportedMarkets: Market[]
  capabilities: DataSourceCapabilities
  rateLimits?: RateLimitInfo
  documentation?: string
}

/**
 * Data Source Capabilities
 */
export interface DataSourceCapabilities {
  realTimeQuotes: boolean
  historicalData: boolean
  technicalIndicators: boolean
  marketData: boolean
  indexData: boolean
  batchRequests: boolean
  websockets: boolean
}

/**
 * Rate Limit Information
 */
export interface RateLimitInfo {
  requestsPerSecond?: number
  requestsPerMinute?: number
  requestsPerDay?: number
  burstLimit?: number
  resetTime?: number
}

/**
 * Error Types
 */
export type MarketDataErrorType = 
  | 'NETWORK_ERROR'
  | 'API_LIMIT_EXCEEDED'
  | 'INVALID_SYMBOL'
  | 'DATA_NOT_AVAILABLE'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'UNKNOWN'

/**
 * Market Data Error
 */
export interface MarketDataError extends Error {
  type: MarketDataErrorType
  source: string
  symbol?: string
  details?: Record<string, unknown>
  retryable: boolean
}

/**
 * Search/Filter Parameters
 */
export interface SearchParams {
  query?: string
  assetClass?: AssetClass
  market?: Market
  limit?: number
  offset?: number
}

/**
 * Historical Data Parameters
 */
export interface HistoricalDataParams {
  symbol: string
  timeframe: Timeframe
  startDate?: string
  endDate?: string
  limit?: number
  adjusted?: boolean // For stock splits/dividends
}

/**
 * Batch Quote Request
 */
export interface BatchQuoteRequest {
  symbols: string[]
  assetClass?: AssetClass
  market?: Market
}

/**
 * Batch Quote Response
 */
export interface BatchQuoteResponse {
  data: QuoteData[]
  errors?: { symbol: string; error: MarketDataError }[]
  source: string
  fetchedAt: string
}
