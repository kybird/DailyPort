'use client'

import { useState, useEffect } from 'react'
import { Send, Save, Loader2, Info } from 'lucide-react'
import { getSettings, updateSettings, sendTestTelegram } from '@/app/actions-settings'

export default function SettingsForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)

    // Form State
    const [chatId, setChatId] = useState('')
    const [botToken, setBotToken] = useState('')

    // Status Message
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        const loadSettings = async () => {
            const res = await getSettings()
            if (res.data) {
                setChatId(res.data.telegram_chat_id || '')
                setBotToken(res.data.telegram_bot_token || '')
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        const formData = new FormData()
        formData.append('telegram_chat_id', chatId)
        formData.append('telegram_bot_token', botToken)

        const res = await updateSettings(formData)
        setSaving(false)

        if (res.error) {
            setMessage({ type: 'error', text: res.error })
        } else {
            setMessage({ type: 'success', text: '설정이 저장되었습니다.' })
        }
    }

    const handleTest = async () => {
        if (!chatId || !botToken) {
            setMessage({ type: 'error', text: 'Chat ID와 Bot Token을 모두 입력해주세요.' })
            return
        }
        setTesting(true)
        setMessage(null)

        const res = await sendTestTelegram(chatId, botToken)
        setTesting(false)

        if (res.error) {
            setMessage({ type: 'error', text: `전송 실패: ${res.error}` })
        } else {
            setMessage({ type: 'success', text: '테스트 메시지를 보냈습니다! 텔레그램을 확인하세요.' })
        }
    }

    if (loading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>

    return (
        <form onSubmit={handleSave} className="space-y-4">

            <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Telegram Bot Token</label>
                <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrs..."
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Info size={12} />
                    <span>BotFather에게 받은 HTTP API Token을 입력하세요.</span>
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Telegram Chat ID</label>
                <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Info size={12} />
                    <span>봇에게 메시지를 보낼 채팅방의 ID입니다. (userinfobot 등으로 확인 가능)</span>
                </p>
            </div>

            {message && (
                <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    저장하기
                </button>
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !chatId || !botToken}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    테스트
                </button>
            </div>
        </form>
    )
}
