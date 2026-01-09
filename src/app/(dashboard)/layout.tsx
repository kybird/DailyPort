
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

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('Error fetching user profile:', profileError)
    }

    return (
        <AnalysisProvider>
            <div className="flex min-h-screen bg-stone-200 dark:bg-black transition-colors duration-300">
                {/* Sidebar - Mobile hidden for now, simple implementation */}
                <Sidebar role={profile?.role || 'user'} />


                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    {/* Alpha Version Banner (Todo 6) */}
                    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest sticky top-0 z-[60] shadow-sm">
                        🚧 Alpha Version - Under Development (데이터 정확성 주의) 🚧
                    </div>
                    <TopPanel role={profile?.role || 'user'} />
                    <div className="p-4 md:p-8">
                        {children}
                    </div>
                </main>

            </div>
        </AnalysisProvider>
    )
}
