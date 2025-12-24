
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Info } from 'lucide-react'
import TopPanel from '@/components/TopPanel'
import Sidebar from '@/components/Sidebar'


import { AnalysisProvider } from '@/context/AnalysisContext'

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

    return (
        <AnalysisProvider>
            <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
                {/* Sidebar - Mobile hidden for now, simple implementation */}
                <Sidebar />


                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    <TopPanel />
                    <div className="p-4 md:p-8">
                        {children}
                    </div>
                </main>

            </div>
        </AnalysisProvider>
    )
}
