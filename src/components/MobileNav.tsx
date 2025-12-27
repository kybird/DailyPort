'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    const [mounted, setMounted] = useState(false)
    const navItems = getNavItems(role)

    // Handle hydration
    useEffect(() => {
        setMounted(true)
    }, [])

    // Close drawer when pathname changes
    useEffect(() => {
        if (open) {
            onClose();
            setNavigatingTo(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

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

    if (!mounted) return null

    const drawerContent = (
        <div
            className={`fixed inset-0 z-[100000] md:hidden ${open ? 'visible' : 'invisible'
                }`}
        >
            {/* Dark Overlay (Backdrop) */}
            <div
                className={`absolute inset-0 bg-zinc-950/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${open ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Main Drawer Panel */}
            <aside
                className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[300px] h-full bg-white dark:bg-zinc-950 flex flex-col shadow-2xl transition-transform duration-300 ease-out transform ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header Section */}
                <div className="flex items-center justify-between px-6 h-16 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 shrink-0">
                    <Link href="/" className="flex items-center gap-2 group" onClick={() => setNavigatingTo('/')}>
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                            DailyPort
                        </span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto pt-4 pb-8 px-4 space-y-1.5 bg-white dark:bg-zinc-950">
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
                                className={`flex items-center justify-between px-4 py-3.5 text-[15px] font-bold rounded-2xl transition-all ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-zinc-600 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {item.icon(isActive)}
                                    <span>{item.label}</span>
                                </div>
                                {isNavigating && <Loader2 size={18} className="animate-spin" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom Footer Section */}
                <div className="mt-auto p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/30">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">
                            Logic Lab
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                            &copy; 2025 DailyPort. Secure Analysis.
                        </span>
                    </div>
                </div>
            </aside>
        </div>
    )

    return createPortal(drawerContent, document.body)
}
