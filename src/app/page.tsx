
import Link from 'next/link'
import { LayoutDashboard, Zap, BarChart3 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        return redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">

            {/* Navigation */}
            <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">DailyPort <span className="text-[10px] text-blue-600 block leading-none">Logic Lab</span></span>
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
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-6 break-keep">
                            막연한 예측 대신,<br className="hidden md:block" />
                            <span className="text-blue-600 block md:inline mt-2 md:mt-0">수치화된 모델로 필터링하세요.</span>
                        </h1>


                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
                            전략 시뮬레이션부터 정교한 알고리즘 검증 로직까지.<br />
                            투명한 데이터와 수치로 완성하는 당신만의 <b>Logic Lab</b>, DailyPort와 함께하세요.
                        </p>
                        <div className="flex justify-center mt-10">
                            <Link href="/signup" className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3">
                                무료로 시작하기 <span className="text-blue-200">→</span>
                            </Link>
                        </div>

                    </div>
                </section>

                {/* Feature Grid */}
                <section className="py-24 bg-white dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">성능 시뮬레이션</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                과거 데이터와 현재 시장 상황을 결합한 <b>알고리즘 검증</b> 시스템입니다.
                                설정한 전략의 유효성을 실시간 수치로 확인하세요.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">전략 출력 브리핑</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                추천이 아닌 시스템 조건을 충족한 <b>&apos;필터링된 데이터(Algo Logic Output)&apos;</b>를
                                매일 아침 브리핑하여 분석 리소스를 절감합니다.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">분석 투명성 중심</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                모든 수치는 공개된 알고리즘에 의해 자동 산출됩니다.
                                <b>DailyPort</b>는 주관적 판단을 배제하고 오직 데이터 기반의 검증된 결과만 제공합니다.
                            </p>
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
