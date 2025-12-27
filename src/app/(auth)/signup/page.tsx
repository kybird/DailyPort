import Link from 'next/link'
import { signup } from '../actions'

export default async function Signup({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const message = (await searchParams).message

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-background transition-colors duration-300">
            {/* Left Side: Hero Section (Matching Login) */}
            <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-zinc-900 items-center justify-center p-12">
                <div
                    className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: 'url("/gido-meta.jpg")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50 z-10" />

                <div className="relative z-20 max-w-lg text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
                        데이터로 증명하는<br />
                        <span className="text-blue-500">투자 본능</span>,<br />
                        데일리포트 <span className="text-sm align-top text-zinc-400">Logic Lab</span>
                    </h1>
                    <p className="text-xl text-zinc-300 font-medium">
                        &quot;감이 아닌 통계로 승부하세요&quot;<br />
                        검증된 알고리즘과 투명한 데이터가<br />
                        당신의 한계를 확장합니다.
                    </p>
                </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative">
                <Link
                    href="/"
                    className="absolute left-8 top-8 py-2 px-4 rounded-full no-underline text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center group text-sm font-medium transition-all"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 transition-transform group-hover:-translate-x-1"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    홈으로
                </Link>

                <div className="w-full max-w-sm">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">무료로 시작하기</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">당신만의 투자 시뮬레이션을 구축하세요.</p>
                    </div>

                    <form className="flex flex-col w-full gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="email">
                                이메일 주소
                            </label>
                            <input
                                className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                                name="email"
                                type="email"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="password">
                                비밀번호 (6자 이상)
                            </label>
                            <input
                                className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            formAction={signup}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] mt-2"
                        >
                            회원가입 완료
                        </button>

                        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-blue-600 font-bold hover:underline">
                                로그인하기
                            </Link>
                        </p>

                        {message && (
                            <div className="mt-2 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm text-center border border-orange-100 dark:border-orange-500/20 font-bold animate-in fade-in duration-300">
                                {message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
