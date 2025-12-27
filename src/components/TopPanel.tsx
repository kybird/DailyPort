'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Github, User, MessageCircle, Menu } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import MobileNav from './MobileNav'

export default function TopPanel({ role }: { role?: string }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <nav className="relative z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-stone-200 dark:bg-zinc-950/80 backdrop-blur-md">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2 md:gap-6">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors z-50"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Logo for Mobile/Desktop */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 flex items-center justify-center">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-lg font-black tracking-tighter text-zinc-900 dark:text-white leading-none hide-on-very-small">
                                DailyPort
                            </span>
                        </Link>
                    </div>


                    <div className="flex items-center gap-1 sm:gap-3">
                        <Link
                            href="/support"
                            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            aria-label="Support & Feedback"
                        >
                            <MessageCircle size={20} />
                        </Link>

                        <Link
                            href="/mypage"
                            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            aria-label="My Page"
                        >
                            <User size={20} />
                        </Link>

                        <a
                            href="https://github.com/kybird/DailyPort"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            aria-label="GitHub Repository"
                        >
                            <Github size={20} />
                        </a>

                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            <MobileNav
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                role={role}
            />
        </nav>
    )
}

