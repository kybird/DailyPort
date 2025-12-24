'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UserSettings {
    user_id: string
    telegram_chat_id: string | null
    telegram_bot_token: string | null
}

export async function getSettings() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // If no row exists, return empty structure (not error)
    if (error && error.code === 'PGRST116') {
        return { data: { telegram_chat_id: '', telegram_bot_token: '' } }
    }

    if (error) return { error: error.message }
    return { data }
}

export async function updateSettings(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const telegram_chat_id = formData.get('telegram_chat_id') as string
    const telegram_bot_token = formData.get('telegram_bot_token') as string

    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: user.id,
            telegram_chat_id,
            telegram_bot_token,
            updated_at: new Date().toISOString()
        })

    if (error) return { error: error.message }

    revalidatePath('/mypage')
    return { success: true }
}

// Server-side test message sender
export async function sendTestTelegram(chatId: string, token: string) {
    if (!chatId || !token) return { error: 'Missing credentials' }

    const message = `
🔔 *DailyPort Test Message*
Your Telegram settings are configured correctly!
    `
    const url = `https://api.telegram.org/bot${token}/sendMessage`

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        })

        const data = await res.json()
        if (!data.ok) return { error: data.description }

        return { success: true }
    } catch {
        return { error: 'Network error occurred' }
    }
}
