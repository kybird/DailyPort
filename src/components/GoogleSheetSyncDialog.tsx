
'use client'

import { useState } from 'react'
import { FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { checkSheetSync, applySheetSync, ImportResult } from '@/app/actions-sheet'

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800 transition-colors max-h-[90vh] overflow-y-auto">
                <button
                    onClick={reset}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                    <FileSpreadsheet className="text-green-600" /> 시트 동기화
                </h2>

                {step === 'input' && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            구글 스프레드시트의 ID를 입력하세요. <br />
                            서비스 계정에 공유 권한(편집자 또는 뷰어)이 있어야 합니다.
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">스프레드시트 ID</label>
                            <input
                                value={spreadsheetId}
                                onChange={(e) => setSpreadsheetId(e.target.value)}
                                placeholder="예: 1BxiMVs0XRA5nFMdKbBdB..."
                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-900 dark:text-white font-mono text-xs"
                            />
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                            <h4 className="font-bold mb-1 uppercase tracking-wider text-[10px]">필수 헤더:</h4>
                            Ticker, Quantity, AvgPrice, TargetWeight
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setIsOpen(false)} className="px-6 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">취소</button>
                            <button
                                onClick={handleCheck}
                                disabled={!spreadsheetId || loading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                            >
                                {loading && <RefreshCw className="animate-spin h-4 w-4" />}
                                동기화 확인 (Dry-Run)
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
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <div className="text-2xl font-black text-zinc-900 dark:text-white">{checkResult.summary.totalRows}</div>
                                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Rows</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900/50 p-4 rounded-xl text-green-700 dark:text-green-400">
                                <div className="text-2xl font-black">{checkResult.summary.validRows}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wider">Valid</div>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900/50 p-4 rounded-xl text-rose-600 dark:text-rose-400">
                                <div className="text-2xl font-black">{checkResult.summary.invalidRows}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wider">Invalid</div>
                            </div>
                        </div>

                        {checkResult.previewData?.invalid && checkResult.previewData.invalid.length > 0 && (
                            <div className="border border-rose-100 dark:border-rose-900/40 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-rose-50 dark:bg-rose-950/50 px-4 py-2 text-rose-800 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle size={14} /> 오류 발견
                                </div>
                                <div className="max-h-40 overflow-y-auto p-4 text-[13px] space-y-2.5 bg-white dark:bg-zinc-950">
                                    {checkResult.previewData.invalid.map((err, idx) => (
                                        <div key={idx} className="text-rose-600 dark:text-rose-400 font-medium">
                                            Row {err.row}: {err.reason} <span className="text-zinc-400 text-[10px] ml-2 font-mono">({JSON.stringify(err.data.ticker)})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-[13px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p>총 <b>{checkResult.summary.validRows}개</b>의 데이터를 내 포트폴리오에 동기화할 수 있습니다.</p>
                            <p className="text-[11px] text-zinc-400 mt-1">* 잘못된 항목은 건너뛰며, 기존 항목은 업데이트됩니다.</p>
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
