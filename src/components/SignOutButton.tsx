'use client'

import { LogOut } from 'lucide-react'
import { signOutAction } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
    const router = useRouter()

    const handleSignOut = async () => {
        if (!confirm('로그아웃 하시겠습니까?')) return
        await signOutAction()
        router.push('/login')
        router.refresh()
    }

    return (
        <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-rose-500 transition-colors py-2 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10"
        >
            <LogOut size={14} />
            로그아웃
        </button>
    )
}
