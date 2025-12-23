'use server'

import { createClient } from '@/utils/supabase/server'
import { analyzeTechnical, TechnicalAnalysisResult, calculateObjectives } from '@/utils/technical-analysis'
import { revalidatePath } from 'next/cache'
import { getMarketData } from '@/utils/market-data'


export async function addTicker(ticker: string, quantity: number, entryPrice: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // 1. Update/Insert Portfolio
    const { data: existing } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .single()

    let error;
    if (existing) {
        // Calculate new average price and quantity
        const totalQuantity = existing.quantity + quantity
        const totalCost = (existing.quantity * existing.entry_price) + (quantity * entryPrice)
        const newEntryPrice = totalCost / totalQuantity

        const { error: updateError } = await supabase
            .from('portfolios')
            .update({
                quantity: totalQuantity,
                entry_price: newEntryPrice,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        error = updateError
    } else {
        const { error: insertError } = await supabase.from('portfolios').insert({
            user_id: user.id,
            ticker,
            quantity,
            entry_price: entryPrice,
            currency: 'KRW',
            target_weight: 0,
        })
        error = insertError
    }

    if (error) {
        return { error: error.message }
    }

    // 2. Record Transaction
    await supabase.from('transactions').insert({
        user_id: user.id,
        ticker,
        type: 'BUY',
        quantity,
        price: entryPrice
    })

    revalidatePath('/dashboard')
    return { success: true }
}

export async function sellTicker(ticker: string, quantity: number, sellPrice: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: portfolio } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .single()

    if (!portfolio || portfolio.quantity < quantity) {
        return { error: 'Insufficient quantity' }
    }

    // Calculate realized gain for this transaction
    const costBasis = portfolio.entry_price * quantity
    const proceeds = sellPrice * quantity
    const realizedGain = proceeds - costBasis

    const newQuantity = portfolio.quantity - quantity
    const newTotalRealizedGain = (portfolio.realized_gain || 0) + realizedGain

    let res;
    if (newQuantity === 0) {
        // If all sold, we still want to keep the record of realized gain? 
        // Not really, the portfolio row is for 'holdings'. 
        // Actually, we might want to keep the record with 0 quantity to store aggregate realized_gain for that ticker,
        // or just rely on transactions table. Let's keep it in portfolios as an aggregate for now.
        res = await supabase
            .from('portfolios')
            .update({
                quantity: 0,
                realized_gain: newTotalRealizedGain,
                updated_at: new Date().toISOString()
            })
            .eq('id', portfolio.id)
    } else {
        res = await supabase
            .from('portfolios')
            .update({
                quantity: newQuantity,
                realized_gain: newTotalRealizedGain,
                updated_at: new Date().toISOString()
            })
            .eq('id', portfolio.id)
    }

    if (res.error) return { error: res.error.message }

    // Record Transaction
    await supabase.from('transactions').insert({
        user_id: user.id,
        ticker,
        type: 'SELL',
        quantity,
        price: sellPrice,
        realized_gain: realizedGain
    })

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

// Watchlist Actions
export async function getWatchlist() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('watchlists').select('*').order('added_at', { ascending: false })
    if (error) throw error
    return data
}

export async function addToWatchlist(ticker: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Fetch current price to calculate objectives
    const { getMarketData } = await import('@/utils/market-data')
    const marketData = await getMarketData(ticker)
    if (!marketData) return { error: 'Failed to fetch market data' }

    const objectives = calculateObjectives(marketData.currentPrice)

    const { error } = await supabase.from('watchlists').insert({
        user_id: user.id,
        ticker,
        short_entry: objectives.short.entry,
        short_stop: objectives.short.stop,
        short_target: objectives.short.target,
        mid_entry: objectives.mid.entry,
        mid_stop: objectives.mid.stop,
        mid_target: objectives.mid.target,
        long_entry: objectives.long.entry,
        long_stop: objectives.long.stop,
        long_target: objectives.long.target,
    })

    if (error) {
        if (error.code === '23505') return { error: 'Already in watchlist' }
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function removeFromWatchlist(ticker: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase.from('watchlists').delete().match({
        user_id: user.id,
        ticker
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    return { success: true }
}
