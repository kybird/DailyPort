
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
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

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return (
        <AnalysisProvider>
            <div className="flex min-h-screen bg-stone-200 dark:bg-black transition-colors duration-300">
                {/* Sidebar - Mobile hidden for now, simple implementation */}
                <Sidebar role={profile?.role || 'user'} />


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
