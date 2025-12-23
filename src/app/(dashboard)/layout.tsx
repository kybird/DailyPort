
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutDashboard, User } from 'lucide-react'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        return redirect('/login')
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
            {/* Sidebar - Mobile hidden for now, simple implementation */}
            <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:block transition-colors">
                <nav className="p-4 space-y-2 mt-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-100 dark:bg-zinc-800"
                    >
                        <LayoutDashboard size={18} className="text-blue-600" />
                        대시보드
                    </Link>
                    <Link
                        href="/mypage"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg transition-colors"
                    >
                        <User size={18} />
                        마이페이지
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{user.email}</span>
                        <form action={signOut}>
                            <button className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">로그아웃</button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 md:hidden flex justify-between items-center transition-colors">
                    <span className="font-black text-zinc-900 dark:text-white text-lg">Menu</span>
                    <form action={signOut}>
                        <button className="text-sm font-bold text-red-600">로그아웃</button>
                    </form>
                </header>
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
