'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'


export async function addTicker(tickerInput: string, quantity: number, entryPrice: number) {
    const ticker = tickerInput.split('.')[0]
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

export async function sellTicker(tickerInput: string, quantity: number, sellPrice: number) {
    const ticker = tickerInput.split('.')[0]
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

export async function removeTicker(tickerInput: string) {
    const ticker = tickerInput.split('.')[0]
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase.from('portfolios').delete().match({
        user_id: user.id,
        ticker
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/portfolio')
    return { success: true }
}

export async function updatePortfolioItem(tickerInput: string, quantity: number, entryPrice: number, targetWeight: number) {
    const ticker = tickerInput.split('.')[0]
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('portfolios')
        .update({
            quantity,
            entry_price: entryPrice,
            target_weight: targetWeight,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('ticker', ticker)

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/portfolio')
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

export async function addToWatchlist(tickerInput: string) {
    const ticker = tickerInput.split('.')[0]
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase.from('watchlists').insert({
        user_id: user.id,
        ticker,
    })

    if (error) {
        if (error.code === '23505') return { error: 'Already in watchlist' }
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function removeFromWatchlist(tickerInput: string) {
    const ticker = tickerInput.split('.')[0]
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

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return { success: true }
}
