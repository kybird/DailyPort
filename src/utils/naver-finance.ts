/**
 * 네이버 금융 데이터 크롤러 (TypeScript/Next.js 버전)
 * 
 * 기능:
 * - 실시간 시세 (현재가, 등락률)
 * - 주요 지표 (PER, PBR)
 * - 시가총액
 * - ETF 괴리율
 * - 일봉 데이터 (historical)
 * 
 * 캐싱:
 * - 1분 TTL 캐싱으로 중복 요청 방지
 */

import * as cheerio from 'cheerio'

export interface NaverQuoteData {
    ticker: string
    name: string
    currentPrice: number
    changePrice: number
    changePercent: number
    per?: number
    pbr?: number
    eps?: number
    marketCap?: number
    high52Week?: number
    low52Week?: number
    // ETF 전용
    nav?: number
    premiumDiscount?: number
    assetType?: 'STOCK' | 'ETF'
    source: 'NAVER' | 'NAVER_ETF'
    fetchedAt: string
}

export interface NaverHistoricalItem {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
}

// In-memory 캐시
const cache: Map<string, { data: NaverQuoteData; fetchedAt: Date }> = new Map()
const CACHE_TTL_MS = 60 * 1000 // 1분

/**
 * 캐시가 유효한지 확인 (1분 이내)
 */
function isCacheValid(ticker: string): boolean {
    const cached = cache.get(ticker)
    if (!cached) return false

    const elapsed = Date.now() - cached.fetchedAt.getTime()
    return elapsed < CACHE_TTL_MS
}

/**
 * 숫자 파싱 (쉼표 제거)
 */
function parseNumber(text: string | undefined): number {
    if (!text) return 0
    const numbers = text.replace(/[^\d]/g, '')
    return numbers ? parseInt(numbers, 10) : 0
}

/**
 * 소수점 숫자 파싱
 */
function parseFloat_(text: string | undefined): number | undefined {
    if (!text || text.trim() === 'N/A' || text.trim() === '-') return undefined
    try {
        const cleaned = text.replace(/,/g, '').trim()
        return parseFloat(cleaned)
    } catch {
        return undefined
    }
}

/**
 * 네이버 금융에서 주식 시세 조회
 */
export async function getNaverStockQuote(ticker: string, forceRefresh = false): Promise<NaverQuoteData | null> {
    // 캐시 확인
    if (!forceRefresh && isCacheValid(ticker)) {
        const cached = cache.get(ticker)!
        console.log(`[NAVER CACHE HIT] ${ticker}`)
        return cached.data
    }

    const url = `https://finance.naver.com/item/main.naver?code=${ticker}`

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            next: { revalidate: 0 } // No Next.js cache, we handle our own
        })

        if (!response.ok) {
            console.error(`[NAVER] HTTP ${response.status} for ${ticker}`)
            return null
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // 종목명
        const name = $('.wrap_company h2 a').text().trim() || ticker

        // 현재가
        const currentPriceText = $('.no_today .blind').first().text()
        const currentPrice = parseNumber(currentPriceText)

        // 등락가 및 등락률
        let changePrice = 0
        let changePercent = 0

        const changeElem = $('.no_exday')
        if (changeElem.length) {
            const isDown = changeElem.html()?.includes('nv_down') || changeElem.html()?.includes('ico_down')

            const changeSpans = changeElem.find('span.blind')
            if (changeSpans.length >= 1) {
                changePrice = parseNumber(changeSpans.eq(0).text())
                if (isDown) changePrice = -changePrice
            }
            if (changeSpans.length >= 2) {
                const pctText = changeSpans.eq(1).text().replace('%', '')
                changePercent = parseFloat_(pctText) || 0
                if (isDown) changePercent = -changePercent
            }
        }

        // PER, PBR
        const per = parseFloat_($('#_per').text())
        const pbr = parseFloat_($('#_pbr').text())

        // 시가총액 (억원 단위)
        const marketCapText = $('#_market_sum').text()
        const marketCap억 = parseNumber(marketCapText)
        const marketCap = marketCap억 > 0 ? marketCap억 * 100000000 : undefined

        const data: NaverQuoteData = {
            ticker,
            name,
            currentPrice,
            changePrice,
            changePercent,
            per,
            pbr,
            marketCap,
            assetType: 'STOCK',
            source: 'NAVER',
            fetchedAt: new Date().toISOString()
        }

        // 캐시 저장
        cache.set(ticker, { data, fetchedAt: new Date() })
        console.log(`[NAVER FETCH] ${ticker} (${name}): ${currentPrice.toLocaleString()}원, PER: ${per}, PBR: ${pbr}`)

        return data

    } catch (error) {
        console.error(`[NAVER ERROR] ${ticker}:`, error)
        return null
    }
}

