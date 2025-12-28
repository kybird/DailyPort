/**
 * Yahoo Finance Stock Data Source
 * 
 * Implementation of IMarketDataSource for Yahoo Finance
 * Provides real-time quotes and historical data for global stocks including Korean market.
 */

import YahooFinance from 'yahoo-finance2'
import type {
  IMarketDataSource,
  HistoricalData,
  HistoricalDataParams,
  MarketDataError,
  AssetClass,
  Market,
  IHttpClient,
  RequestOptions,
  HttpResponse
} from '../interfaces/data-source.interface'
import type {
  QuoteData,
  Market as MarketType,
  Currency,
  Timeframe,
  DataSourceMetadata,
  MarketDataErrorType,
  DataSourceCapabilities,
  RateLimitInfo,
  HistoricalDataPoint
} from '../interfaces/market-data.interface'

/**
 * Yahoo-specific configuration
 */
export interface YahooStockConfig {
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  suppressNotices?: ('ripHistorical' | 'yahooSurvey')[]
}

/**
 * Yahoo Finance Stock Data Source
 */
export class YahooStockDataSource implements IMarketDataSource {
  readonly name = 'YAHOO_STOCK'
  readonly metadata: DataSourceMetadata

  private config: YahooStockConfig
  private yahooFinance: unknown // eslint-disable-line @typescript-eslint/no-explicit-any
  private connected = false

  constructor(config: YahooStockConfig = {}) {
    this.config = {
      timeout: 15000,
      maxRetries: 3,
      retryDelay: 1000,
      suppressNotices: ['ripHistorical', 'yahooSurvey'],
      ...config
    }

    this.metadata = {
      name: this.name,
      version: '1.0.0',
      description: 'Yahoo Finance data source for global stocks',
      supportedAssetClasses: ['STOCK', 'ETF'],
      supportedMarkets: ['KOSPI', 'KOSDAQ', 'GLOBAL'],
      capabilities: {
        realTimeQuotes: true,
        historicalData: true,
        technicalIndicators: false,
        marketData: false,
        indexData: false,
        batchRequests: false,
        websockets: false
      },
      rateLimits: {
        requestsPerSecond: 2, // Yahoo Finance is more lenient than Naver
        requestsPerMinute: 100,
        requestsPerDay: 2000
      }
    }

    // Initialize Yahoo Finance client
    this.yahooFinance = new YahooFinance({ 
      suppressNotices: this.config.suppressNotices 
    })
  }

  /**
   * Connect to Yahoo Finance
   */
  async connect(): Promise<void> {
    try {
      // Test connection with a simple request
      const yahooClient = this.yahooFinance as { quote: (symbol: string) => Promise<unknown> }
      await yahooClient.quote('AAPL')
      this.connected = true
      console.log(`[YAHOO_STOCK] Connected to Yahoo Finance`)
    } catch (error) {
      throw this.createError('NETWORK_ERROR', 'Failed to connect to Yahoo Finance', error)
    }
  }

  /**
   * Disconnect from Yahoo Finance
   */
  async disconnect(): Promise<void> {
    this.connected = false
    console.log(`[YAHOO_STOCK] Disconnected from Yahoo Finance`)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Check if data source is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.connected) return false

