
import Link from 'next/link'
import { LayoutDashboard, Github, Shield, Zap, BarChart3 } from 'lucide-react'
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
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white mb-6 break-keep">
                            더 안전하고 현명하게,<br className="hidden md:block" />
                            <span className="text-blue-600 block md:inline mt-2 md:mt-0">포트폴리오 관리를 시작하세요.</span>
                        </h1>


                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
                            DailyPort는 증권사 API 키를 서버에 저장하지 않습니다.<br />
                            민감한 정보는 로컬에, 분석과 관리는 웹 대시보드에서 안전하게 경험하세요.
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
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">내 투자는 내 공간에</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                증권사 계정과 포트폴리오 정보가 서버로 전송되지 않습니다.
                                오직 당신의 <b>로컬 DB</b>에 암호화되어 안전하게 저장됩니다.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">매일 아침 투자 비서</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                24시간 차트를 볼 필요 없습니다.
                                알고리즘이 밤새 발굴한 <b>'수급 급등주(Guru Picks)'</b>를 매일 아침 브리핑해드립니다.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">더 소중한 일상에 집중하세요</h3>
                            <p className="text-zinc-600 dark:text-zinc-400 keep-all">
                                하루 종일 호가창을 들여다볼 필요 없습니다.
                                복잡한 수급 분석은 <b>DailyPort</b>에게 맡기고, 당신은 정리된 결과만 편하게 확인하세요.
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
