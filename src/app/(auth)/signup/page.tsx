
import Link from 'next/link'
import { signup } from '../actions'

export default async function Signup({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const message = (await searchParams).message

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-background flex flex-col items-center justify-center w-full px-8">
            <div className="w-full sm:max-w-md flex flex-col gap-2">
                <Link
                    href="/"
                    className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </Link>

                <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                    <label className="text-md" htmlFor="email">
                        Email
                    </label>
                    <input
                        className="rounded-md px-4 py-2 bg-inherit border mb-6"
                        name="email"
                        placeholder="you@example.com"
                        required
                    />
                    <label className="text-md" htmlFor="password">
                        Password
                    </label>
                    <input
                        className="rounded-md px-4 py-2 bg-inherit border mb-6"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        formAction={signup}
                        className="bg-green-700 rounded-md px-4 py-2 text-foreground mb-2"
                    >
                        Sign Up
                    </button>
                    <p className="text-sm text-center">
                        Already have an account?{' '}
                        <Link href="/login" className="underline">
                            Sign In
                        </Link>
                    </p>
                    {message && (
                        <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center">
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
