
import Link from 'next/link'
import { resetPassword } from '../actions'

export default async function ForgotPassword({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const message = (await searchParams).message

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-background p-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">비밀번호 찾기</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                        가입하신 이메일 주소를 입력하시면<br />
                        비밀번호 재설정 링크를 보내드립니다.
                    </p>
                </div>

                <form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="email">
                            이메일 주소
                        </label>
                        <input
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                            name="email"
                            type="email"
                            placeholder="name@company.com"
                            required
                        />
                    </div>

                    <button
                        formAction={resetPassword}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                        재설정 링크 보내기
                    </button>

                    {message && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm text-center border border-blue-100 dark:border-blue-900/30 font-medium">
                            {message}
                        </div>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                        로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    )
}
