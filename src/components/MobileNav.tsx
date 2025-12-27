'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { getNavItems } from './Sidebar'

interface MobileNavProps {
    open: boolean
    onClose: () => void
    role?: string
}

export default function MobileNav({ open, onClose, role }: MobileNavProps) {
    const pathname = usePathname()
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
    const navItems = getNavItems(role)

    // Close when path changes
    useEffect(() => {
        onClose()
        setNavigatingTo(null)
    }, [pathname, onClose])

    // Body scroll lock
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Content */}
            <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-neutral-950 shadow-2xl transition-transform duration-300 transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
                        <Link href="/" className="flex items-center gap-2" onClick={() => setNavigatingTo('/')}>
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                            <span className="text-lg font-black tracking-tighter text-zinc-900 dark:text-white">
                                DailyPort
                            </span>
                        </Link>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 space-y-2">
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
                                    className={`flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${isActive
                                        ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon(isActive)}
                                        {item.label}
                                    </div>
                                    {isNavigating && <Loader2 size={16} className="animate-spin text-blue-500" />}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-900">
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 text-center font-medium">
                            © 2025 DailyPort Logic Lab
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    )
}
