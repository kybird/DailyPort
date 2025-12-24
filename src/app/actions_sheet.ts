
'use server'

import { fetchSheetData, SheetRowData } from '@/utils/google-sheets'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ImportResult = {
    success: boolean
    error?: string
    summary?: {
        totalRows: number
        validRows: number
        invalidRows: number
        changes: {
            added: number
            updated: number
            deleted: number // If we implement delete logic later
        }
    }
    previewData?: {
        valid: SheetRowData[]
        invalid: { row: number; reason: string; data: Record<string, unknown> }[]
    }
}

export async function checkSheetSync(spreadsheetId: string): Promise<ImportResult> {
    // 1. Fetch Data
    const result = await fetchSheetData(spreadsheetId)

    if (!result.success || !result.rows) {
        return { success: false, error: result.error }
    }

    const rawRows = result.rows
    const invalidRows: { row: number; reason: string; data: Record<string, unknown> }[] = []

    // 2. Validate & Normalize
    // Logic: Duplicate tickers in sheet -> Use last one? OR Error? 
    // Master plan says: "prioritize last value"
    const tickerMap = new Map<string, SheetRowData>()

    rawRows.forEach((row, index) => {
        // Row index mapping (approximate since blank rows might be skipped by google-spreadsheet? 
        // Actually google-spreadsheet returns rows with data. We use index + 2 (1 for header, 1 for 0-index)
        const rowNum = index + 2

        if (!row.ticker) {
            invalidRows.push({ row: rowNum, reason: 'Missing Ticker', data: row })
            return
        }
        if (isNaN(row.quantity)) {
            invalidRows.push({ row: rowNum, reason: 'Invalid Quantity', data: row })
            return
        }
        if (isNaN(row.entry_price)) {
            invalidRows.push({ row: rowNum, reason: 'Invalid Price', data: row })
            return
        }

        // Add to map (overwriting previous)
        tickerMap.set(row.ticker, row)
    })

    // Convert map to list
    const uniqueRows = Array.from(tickerMap.values())

    // 3. Compare with DB (Optional for advanced Dry-Run: "What will change?")
    // For now, simpler report: "How many valid rows found" vs "How many errors"

    return {
        success: true,
        summary: {
            totalRows: rawRows.length,
            validRows: uniqueRows.length,
            invalidRows: invalidRows.length,
            changes: {
                added: 0, // Need DB Diff for this, implement later if needed or simplistic now
                updated: uniqueRows.length, // Assume all valid are potential updates
                deleted: 0
            }
        },
        previewData: {
            valid: uniqueRows,
            invalid: invalidRows
        }
    }
}

export async function applySheetSync(spreadsheetId: string, rows: SheetRowData[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    if (!rows || rows.length === 0) return { success: true, count: 0 }

    // Upsert Logic
    const upsertData = rows.map(r => ({
        user_id: user.id,
        ticker: r.ticker,
        quantity: r.quantity,
        entry_price: r.entry_price,
        target_weight: r.target_weight,
        currency: r.currency || 'KRW',
        updated_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('portfolios').upsert(upsertData, {
        onConflict: 'user_id, ticker',
        ignoreDuplicates: false
    })

    if (error) {
        console.error('Upsert Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true, count: upsertData.length }
}
