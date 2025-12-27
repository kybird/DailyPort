
import { updatePassword } from '../actions'

export default async function UpdatePassword({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const message = (await searchParams).message

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-background p-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">새 비밀번호 설정</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                        새로운 비밀번호를 입력해주세요.
                    </p>
                </div>

                <form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="password">
                            새 비밀번호
                        </label>
                        <input
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="password-confirm">
                            새 비밀번호 확인
                        </label>
                        <input
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-400"
                            type="password"
                            name="password-confirm"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        formAction={updatePassword}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                        비밀번호 변경하기
                    </button>

                    {message && (
                        <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-900/30 font-medium">
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
