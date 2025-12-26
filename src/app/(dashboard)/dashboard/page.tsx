
import { createClient } from '@/utils/supabase/server'
import MarketIndexChart from '@/components/MarketIndexChart'

export default async function Dashboard() {
    const supabase = await createClient()

    await supabase.auth.getUser()

    return (
        <div className="space-y-10">
            {/* Market Indices Section */}
            <div className="space-y-4">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white">시장 지수</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MarketIndexChart index="KOSPI" />
                    <MarketIndexChart index="KOSDAQ" />
                </div>
            </div>

            {/* Welcome message or shortcuts could go here */}
            <div className="bg-white dark:bg-neutral-900/50 p-8 rounded-2xl border border-neutral-200/60 dark:border-white/5 shadow-md backdrop-blur-sm transition-colors">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">환영합니다!</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    좌측 패널에서 <b>관심종목</b>과 <b>내 포트폴리오</b>를 확인하실 수 있습니다.
                    더욱 빠른 대시보드 로딩을 위해 각 항목이 별도 페이지로 분리되었습니다.
                </p>
            </div>
        </div>
    )
}
