
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTicker(ticker: string, quantity: number, entryPrice: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { error } = await supabase.from('portfolios').insert({
        user_id: user.id,
        ticker,
        quantity,
        entry_price: entryPrice,
        currency: 'KRW', // Default to KRW for now
        target_weight: 0,
    })

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { error: 'Already exists in portfolio' }
        }
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function removeTicker(ticker: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase.from('portfolios').delete().match({
        user_id: user.id,
        ticker
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function getPortfolio() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('portfolios').select('*').order('ticker')
    if (error) throw error
    return data
}
