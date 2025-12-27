
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Info, Loader2, Shield, Star, Briefcase, Microscope } from 'lucide-react'
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
            label: '시뮬레이션 현황',
            icon: (isActive: boolean) => <LayoutDashboard size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },
        {
            href: '/watchlist',
            label: '관심종목',
            icon: (isActive: boolean) => <Star size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },
        {
            href: '/portfolio',
            label: '전략 시뮬레이션',
            icon: (isActive: boolean) => <Briefcase size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },
        {
            href: '/algo-picks',
            label: '검증 알고리즘',
            icon: (isActive: boolean) => <Microscope size={18} className={isActive ? 'text-blue-600' : 'text-zinc-500'} />
        },

        {
            href: '/algo-picks/about',
            label: '검증 기법 가이드',
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
                    <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
                            DailyPort <span className="text-[10px] text-blue-600 font-bold block mt-1 tracking-widest uppercase">Logic Lab</span>
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
