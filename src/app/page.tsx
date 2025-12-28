import Link from 'next/link'
import { LayoutDashboard, ShieldCheck, Microscope, Database, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

function VectorLogo({ className = "w-8 h-8" }: { className?: string }) {
    return (
        <div className={`relative ${className} flex items-center justify-center`}>
            <div className="absolute inset-0 bg-blue-600 rounded-lg rotate-12 opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 bg-blue-600 rounded-lg -rotate-6 opacity-20"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center p-1.5 shadow-lg shadow-blue-500/30">
                <LayoutDashboard className="text-white w-full h-full" strokeWidth={2.5} />
            </div>
        </div>
    )
}

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
                    <div className="flex items-center gap-3">
                        <VectorLogo />
                        <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">DailyPort <span className="text-[10px] text-blue-600 block leading-none font-bold uppercase tracking-wider">Logic Lab</span></span>
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
                            <span className="text-blue-600 block md:inline mt-2 md:mt-0">데이터 기반 의사결정</span>
                        </h1>


                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
                            투명한 알고리즘과 공개된 수치로<br />
                            투자 판단을 위한 데이터 기반 분석을 제공합니다.
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
                        <div className="group space-y-4 p-8 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                                <Microscope size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">백테스트 검증</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                과거 시장 데이터 기반으로 설정한 조건 세트의 결과를 시뮬레이션합니다.
                            </p>
                        </div>
                        <div className="group space-y-4 p-8 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                                <Database size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">일일 필터링 리포트</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                설정한 조건을 충족하는 종목만 자동으로 추출하여 분석 리소스를 절감합니다.
                            </p>
                        </div>
                        <div className="group space-y-4 p-8 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">투명한 분석</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                모든 결과는 공개 알고리즘으로 자동 산출됩니다. 주관적 판단을 배제한 데이터 기반 분석입니다.
                            </p>
                        </div>
                    </div>

                </section>
            </main>

            {/* Enhanced Footer with Legal Disclaimers */}
            <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 transition-colors">
                {/* Investment Risk Disclaimer */}
                <div className="border-b border-zinc-200 dark:border-zinc-800">
                    <div className="max-w-7xl mx-auto px-4 py-6">
                        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                                <p className="font-semibold">투자 리스크 안내</p>
                                <p className="text-amber-700 dark:text-amber-300">
                                    본 서비스는 금융투자상품에 대한 자문, 추천, 일임을 제공하지 않습니다.
                                    제공되는 정보는 투자 권유 또는 조언이 아닙니다.
                                    모든 투자 결정과 그에 따른 손익은 투자자 본인에게 귀속됩니다.
                                    과거의 결과가 미래의 수익을 보장하지 않습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Sources */}
                <div className="border-b border-zinc-200 dark:border-zinc-800">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                            <span className="font-medium">데이터 출처:</span> 시세 데이터 - Yahoo Finance | 재무 데이터 - DART 전자공시시스템 | 기업 정보 - Naver Finance
                        </p>
                    </div>
                </div>

                {/* Legal Links & Copyright */}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6 text-sm">
                            <Link href="/privacy" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                개인정보처리방침
                            </Link>
                            <Link href="/terms" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                이용약관
                            </Link>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            &copy; 2025 DailyPort. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
