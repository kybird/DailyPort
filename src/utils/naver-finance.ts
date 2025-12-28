/**
 * 네이버 금융 데이터 크롤러 (축소 버전)
 *
 * 기능:
 * - 일봉 데이터 (historical) - SDK 통합 후에도 유지
 *
 * 참고: 시세 조회 기능은 src/market-data/로 이동됨
 */

import * as cheerio from 'cheerio'

export interface NaverHistoricalItem {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
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
            // 일부 종목은 뒤에 외국인소진율 등 추가 컬럼이 있을 수 있으므로 정규식을 유연하게 수정
            const match = line.match(/"(\d{8})"[^0-9]*(\d+)[^0-9]*(\d+)[^0-9]*(\d+)[^0-9]*(\d+)[^0-9]*(\d+)/)
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
