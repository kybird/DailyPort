
'use server'

import { sendTelegramMessage } from '@/utils/telegram'
import { AnalysisReport } from '@/app/actions-analysis'

export async function sendAnalysisToTelegram(report: AnalysisReport) {
    // Format Message using HTML for better readability
    const directionEmoji = report.price.changePercent > 0 ? '🔺' : (report.price.changePercent < 0 ? '🔻' : '➖')
    const rsiStatus = report.technical.rsi.status === 'OVERBOUGHT' ? '🔥 <b>과매수</b>' :
        report.technical.rsi.status === 'OVERSOLD' ? '🧊 <b>과매도</b>' : report.technical.rsi.status
    const supplyStatus = report.supplyDemand
        ? `외인: ${report.supplyDemand.foreignNetBuy > 0 ? '🔴 유입' : '🔵 유출'} | 기관: ${report.supplyDemand.instNetBuy > 0 ? '🔴 유입' : '🔵 유출'}`
        : '<i>수급 데이터 없음</i>'

    const message = `
<b>📊 DailyPort Analysis: ${report.ticker}</b>

<b>Price:</b> ${report.price.current.toLocaleString()} (${directionEmoji} ${report.price.changePercent.toFixed(2)}%)
<b>Trend:</b> ${report.technical.trend.status}

<pre>
| Indicator | Status |
|-----------|--------|
| RSI (14)  | ${report.technical.rsi.value.toFixed(1)} |
| MACD      | ${report.technical.macd.status} |
</pre>

<b>RSI 상태:</b> ${rsiStatus}
<b>수급 현황:</b> ${supplyStatus}

💡 <b>Insight:</b>
${report.summary}

<i>Generated at: ${new Date().toLocaleTimeString()}</i>
`

    return await sendTelegramMessage(message, 'HTML')
}
