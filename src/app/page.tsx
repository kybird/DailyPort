
import Link from 'next/link'
import { LayoutDashboard, Github, Shield, Zap, BarChart3 } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
            {/* Navigation */}
            <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <LayoutDashboard size={18} />
                        </div>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">DailyPort</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">로그인</Link>
                        <Link href="/signup" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">시작하기</Link>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="relative py-24 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-6">
                            내 로컬의 안전함과<br />
                            <span className="text-blue-600">웹의 편리함을 동시에.</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
                            DailyPort는 증권사 API 키를 서버에 저장하지 않습니다.<br />
                            민감한 정보는 로컬에, 분석과 관리는 웹 대시보드에서 안전하게 경험하세요.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/signup" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 active:scale-95">
                                무료로 시작하기
                            </Link>
                            <a href="https://github.com/kybird/DailyPort" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl text-lg font-bold shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                                <Github size={20} /> GitHub 소스코드
                            </a>
                        </div>
                    </div>
                </section>

                {/* Feature Grid */}
                <section className="py-24 bg-white dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Zero-Knowledge Storage</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">서버는 당신의 금융 계정 키를 모릅니다. 모든 서명과 요청은 오직 로컬 환경에서만 수행됩니다.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">On-Demand Analysis</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">불필요한 서버 리소스를 낭비하지 않습니다. 당신이 원할 때, 필요한 데이터만 즉시 분석합니다.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Hybrid Workflow</h3>
                            <p className="text-zinc-600 dark:text-zinc-400">구글 시트의 데이터 유연성과 웹 대시보드의 직관성을 하나로 완벽하게 연결했습니다.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 transition-colors">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        &copy; 2025 DailyPort. All rights reserved. Built with Next.js & Supabase.
                    </p>
                </div>
            </footer>
        </div>
    )
}
