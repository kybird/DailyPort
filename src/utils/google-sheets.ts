
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

// Environment variables must be set in Vercel or .env.local
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY

export type SheetRowData = {
    ticker: string
    quantity: number
    entry_price: number
    target_weight: number
    currency?: string
}

export type FetchResult = {
    success: boolean
    rows?: SheetRowData[]
    error?: string
}

export const HEADER_ROW = ['Ticker', 'Quantity', 'AvgPrice', 'TargetWeight', 'Currency']

export async function fetchSheetData(spreadsheetId: string): Promise<FetchResult> {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Google Credentials.' }
    }

    try {
        // 1. Initialize Auth
        // KEY HANDLING: Replace literal \n characters if they exist in the env var string
        const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')

        const serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: formattedKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)

        // 2. Load Info
        await doc.loadInfo()

        // 3. Select First Sheet
        const sheet = doc.sheetsByIndex[0]

        // 4. Load Rows
        await sheet.loadHeaderRow() // Assumes first row is header

        // Check Headers
        const headers = sheet.headerValues
        const missingHeaders = HEADER_ROW.filter(h => !headers.includes(h) && h !== 'Currency') // Currency optional
        if (missingHeaders.length > 0) {
            // Try to add headers if empty sheet? Or just error.
            // For now, robust error is better for dry-run
            // Exception: If sheet is totally empty (no header), we might suggest initialization
            return { success: false, error: `Missing columns: ${missingHeaders.join(', ')}` }
        }

        const rows = await sheet.getRows()

        const parsedRows: SheetRowData[] = rows.map((row) => {
            const quantity = parseFloat(row.get('Quantity')) || 0
            const price = parseFloat(row.get('AvgPrice')) || 0
            const weight = parseFloat(row.get('TargetWeight')) || 0
            // Clean ticker
            const ticker = (row.get('Ticker') || '').toString().trim().toUpperCase()

            return {
                ticker,
                quantity,
                entry_price: price,
                target_weight: weight,
                currency: row.get('Currency') || 'KRW'
            }
        }).filter(r => r.ticker.length > 0) // Ignore empty tickers

        return { success: true, rows: parsedRows }

    } catch (error: any) {
        console.error('Google Sheet Error:', error)
        if (error.response?.status === 403 || error.message?.includes('403')) {
            return { success: false, error: `Permission denied. Please share the sheet with: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}` }
        }
        if (error.response?.status === 404) {
            return { success: false, error: 'Spreadsheet not found. Check the ID.' }
        }
        return { success: false, error: error.message || 'Unknown error occurred during fetch.' }
    }
}
