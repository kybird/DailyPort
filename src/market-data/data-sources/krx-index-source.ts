/**
 * KRX Index Data Source
 * 
 * Implementation of IMarketDataSource for KRX (Korea Exchange) API
 * Provides real-time and historical index data for Korean markets.
 */

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
  HistoricalDataPoint,
  IndexData
} from '../interfaces/market-data.interface'

/**
 * KRX-specific configuration
 */
export interface KRXIndexConfig {
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  apiKey?: string
}

/**
 * KRX API response interfaces
 */
interface KRXIndexItem {
  BAS_DD: string
  IDX_NM: string
  IDX_CLSS: string
  CLSPRC_IDX: string
  CMPPREVDD_IDX: string
  FLUC_RT: string
  OPNPRC_IDX: string
  HGPRC_IDX: string
  LWPRC_IDX: string
  ACC_TRDVOL: string
  ACC_TRDVAL: string
  MKTCAP: string
}

/**
 * KRX Index Data Source
 */
export class KRXIndexDataSource implements IMarketDataSource {
  readonly name = 'KRX_INDEX'
  readonly metadata: DataSourceMetadata

  private config: KRXIndexConfig
  private httpClient: IHttpClient
  private connected = false

  constructor(config: KRXIndexConfig = {}) {
    this.config = {
      baseUrl: 'https://data-dbg.krx.co.kr/svc/apis',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    }

    this.metadata = {
      name: this.name,
      version: '1.0.0',
      description: 'KRX Index data source for Korean market indices',
      supportedAssetClasses: ['INDEX'],
      supportedMarkets: ['KOSPI', 'KOSDAQ'],
      capabilities: {
        realTimeQuotes: true,
        historicalData: true,
        technicalIndicators: false,
        marketData: true,
        indexData: true,
        batchRequests: false,
        websockets: false
      },
      rateLimits: {
        requestsPerSecond: 1, // KRX API is rate limited
        requestsPerMinute: 30,
        requestsPerDay: 1000
      }
    }

    // Simple HTTP client implementation
    this.httpClient = new SimpleHttpClient()
  }

  /**
   * Connect to KRX API
   */
  async connect(): Promise<void> {
    try {
      this.httpClient.setDefaultTimeout(this.config.timeout || 10000)
      this.httpClient.setDefaultHeaders({
        'Content-Type': 'application/json',
        'AUTH_KEY': this.config.apiKey || process.env.KRX_OPEN_API_KEY || ''
      })

      // Test connection with a simple request
      await this.getKOSPIIndexData()
      this.connected = true
      console.log(`[KRX_INDEX] Connected to KRX API`)
    } catch (error) {
      throw this.createError('NETWORK_ERROR', 'Failed to connect to KRX API', error)
    }
  }