/**
 * 네이버 금융에서 ETF 시세 및 괴리율 조회
 */
export async function getNaverETFQuote(ticker: string, forceRefresh = false): Promise<NaverQuoteData | null> {
    // 캐시 확인
    if (!forceRefresh && isCacheValid(ticker)) {
        const cached = cache.get(ticker)!
        console.log(`[NAVER ETF CACHE HIT] ${ticker}`)
        return cached.data
    }

    const url = `https://finance.naver.com/item/main.naver?code=${ticker}`

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`[NAVER ETF] HTTP ${response.status} for ${ticker}`)
            return null
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // 종목명
        const name = $('.wrap_company h2 a').text().trim() || ticker

        // 현재가
        const currentPriceText = $('.no_today .blind').first().text()
        const currentPrice = parseNumber(currentPriceText)

        // NAV 및 괴리율 찾기
        let nav: number | undefined
        let premiumDiscount: number | undefined

        // ETF 정보 테이블 파싱
        $('.tab_con1 table tr').each((_, row) => {
            const th = $(row).find('th').text().trim()
            const td = $(row).find('td').text().trim()

            if (th.includes('NAV') || th.includes('순자산')) {
                nav = parseNumber(td)
            } else if (th.includes('괴리율') || th.includes('괴리')) {
                premiumDiscount = parseFloat_(td.replace('%', ''))
            }
        })

        // NAV가 있고 괴리율이 없으면 계산
        if (nav && nav > 0 && premiumDiscount === undefined && currentPrice > 0) {
            premiumDiscount = ((currentPrice - nav) / nav) * 100
            premiumDiscount = Math.round(premiumDiscount * 100) / 100 // 소수점 2자리
        }

        const data: NaverQuoteData = {
            ticker,
            name,
            currentPrice,
            changePrice: 0,
            changePercent: 0,
            nav,
            premiumDiscount,
            assetType: 'ETF',
            source: 'NAVER_ETF',
            fetchedAt: new Date().toISOString()
        }

        // 캐시 저장
        cache.set(ticker, { data, fetchedAt: new Date() })
        console.log(`[NAVER ETF FETCH] ${ticker} (${name}): ${currentPrice.toLocaleString()}원, NAV: ${nav}, 괴리율: ${premiumDiscount}%`)

        return data

    } catch (error) {
        console.error(`[NAVER ETF ERROR] ${ticker}:`, error)
        return null
    }
}

/**
 * 캐시 클리어 (테스트용)
 */
export function clearNaverCache(): void {
    cache.clear()
    console.log('[NAVER] Cache cleared')
}

/**
 * 네이버 금융에서 일봉 데이터 가져오기
 * 
 * 네이버 차트 API 사용:
 * https://fchart.stock.naver.com/siseJson.nhn?symbol=005930&requestType=1&startTime=20240101&endTime=20241227&timeframe=day
 */
export async function getNaverHistoricalData(ticker: string, days = 300): Promise<NaverHistoricalItem[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

    const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${ticker}&requestType=1&startTime=${formatDate(startDate)}&endTime=${formatDate(endDate)}&timeframe=day`

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://finance.naver.com/'
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`[NAVER HISTORICAL] HTTP ${response.status} for ${ticker}`)
            return []
        }

        const text = await response.text()

        // 네이버 응답은 JavaScript 배열 형태 (JSON 아님)
        // [[날짜, 시가, 고가, 저가, 종가, 거래량], ...]
        // 첫 줄은 헤더이므로 제외
        const cleanText = text.trim()
        const lines = cleanText.split('\n').slice(1) // 첫 줄 헤더 제외

        const historical: NaverHistoricalItem[] = []

        for (const line of lines) {
            // ['20241227', 55000, 56000, 54000, 55500, 1234567]
            const match = line.match(/"(\d{8})"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
            if (match) {
                const [, dateStr, open, high, low, close, volume] = match
                const year = dateStr.slice(0, 4)
                const month = dateStr.slice(4, 6)
                const day = dateStr.slice(6, 8)

                historical.push({
                    date: `${year}-${month}-${day}T00:00:00.000Z`,
                    open: parseInt(open),
                    high: parseInt(high),
                    low: parseInt(low),
                    close: parseInt(close),
                    volume: parseInt(volume)
                })
            }
        }

        console.log(`[NAVER HISTORICAL] ${ticker}: ${historical.length}개 일봉 데이터`)
        return historical

    } catch (error) {
        console.error(`[NAVER HISTORICAL ERROR] ${ticker}:`, error)
        return []
    }
}
