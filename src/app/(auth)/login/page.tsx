import Link from 'next/link'
import LoginButton from './LoginButton'
import SocialLoginButtons from './SocialLoginButtons'

export default async function Login({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const message = (await searchParams).message

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-background transition-colors duration-300">

            {/* Left Side: Hero Section (Gido-meta) */}
            <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-zinc-900 items-center justify-center p-12">
                <div
                    className="absolute inset-0 z-0 opacity-60 bg-cover bg-center"
                    style={{ backgroundImage: 'url("/gido-meta.jpg")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50 z-10" />

                <div className="relative z-20 max-w-lg text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
                        검증된 알고리즘의<br />
                        <span className="text-blue-500">투명성</span>,<br />
                        데일리포트 <span className="text-sm align-top text-zinc-400">Logic Lab</span>
                    </h1>
                    <p className="text-xl text-zinc-300 font-medium">
                        &quot;막연한 예측이 아닌 데이터 기반의 검증&quot;<br />
                        수치화된 모델로 필터링하고 시스템으로 완성하는<br />
                        스마트한 전략가의 도구.
                    </p>
                </div>

                <div className="absolute bottom-8 left-12 z-20 flex items-center gap-2 text-zinc-400 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Real-time Market Data Synced</span>
                </div>
            </div>

            {/* Right Side: Login Form */}
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

                <div className="mb-6 flex justify-center md:hidden">
                    <div className="w-12 h-12">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                <div className="w-full max-w-sm">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">반갑습니다!</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">검증된 전략으로 시뮬레이션을 시작하세요.</p>
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
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="password">
                                    비밀번호
                                </label>
                                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">비밀번호 찾기</Link>
                            </div>
                            <input
                                className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <LoginButton />

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-200 dark:border-zinc-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-400">또는</span>
                            </div>
                        </div>

                        <SocialLoginButtons />

                        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
                            처음이신가요?{' '}
                            <Link href="/signup" className="text-blue-600 font-bold hover:underline">
                                무료 회원가입
                            </Link>
                        </p>

                        {message && (
                            <div className="mt-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-500/20 font-bold animate-pulse">
                                {message === "Could not authenticate user" ? "아이디 또는 비밀번호가 올바르지 않습니다." : message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