    try {
      // Test with a simple request to a major stock
      const yahooClient = this.yahooFinance as { quote: (symbol: string) => Promise<unknown> }
      const quote = await yahooClient.quote('AAPL')
      const quoteData = quote as { regularMarketPrice?: number }
      return quoteData.regularMarketPrice !== undefined
    } catch (error) {
      console.error(`[YAHOO_STOCK] Health check failed:`, error)
      return false
    }
  }

  /**
   * Get quote data for a stock symbol
   */
  async getQuote(symbol: string): Promise<QuoteData | MarketDataError> {
    if (!this.connected) {
      throw this.createError('NETWORK_ERROR', 'Not connected to Yahoo Finance')
    }

    if (!this.supports(symbol)) {
      throw this.createError('INVALID_SYMBOL', `Symbol ${symbol} not supported`)
    }

    try {
      const transformedSymbol = this.transformSymbol(symbol)
      const quote = await this.fetchQuoteWithFallback(transformedSymbol)

      if (!quote) {
        throw this.createError('DATA_NOT_AVAILABLE', `No data found for ${symbol}`)
      }

      // Type assertion for Yahoo Finance response
      const yahooQuote = quote as {
        shortName?: string
        longName?: string
        quoteType?: string
        currency?: string
        regularMarketPrice?: number
        regularMarketChange?: number
        regularMarketChangePercent?: number
        trailingPE?: number
        priceToBook?: number
        epsTrailingTwelveMonths?: number
        fiftyTwoWeekHigh?: number
        fiftyTwoWeekLow?: number
        marketCap?: number
      }

      const quoteData: QuoteData = {
        symbol,
        name: yahooQuote.shortName || yahooQuote.longName || symbol,
        assetClass: yahooQuote.quoteType === 'ETF' ? 'ETF' : 'STOCK',
        market: this.detectMarket(symbol),
        currency: (yahooQuote.currency as Currency) || 'USD',
        price: yahooQuote.regularMarketPrice || 0,
        change: yahooQuote.regularMarketChange,
        changePercent: yahooQuote.regularMarketChangePercent,
        per: yahooQuote.trailingPE,
        pbr: yahooQuote.priceToBook,
        eps: yahooQuote.epsTrailingTwelveMonths,
        high52Week: yahooQuote.fiftyTwoWeekHigh,
        low52Week: yahooQuote.fiftyTwoWeekLow,
        marketCap: yahooQuote.marketCap,
        source: this.name,
        timestamp: new Date().toISOString(),
        fetchedAt: new Date().toISOString()
      }

      console.log(`[YAHOO_STOCK] Fetched quote for ${symbol} (${quoteData.name}): ${quoteData.price} ${quoteData.currency}`)
      return quoteData

    } catch (error) {
      console.error(`[YAHOO_STOCK] Error fetching quote for ${symbol}:`, error)
      return this.createError('NETWORK_ERROR', `Failed to fetch Yahoo data for ${symbol}`, error)
    }
  }

  /**
   * Get batch quotes
   */
  async getBatchQuotes(request: { symbols: string[] }): Promise<{ data: QuoteData[]; errors: Array<{ symbol: string; error: MarketDataError }>; source: string; fetchedAt: string }> {
    const data: QuoteData[] = []
    const errors: Array<{ symbol: string; error: MarketDataError }> = []

    // Yahoo Finance doesn't have a reliable batch API, so we'll make individual requests
    for (const symbol of request.symbols) {
      try {
        const quote = await this.getQuote(symbol)
        if (quote instanceof Error) {
          errors.push({ symbol, error: quote })
        } else {
          data.push(quote)
        }
      } catch (error) {
        errors.push({ symbol, error: this.createError('NETWORK_ERROR', `Failed to fetch ${symbol}`, error) })
      }
    }

    return { 
      data, 
      errors,
      source: this.name,
      fetchedAt: new Date().toISOString()
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(params: HistoricalDataParams): Promise<HistoricalData | MarketDataError> {
    if (!this.connected) {
      throw this.createError('NETWORK_ERROR', 'Not connected to Yahoo Finance')
    }

    if (!this.supports(params.symbol)) {
      throw this.createError('INVALID_SYMBOL', `Symbol ${params.symbol} not supported`)
    }

    try {
      const transformedSymbol = this.transformSymbol(params.symbol)
      const endDate = params.endDate || new Date().toISOString().split('T')[0]
      const startDate = params.startDate || this.getStartDate(params.timeframe, params.limit || 300)

      const chartResult = await this.fetchChartWithFallback(transformedSymbol, {
        period1: startDate,
        period2: endDate,
        interval: this.mapTimeframe(params.timeframe)
      })

      // Type assertion for chart response
      const chartData = chartResult as {
        quotes?: Array<{
          date: Date | string
          open?: number
          high?: number
          low?: number
          close?: number
          volume?: number
        }>
      }

      if (!chartData || !chartData.quotes) {
        throw this.createError('DATA_NOT_AVAILABLE', `No historical data found for ${params.symbol}`)
      }

      const historicalData: HistoricalDataPoint[] = chartData.quotes
        .filter((q) => q.close !== null && q.close !== undefined)
        .map((q) => ({
          date: new Date(q.date).toISOString(),
          open: q.open as number,
          high: q.high as number,
          low: q.low as number,
          close: q.close as number,
          volume: (q.volume as number) || 0
        }))

      const historicalDataResponse: HistoricalData = {
        symbol: params.symbol,
        assetClass: 'STOCK',
        timeframe: params.timeframe,
        data: historicalData,
        source: this.name,
        fetchedAt: new Date().toISOString()
      }

      console.log(`[YAHOO_STOCK] Fetched ${historicalData.length} historical data points for ${params.symbol}`)
      return historicalDataResponse

    } catch (error) {
      console.error(`[YAHOO_STOCK] Error fetching historical data for ${params.symbol}:`, error)
      return this.createError('NETWORK_ERROR', `Failed to fetch historical data for ${params.symbol}`, error)
    }
  }

  /**
   * Check if symbol is supported
   */
  supports(symbol: string, assetClass?: AssetClass): boolean {
    if (assetClass && assetClass !== 'STOCK' && assetClass !== 'ETF') {
      return false
    }

    // Support Korean 6-digit symbols and global symbols
    return /^\d{6}$/.test(symbol) || /^[A-Z]{1,5}$/.test(symbol) || /^[A-Z]{1,5}\.[A-Z]{1,3}$/.test(symbol)
  }

  /**
   * Transform symbol for Yahoo Finance
   */
  private transformSymbol(symbol: string): string {
    // Auto-append suffix for Korean 6-character tickers
    if (/^\d{6}$/.test(symbol) && !symbol.includes('.')) {
      return `${symbol}.KS` // Default to KOSPI
    }
    return symbol
  }

  /**
   * Detect market from symbol
   */
  private detectMarket(symbol: string): Market {
    if (/^\d{6}$/.test(symbol)) {
      const numSymbol = parseInt(symbol)
      if (numSymbol >= 100000) return 'KOSDAQ'
      return 'KOSPI'
    }
    return 'GLOBAL'
  }

  /**
   * Fetch quote with KOSPI/KOSDAQ fallback
   */
  private async fetchQuoteWithFallback(symbol: string): Promise<unknown> {
    try {
      const yahooClient = this.yahooFinance as { quote: (symbol: string) => Promise<unknown> }
      return await yahooClient.quote(symbol)
    } catch (error) {
      // Try alternative market suffixes
      if (symbol.endsWith('.KS')) {
        const kqSymbol = symbol.replace('.KS', '.KQ')
        try {
          console.log(`[YAHOO_STOCK] Trying KOSDAQ fallback: ${kqSymbol}`)
          const yahooClient = this.yahooFinance as { quote: (symbol: string) => Promise<unknown> }
          return await yahooClient.quote(kqSymbol)
        } catch {
          throw error // Re-throw original error
        }
      } else if (symbol.endsWith('.KQ')) {
        const ksSymbol = symbol.replace('.KQ', '.KS')
        try {
          console.log(`[YAHOO_STOCK] Trying KOSPI fallback: ${ksSymbol}`)
          const yahooClient = this.yahooFinance as { quote: (symbol: string) => Promise<unknown> }
          return await yahooClient.quote(ksSymbol)
        } catch {
          throw error // Re-throw original error
        }
      }
      throw error
    }
  }

  /**
   * Fetch chart data with KOSPI/KOSDAQ fallback
   */
  private async fetchChartWithFallback(symbol: string, options: Record<string, unknown>): Promise<unknown> {
    try {
      const yahooClient = this.yahooFinance as { chart: (symbol: string, options: unknown) => Promise<unknown> }
      return await yahooClient.chart(symbol, options)
    } catch (error) {
      // Try alternative market suffixes
      if (symbol.endsWith('.KS')) {
        const kqSymbol = symbol.replace('.KS', '.KQ')
        try {
          console.log(`[YAHOO_STOCK] Trying KOSDAQ fallback for chart: ${kqSymbol}`)
          const yahooClient = this.yahooFinance as { chart: (symbol: string, options: unknown) => Promise<unknown> }
          return await yahooClient.chart(kqSymbol, options)
        } catch {
          throw error // Re-throw original error
        }
      } else if (symbol.endsWith('.KQ')) {
        const ksSymbol = symbol.replace('.KQ', '.KS')
        try {
          console.log(`[YAHOO_STOCK] Trying KOSPI fallback for chart: ${ksSymbol}`)
          const yahooClient = this.yahooFinance as { chart: (symbol: string, options: unknown) => Promise<unknown> }
          return await yahooClient.chart(ksSymbol, options)
        } catch {
          throw error // Re-throw original error
        }
      }
      throw error
    }
  }

  /**
   * Map timeframe for Yahoo Finance API
   */
  private mapTimeframe(timeframe: Timeframe): string {
    const timeframeMap: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '1d', // Yahoo doesn't support 4h, fallback to daily
      '1d': '1d',
      '1w': '1wk',
      '1M': '1mo'
    }
    return timeframeMap[timeframe] || '1d'
  }

  /**
   * Get start date for historical data
   */
  private getStartDate(timeframe: Timeframe, days: number): string {
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(startDate.getDate() - days)
        break
      case '1w':
        startDate.setDate(startDate.getDate() - (days * 7))
        break
      case '1M':
        startDate.setMonth(startDate.getMonth() - days)
        break
      default:
        startDate.setDate(startDate.getDate() - days)
    }

    return startDate.toISOString().split('T')[0]
  }

  /**
   * Create market data error
   */
  private createError(type: MarketDataErrorType, message: string, originalError?: unknown): MarketDataError {
    const error = new Error(message) as MarketDataError
    error.type = type
    error.source = this.name
    error.details = originalError ? { originalError } : undefined
    error.retryable = type !== 'INVALID_SYMBOL' && type !== 'DATA_NOT_AVAILABLE'
    return error
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<{ remaining: number; resetTime: number; limit: number } | null> {
    // Yahoo Finance doesn't provide rate limit information
    return null
  }

  /**
   * Get HTTP client (not used for Yahoo Finance)
   */
  getHttpClient(): IHttpClient {
    throw new Error('HTTP client not used for Yahoo Finance data source')
  }
}
