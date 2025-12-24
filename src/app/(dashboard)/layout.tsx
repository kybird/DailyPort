
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutDashboard, User, Info } from 'lucide-react'
import TopPanel from '@/components/TopPanel'


import { AnalysisProvider } from '@/context/AnalysisContext'

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

    return (
        <AnalysisProvider>
            <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
                {/* Sidebar - Mobile hidden for now, simple implementation */}
                <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:block transition-colors">
                    <div className="p-4 mb-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                                <LayoutDashboard size={18} />
                            </div>
                            <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                                DailyPort
                            </span>
                        </Link>
                    </div>

                    <nav className="px-4 space-y-2">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-100 dark:bg-zinc-800"
                        >
                            <LayoutDashboard size={18} className="text-blue-600" />
                            대시보드
                        </Link>

                        <Link
                            href="/algo-picks"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg transition-colors"
                        >
                            {/* Using a Trophy icon for Algo Picks */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                            Algo Picks
                        </Link>

                        <Link
                            href="/algo-picks/about"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg transition-colors"
                        >
                            <Info size={18} className="text-zinc-500" />
                            스크리닝 기법 소개
                        </Link>
                    </nav>
                </aside>


                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    <TopPanel />
                    <div className="p-4 md:p-8">
                        {children}
                    </div>
                </main>

            </div>
        </AnalysisProvider>
    )
}
