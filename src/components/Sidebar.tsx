
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Info, Loader2, Shield } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar({ role }: { role?: string }) {
    const pathname = usePathname()
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

    // Reset navigating state when pathname changes (modern React pattern)
    const [lastPathname, setLastPathname] = useState(pathname)
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setNavigatingTo(null)
    }

    const navItems = [
        {
            href: '/dashboard',
            label: '대시보드',
            icon: (isActive: boolean) => <LayoutDashboard size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },
        {
            href: '/watchlist',
            label: '관심종목',
            icon: (isActive: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive ? 'text-blue-600' : 'text-zinc-500'}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            )
        },
        {
            href: '/portfolio',
            label: '내 포트폴리오',
            icon: (isActive: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive ? 'text-blue-600' : 'text-zinc-500'}>
                    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
            )
        },
        {
            href: '/algo-picks',
            label: 'Algo Picks',
            icon: (isActive: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive ? 'text-blue-600' : 'text-zinc-500'}>
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
            )
        },

        {
            href: '/algo-picks/about',
            label: '스크리닝 기법 소개',
            icon: (isActive: boolean) => <Info size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },
        ...(role === 'admin' ? [{
            href: '/admin',
            label: 'Admin 관리',
            icon: (isActive: boolean) => <Shield size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        }] : [])
    ]


    return (
        <aside className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-900 hidden md:block transition-colors shrink-0">
            <div className="p-4 mb-2">
                <Link href="/" className="flex items-center gap-2 group relative" onClick={() => setNavigatingTo('/')}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                        <LayoutDashboard size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
                            DailyPort
                        </span>
                        {navigatingTo === '/' && (
                            <span className="text-[10px] text-blue-500 font-bold animate-pulse absolute -bottom-4 left-10">홈으로 이동 중...</span>
                        )}
                    </div>
                    {navigatingTo === '/' && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
                        </div>
                    )}
                </Link>
            </div>

            <nav className="px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const isNavigating = navigatingTo === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                                if (!isActive) setNavigatingTo(item.href)
                            }}
                            className={`flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isActive
                                ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {item.icon(isActive)}
                                {item.label}
                            </div>
                            {isNavigating && <Loader2 size={14} className="animate-spin text-blue-500" />}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
