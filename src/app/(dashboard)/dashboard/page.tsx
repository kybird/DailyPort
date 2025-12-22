
import { createClient } from '@/utils/supabase/server'
import AddStockDialog from '@/components/AddStockDialog'
import PortfolioList from '@/components/PortfolioList'
import { getPortfolio } from '@/app/actions'
import GoogleSheetSyncDialog from '@/components/GoogleSheetSyncDialog'
import MarketIndexChart from '@/components/MarketIndexChart'

export default async function Dashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const portfolioItems = await getPortfolio()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">My Portfolio</h2>
                <div className="space-x-2 flex items-center">
                    <AddStockDialog />
                    <GoogleSheetSyncDialog />
                </div>
            </div>

            {/* Market Indices Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MarketIndexChart index="KOSPI" />
                <MarketIndexChart index="KOSDAQ" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                    <p className="text-2xl font-bold mt-2">₩ 0</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Daily Change</h3>
                    <p className="text-2xl font-bold mt-2 text-gray-400">-</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Holdings</h3>
                    <p className="text-2xl font-bold mt-2">{portfolioItems?.length || 0}</p>
                </div>
            </div>

            <PortfolioList items={portfolioItems || []} />
        </div>
    )
}
