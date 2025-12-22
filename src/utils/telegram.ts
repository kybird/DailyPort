
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

export async function sendTelegramMessage(text: string, parseMode: 'MarkdownV2' | 'HTML' = 'HTML') {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
        console.error('Telegram keys missing')
        return { success: false, error: 'Telegram configuration missing' }
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_ADMIN_CHAT_ID,
                text: text,
                parse_mode: parseMode,
            }),
        })

        const data = await response.json()
        if (!data.ok) {
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }
        return { success: true }
    } catch (error: any) {
        console.error('Telegram Network Error:', error)
        return { success: false, error: error.message }
    }
}
