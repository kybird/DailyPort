
'use client'

import { useFormStatus } from 'react-dom'
import { login } from '../actions'

export default function LoginButton() {
    const { pending } = useFormStatus()

    return (
        <button
            formAction={login}
            disabled={pending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {pending ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    로그인 중...
                </>
            ) : (
                '로그인'
            )}
        </button>
    )
}
