
'use client'

import { useState } from 'react'
import { FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { checkSheetSync, applySheetSync, ImportResult } from '@/app/actions_sheet'
import { SheetRowData } from '@/utils/google-sheets'

export default function GoogleSheetSyncDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [spreadsheetId, setSpreadsheetId] = useState('')
    const [step, setStep] = useState<'input' | 'preview' | 'syncing' | 'result'>('input')
    const [checkResult, setCheckResult] = useState<ImportResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [syncCount, setSyncCount] = useState(0)

    const handleCheck = async () => {
        if (!spreadsheetId) return
        setLoading(true)
        const result = await checkSheetSync(spreadsheetId)
        setCheckResult(result)
        setLoading(false)
        if (result.success) {
            setStep('preview')
        }
    }

    const handleApply = async () => {
        if (!checkResult?.previewData?.valid || !spreadsheetId) return
        setLoading(true)
        setStep('syncing')
        const result = await applySheetSync(spreadsheetId, checkResult.previewData.valid)
        setLoading(false)
        if (result.success) {
            setSyncCount(result.count || 0)
            setStep('result')
        } else {
            // Handle sync error (could show in preview step again or error state)
            alert('Sync failed: ' + result.error)
            setStep('preview')
        }
    }

    const reset = () => {
        setIsOpen(false)
        setStep('input')
        setCheckResult(null)
        setSpreadsheetId('')
        setSyncCount(0)
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
                <FileSpreadsheet size={16} /> Sync Sheet
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={reset}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-600" /> Google Sheet Sync
                </h2>

                {step === 'input' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter the ID of your Google Spreadsheet. <br />
                            Make sure to share it with the service account email (check .env).
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                            <input
                                value={spreadsheetId}
                                onChange={(e) => setSpreadsheetId(e.target.value)}
                                placeholder="e.g. 1BxiMVs0XRA5nFMdKbBdB..."
                                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                            />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
                            <h4 className="font-bold mb-1">Required Headers:</h4>
                            Ticker, Quantity, AvgPrice, TargetWeight
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button
                                onClick={handleCheck}
                                disabled={!spreadsheetId || loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <RefreshCw className="animate-spin h-4 w-4" />}
                                Check Sync (Dry-Run)
                            </button>
                        </div>
                        {checkResult && !checkResult.success && (
                            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
                                Error: {checkResult.error}
                            </div>
                        )}
                    </div>
                )}

                {step === 'preview' && checkResult?.summary && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-2xl font-bold">{checkResult.summary.totalRows}</div>
                                <div className="text-xs text-gray-500">Total Rows</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-green-700">
                                <div className="text-2xl font-bold">{checkResult.summary.validRows}</div>
                                <div className="text-xs">Valid</div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg text-red-700">
                                <div className="text-2xl font-bold">{checkResult.summary.invalidRows}</div>
                                <div className="text-xs">Invalid</div>
                            </div>
                        </div>

                        {checkResult.previewData?.invalid && checkResult.previewData.invalid.length > 0 && (
                            <div className="border rounded-md overflow-hidden">
                                <div className="bg-red-100 px-4 py-2 text-red-800 text-sm font-bold flex items-center gap-2">
                                    <AlertTriangle size={16} /> Issues Found
                                </div>
                                <div className="max-h-40 overflow-y-auto p-4 text-sm space-y-2">
                                    {checkResult.previewData.invalid.map((err, idx) => (
                                        <div key={idx} className="text-red-600">
                                            Row {err.row}: {err.reason} <span className="text-gray-400 text-xs ml-2">({JSON.stringify(err.data.ticker)})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-gray-600">
                            <p>Ready to sync <b>{checkResult.summary.validRows}</b> valid items to your portfolio.</p>
                            <p className="text-xs text-gray-400 mt-1">* Invalid items will be skipped. Existing items will be updated.</p>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setStep('input')} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Back</button>
                            <button
                                onClick={handleApply}
                                disabled={loading || checkResult.summary.validRows === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <RefreshCw className="animate-spin h-4 w-4" />}
                                Confirm Sync
                            </button>
                        </div>
                    </div>
                )}

                {step === 'result' && (
                    <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Sync Complete!</h3>
                        <p className="text-gray-600 mb-6">Successfully synced {syncCount} items to your portfolio.</p>
                        <button
                            onClick={reset}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Done
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}
