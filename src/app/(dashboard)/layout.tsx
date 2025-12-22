
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        return redirect('/login')
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar - Mobile hidden for now, simple implementation */}
            <aside className="w-64 bg-white shadow-md hidden md:block">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-gray-800">DailyPort</h1>
                </div>
                <nav className="p-4 space-y-2">
                    <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md bg-gray-50"
                    >
                        Dashboard
                    </Link>
                    <div className="pt-4 border-t mt-4">
                        {/* Future Nav Items */}
                    </div>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate max-w-[100px]">{user.email}</span>
                        <form action={signOut}>
                            <button className="text-sm text-red-600 hover:text-red-800">Sign Out</button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white shadow-sm p-4 md:hidden flex justify-between items-center">
                    <span className="font-bold">DailyPort</span>
                    <form action={signOut}>
                        <button className="text-sm text-red-600">Sign Out</button>
                    </form>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
