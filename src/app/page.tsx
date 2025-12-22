
import Link from 'next/link'

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
                    <div className="font-bold text-xl">DailyPort</div>
                    <div className="flex gap-4">
                        <Link href="/login" className="py-2 px-3 flex rounded-md no-underline hover:bg-btn-background-hover">Log In</Link>
                        <Link href="/signup" className="py-2 px-3 flex rounded-md no-underline bg-foreground text-background hover:bg-foreground/80">Sign Up</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center">
                <section className="w-full py-24 bg-gradient-to-b from-transparent to-gray-50">
                    <div className="max-w-4xl mx-auto text-center px-4">
                        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl mb-6">
                            내 로컬의 안전함과<br />웹의 편리함을 동시에
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                            DailyPort는 증권사 API 키를 서버에 저장하지 않습니다.
                            <br />
                            민감한 정보는 로컬에, 분석과 관리는 편리한 웹에서 경험하세요.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link href="/signup" className="px-8 py-3 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg">
                                무료로 시작하기
                            </Link>
                            <a href="https://github.com/kybird/daily-port" target="_blank" rel="noreferrer" className="px-8 py-3 text-base font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 md:py-4 md:text-lg">
                                GitHub Open Source
                            </a>
                        </div>
                    </div>
                </section>

                <section className="w-full py-20 border-t">
                    <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-lg font-bold mb-2">Zero-Knowledge Key Storage</h3>
                            <p className="text-gray-600">서버는 당신의 금융 계정 키를 모릅니다. 오직 로컬 스크립트만이 접근합니다.</p>
                        </div>
                        <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
                            <div className="text-4xl mb-4">⚡</div>
                            <h3 className="text-lg font-bold mb-2">On-Demand Analysis</h3>
                            <p className="text-gray-600">당신이 원할 때만 분석이 실행됩니다. 불필요한 서버 리소스를 낭비하지 않습니다.</p>
                        </div>
                        <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-lg font-bold mb-2">Hybrid Workflow</h3>
                            <p className="text-gray-600">구글 시트의 익숙함과 웹 대시보드의 직관성을 하나로 연결했습니다.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
                <p>
                    Powered by{' '}
                    <a
                        href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                        target="_blank"
                        className="font-bold hover:underline"
                        rel="noreferrer"
                    >
                        Supabase
                    </a>
                    {' '}& Next.js
                </p>
            </footer>
        </div>
    )
}
