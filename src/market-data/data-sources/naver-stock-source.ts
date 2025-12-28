/**
 * Naver Finance Stock Data Source
 * 
 * Implementation of IMarketDataSource for Naver Finance
 * Provides real-time quotes and historical data for Korean stocks.
 */

import * as cheerio from 'cheerio'
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
 * Naver-specific configuration
 */
export interface NaverStockConfig {
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  userAgent?: string
}

/**
 * Naver Finance Stock Data Source
 */
export class NaverStockDataSource implements IMarketDataSource {
  readonly name = 'NAVER_STOCK'
  readonly metadata: DataSourceMetadata

  private config: NaverStockConfig
  private httpClient: IHttpClient
  private connected = false

  constructor(config: NaverStockConfig = {}) {
    this.config = {
      baseUrl: 'https://finance.naver.com',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    }

    this.metadata = {
      name: this.name,
      version: '1.0.0',
      description: 'Naver Finance data source for Korean stocks',
      supportedAssetClasses: ['STOCK'],
      supportedMarkets: ['KOSPI', 'KOSDAQ'],
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
        requestsPerSecond: 0.33, // ~1 request per 3 seconds
        requestsPerMinute: 20,
        requestsPerDay: 10000
      }
    }

    // Simple HTTP client implementation
    this.httpClient = new SimpleHttpClient()
  }

  /**
   * Connect to Naver Finance
   */
  async connect(): Promise<void> {
    try {
      this.httpClient.setDefaultTimeout(this.config.timeout || 10000)
      this.httpClient.setDefaultHeaders({
        'User-Agent': this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })

      this.connected = true
      console.log(`[NAVER_STOCK] Connected to Naver Finance`)
    } catch (error) {
      throw this.createError('NETWORK_ERROR', 'Failed to connect', error)
    }
  }

  /**
   * Disconnect from Naver Finance
   */
  async disconnect(): Promise<void> {
    this.connected = false
    console.log(`[NAVER_STOCK] Disconnected from Naver Finance`)
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
      // Test with a simple request to KOSPI index
      const response = await this.httpClient.get<string>('https://finance.naver.com/')
      return response.status === 200
    } catch (error) {
      console.error(`[NAVER_STOCK] Health check failed:`, error)
      return false
    }
  }

  /**
   * Get quote data for a stock symbol
   */
  async getQuote(symbol: string): Promise<QuoteData | MarketDataError> {
    if (!this.connected) {
      throw this.createError('NETWORK_ERROR', 'Not connected to Naver Finance')
    }

    if (!this.supports(symbol)) {
      throw this.createError('INVALID_SYMBOL', `Symbol ${symbol} not supported`)
    }

    const url = `${this.config.baseUrl}/item/main.naver?code=${symbol}`

    try {
      const response = await this.httpClient.get<string>(url)
      const $ = cheerio.load(response.data)

    // Extract stock name
      const name = $('.wrap_company h2 a').text().trim() || symbol

      // Extract current price
      const currentPriceText = $('.no_today .blind').first().text()
      const currentPrice = this.parseNumber(currentPriceText)

      // Extract change information
      const changeInfo = this.extractChangeInfo($)
      const { changePrice, changePercent } = changeInfo

      // Extract financial indicators
      const financialInfo = this.extractFinancialInfo($)
      const { per, pbr, eps, marketCap, high52Week, low52Week } = financialInfo

      const quoteData: QuoteData = {
        symbol,
        name,
        assetClass: 'STOCK',
        market: this.detectMarket(symbol) as Market,
        currency: 'KRW',
        price: currentPrice,
        change: changePrice,
        changePercent,
        per,
        pbr,
        eps,
        high52Week,
        low52Week,
        marketCap,
        source: this.name,
        timestamp: new Date().toISOString(),
        fetchedAt: new Date().toISOString()
      }

      console.log(`[NAVER_STOCK] Fetched quote for ${symbol} (${name}): ${currentPrice} KRW`)
      return quoteData

    } catch (error) {
      console.error(`[NAVER_STOCK] Error fetching quote for ${symbol}:`, error)
      return this.createError('PARSE_ERROR', `Failed to parse Naver data for ${symbol}`, error)
    }
  }

  /**
   * Get batch quotes
   */
  async getBatchQuotes(request: { symbols: string[] }): Promise<{ data: QuoteData[]; errors: Array<{ symbol: string; error: MarketDataError }>; source: string; fetchedAt: string }> {
    const data: QuoteData[] = []
    const errors: Array<{ symbol: string; error: MarketDataError }> = []

    // Naver doesn't support batch requests, so we'll make individual requests
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
      throw this.createError('NETWORK_ERROR', 'Not connected to Naver Finance')
    }

    if (!this.supports(params.symbol)) {
      throw this.createError('INVALID_SYMBOL', `Symbol ${params.symbol} not supported`)
    }

    const endDate = params.endDate || new Date().toISOString().split('T')[0]
    const startDate = params.startDate || this.getStartDate(params.timeframe, params.limit || 300)

    const formatDate = (date: Date): string => {
      return date.toISOString().slice(0, 10).replace(/-/g, '')
    }

    const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${params.symbol}&requestType=1&startTime=${formatDate(new Date(startDate))}&endTime=${formatDate(new Date(endDate))}&timeframe=${this.mapTimeframe(params.timeframe)}`

    try {
      const response = await this.httpClient.get<string>(url)
      
      // Parse JSON response from Naver chart API
      const jsonData = JSON.parse(response.data.slice(1)) // Remove first character
      
      if (!Array.isArray(jsonData)) {
        throw this.createError('PARSE_ERROR', 'Invalid response format from Naver chart API')
      }

      const historicalData: HistoricalDataPoint[] = jsonData
        .map(item => ({
          date: this.formatNaverDate(item[0]),
          open: parseInt(item[1]),
          high: parseInt(item[2]),
          low: parseInt(item[3]),
          close: parseInt(item[4]),
          volume: parseInt(item[5]) || 0
        }))
        .filter(point => !isNaN(point.close)) // Filter out invalid data

      const historicalDataResponse: HistoricalData = {
        symbol: params.symbol,
        assetClass: 'STOCK',
        timeframe: params.timeframe,
        data: historicalData,
        source: this.name,
        fetchedAt: new Date().toISOString()
      }

      console.log(`[NAVER_STOCK] Fetched ${historicalData.length} historical data points for ${params.symbol}`)
      return historicalDataResponse

    } catch (error) {
      console.error(`[NAVER_STOCK] Error fetching historical data for ${params.symbol}:`, error)
      return this.createError('PARSE_ERROR', `Failed to parse historical data for ${params.symbol}`, error)
    }
  }

  /**
   * Check if symbol is supported
   */
  supports(symbol: string, assetClass?: AssetClass): boolean {
    if (assetClass && assetClass !== 'STOCK') {
      return false
    }

    // Support 6-digit Korean stock symbols
    return /^\d{6}$/.test(symbol)
  }

  /**
   * Detect market from symbol
   */
  private detectMarket(symbol: string): Market {
    const numSymbol = parseInt(symbol)
    if (isNaN(numSymbol)) return 'GLOBAL'

    if (numSymbol >= 100000) return 'KOSDAQ'
    if (numSymbol >= 1 && numSymbol <= 99999) return 'KOSPI'
    
    return 'GLOBAL'
  }

  /**
   * Extract change information from page
   */
  private extractChangeInfo($: cheerio.CheerioAPI): { changePrice: number; changePercent: number } {
    const changeElem = $('.no_exday')
    if (!changeElem.length) return { changePrice: 0, changePercent: 0 }

    const isDown = changeElem.html()?.includes('nv_down') || changeElem.html()?.includes('ico_down')
    
    const changeSpans = changeElem.find('span.blind')
    if (!changeSpans || changeSpans.length < 2) return { changePrice: 0, changePercent: 0 }

    const changePriceText = changeSpans.eq(0).text()
    const changePrice = this.parseNumber(changePriceText)
    
    let changePercent = 0
    if (changeSpans.length >= 2) {
      const changePercentText = changeSpans.eq(1).text().replace('%', '')
      changePercent = parseFloat(changePercentText) || 0
    }

    return {
      changePrice: isDown ? -Math.abs(changePrice) : changePrice,
      changePercent: isDown ? -Math.abs(changePercent) : changePercent
    }
  }

  /**
   * Extract financial information from page
   */
  private extractFinancialInfo($: cheerio.CheerioAPI): {
    per?: number
    pbr?: number
    eps?: number
    marketCap?: number
    high52Week?: number
    low52Week?: number
  } {
    // PER
    const perText = $('#_per').text()
    const per = perText ? parseFloat(perText) : undefined

    // PBR
    const pbrText = $('#_pbr').text()
    const pbr = pbrText ? parseFloat(pbrText) : undefined

    // EPS
    const epsText = $('#_eps').text()
    const eps = epsText ? parseFloat(epsText) : undefined

    // Market Cap
    const marketCapText = $('#_market_sum').text()
    let marketCap: number | undefined
    if (marketCapText) {
      const marketCap억 = this.parseNumber(marketCapText)
      marketCap = marketCap억 > 0 ? marketCap억 * 100000000 : undefined
    }

    // 52-week high/low
    const { high52Week, low52Week } = this.extract52WeekRange($)

    return { per, pbr, eps, marketCap, high52Week, low52Week }
  }

  /**
   * Extract 52-week range from page
   */
  private extract52WeekRange($: cheerio.CheerioAPI): { high52Week?: number; low52Week?: number } {
    let high52Week: number | undefined
    let low52Week: number | undefined

    $('.tab_con1 table tr').each((_, row) => {
      const th = $(row).find('th').text()
      const td = $(row).find('td').text()

      if (th && td) {
        if (th.includes('52주 최고')) {
          high52Week = this.parseNumber(td)
        } else if (th.includes('52주 최저')) {
          low52Week = this.parseNumber(td)
        }
      }
    })

    return { high52Week, low52Week }
  }

  /**
   * Parse number with comma removal
   */
  private parseNumber(text: string): number {
    if (!text) return 0
    const numbers = text.replace(/[^\d]/g, '')
    return numbers ? parseInt(numbers, 10) : 0
  }

  /**
   * Format date from Naver format
   */
  private formatNaverDate(dateStr: string): string {
    if (dateStr.length !== 8) return dateStr

    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)

    return `${year}-${month}-${day}T00:00:00.000Z`
  }

  /**
   * Map timeframe for Naver API
   */
  private mapTimeframe(timeframe: Timeframe): string {
    const timeframeMap: Record<Timeframe, string> = {
      '1m': 'minute',
      '5m': 'minute',
      '15m': 'minute',
      '30m': 'minute',
      '1h': 'minute',
      '4h': 'minute',
      '1d': 'day',
      '1w': 'week',
      '1M': 'month'
    }
    return timeframeMap[timeframe] || 'day'
  }

  /**
   * Get start date for historical data
   */
  private getStartDate(timeframe: Timeframe, days: number): Date {
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

    return startDate
  }

  /**
   * Create market data error
   */
  private createError(type: MarketDataErrorType, message: string, originalError?: unknown): MarketDataError {
    const error = new Error(message) as MarketDataError
    error.type = type
    error.source = this.name
    error.details = originalError ? { originalError } : undefined
    error.retryable = type !== 'NETWORK_ERROR' && type !== 'TIMEOUT'
    return error
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<{ remaining: number; resetTime: number; limit: number } | null> {
    // Naver doesn't provide rate limit information
    return null
  }
}

/**
 * Simple HTTP Client Implementation
 */
class SimpleHttpClient implements IHttpClient {
  private defaultTimeout = 10000
  private defaultHeaders: Record<string, string> = {}

  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }

  setRateLimit(requestsPerSecond: number): void {
    // Not implemented for simple client
  }

  async get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    const timeout = options?.timeout || this.defaultTimeout
    const headers = { ...this.defaultHeaders, ...options?.headers }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal as AbortSignal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.text() as T

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<HttpResponse<T>> {
    const timeout = options?.timeout || this.defaultTimeout
    const headers = { ...this.defaultHeaders, ...options?.headers }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal as AbortSignal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.text() as T

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}
