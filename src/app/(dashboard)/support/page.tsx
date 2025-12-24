import { MessageCircle, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SupportPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-10 py-10 px-4">
            <header className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    대시보드로 돌아가기
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <MessageCircle size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Support & Feedback</h1>
                        <p className="text-zinc-500">데일리포트의 발전을 위한 소중한 의견을 기다립니다.</p>
                    </div>
                </div>
            </header>

            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">건의사항 및 버그 제보</h2>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        서비스 이용 중 불편한 점이나 추가되었으면 하는 기능이 있다면 언제든 말씀해 주세요.
                        사용자분의 피드백은 데일리포트를 더 똑똑하게 만드는 데 큰 도움이 됩니다.
                    </p>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center space-y-4">
                    <p className="text-zinc-600 dark:text-zinc-300 font-medium">
                        현재 피드백 시스템을 준비 중입니다. 🛠️
                    </p>
                    <p className="text-sm text-zinc-400">
                        급한 제보나 문의는 아래 버튼을 통해 깃허브 이슈를 활용해 주세요.
                    </p>
                    <a
                        href="https://github.com/kybird/DailyPort/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl hover:scale-105 transition-transform"
                    >
                        <Send size={18} />
                        GitHub Issue로 제보하기
                    </a>
                </div>
            </section>
        </div>
    )
}