  /**
   * Disconnect from KRX API
   */
  async disconnect(): Promise<void> {
    this.connected = false
    console.log(`[KRX_INDEX] Disconnected from KRX API`)
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
      const response = await this.getKOSPIIndexData()
      return response.length > 0
    } catch (error) {
      console.error(`[KRX_INDEX] Health check failed:`, error)
      return false
    }
  }

  /**
   * Get quote data for a symbol (not supported for index data source)
   */
  async getQuote(symbol: string): Promise<QuoteData | MarketDataError> {
    throw this.createError('INVALID_SYMBOL', `KRX Index data source does not support individual stock quotes. Use getIndexData() instead.`)
  }

  /**
   * Get batch quotes (not supported for index data source)
   */
  async getBatchQuotes(request: { symbols: string[] }): Promise<{ data: QuoteData[]; errors: Array<{ symbol: string; error: MarketDataError }>; source: string; fetchedAt: string }> {
    return {
      data: [],
      errors: request.symbols.map(symbol => ({
        symbol,
        error: this.createError('INVALID_SYMBOL', `KRX Index data source does not support individual stock quotes. Use getIndexData() instead.`)
      })),
      source: this.name,
      fetchedAt: new Date().toISOString()
    }
  }

  /**
   * Get historical data (not supported for index data source)
   */
  async getHistoricalData(params: HistoricalDataParams): Promise<HistoricalData | MarketDataError> {
    throw this.createError('INVALID_SYMBOL', `KRX Index data source does not support historical data. Use getIndexData() instead.`)
  }

  /**
   * Get index data for a market
   */
  async getIndexData(market: Market): Promise<IndexData[] | MarketDataError> {
    if (!this.connected) {
      throw this.createError('NETWORK_ERROR', 'Not connected to KRX API')
    }

    if (!this.supports('', 'INDEX')) {
      throw this.createError('INVALID_SYMBOL', `Market ${market} not supported`)
    }

    try {
      let response: IndexData[] = []

      if (market === 'KOSPI') {
        response = await this.getKOSPIIndexData()
      } else if (market === 'KOSDAQ') {
        response = await this.getKOSDAQIndexData()
      } else {
        throw this.createError('INVALID_SYMBOL', `Market ${market} not supported`)
      }

      console.log(`[KRX_INDEX] Fetched ${response.length} index data points for ${market}`)
      return response

    } catch (error) {
      console.error(`[KRX_INDEX] Error fetching index data for ${market}:`, error)
      return this.createError('NETWORK_ERROR', `Failed to fetch KRX index data for ${market}`, error)
    }
  }

  /**
   * Check if symbol is supported
   */
  supports(symbol: string, assetClass?: AssetClass): boolean {
    if (assetClass && assetClass !== 'INDEX') {
      return false
    }

    // KRX Index source only supports market-level index data, not individual symbols
    return assetClass === 'INDEX'
  }

  /**
   * Get KOSPI index data
   */
  private async getKOSPIIndexData(): Promise<IndexData[]> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const endpoint = `${this.config.baseUrl}/idx/kospi_dd_trd`

    const response = await this.httpClient.post(endpoint, { basDd: today })
    const data = response.data as { OutBlock_1: KRXIndexItem[] }

    if (!data.OutBlock_1) {
      return []
    }

    return data.OutBlock_1.map(item => this.transformKRXItem(item))
  }

  /**
   * Get KOSDAQ index data
   */
  private async getKOSDAQIndexData(): Promise<IndexData[]> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const endpoint = `${this.config.baseUrl}/idx/kosdaq_dd_trd`

    const response = await this.httpClient.post(endpoint, { basDd: today })
    const data = response.data as { OutBlock_1: KRXIndexItem[] }

    if (!data.OutBlock_1) {
      return []
    }

    return data.OutBlock_1.map(item => this.transformKRXItem(item))
  }

  /**
   * Transform KRX API response to IndexData format
   */
  private transformKRXItem(item: KRXIndexItem): IndexData {
    const basDd = item.BAS_DD
    const year = basDd.slice(0, 4)
    const month = basDd.slice(4, 6)
    const day = basDd.slice(6, 8)
    const dateStr = `${year}-${month}-${day}`

    return {
      name: item.IDX_NM,
      indexClass: item.IDX_CLSS,
      currentPrice: parseFloat(item.CLSPRC_IDX) || 0,
      change: parseFloat(item.CMPPREVDD_IDX) || 0,
      changePercent: parseFloat(item.FLUC_RT) || 0,
      open: parseFloat(item.OPNPRC_IDX) || 0,
      high: parseFloat(item.HGPRC_IDX) || 0,
      low: parseFloat(item.LWPRC_IDX) || 0,
      volume: parseInt(item.ACC_TRDVOL) || 0,
      tradingValue: parseFloat(item.ACC_TRDVAL) || 0,
      marketCap: parseFloat(item.MKTCAP) || 0,
      date: dateStr,
      source: this.name,
      fetchedAt: new Date().toISOString()
    }
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
    // KRX doesn't provide rate limit information
    return null
  }

  /**
   * Get HTTP client
   */
  getHttpClient(): IHttpClient {
    return this.httpClient
  }
}

/**
 * Simple HTTP Client Implementation for KRX API
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
