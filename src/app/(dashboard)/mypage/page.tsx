
import AddStockDialog from '@/components/AddStockDialog'
import GoogleSheetSyncDialog from '@/components/GoogleSheetSyncDialog'
import { Settings2, ShieldCheck, Wallet } from 'lucide-react'

export default function MyPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white">마이페이지</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">포트폴리오 설정 및 데이터 동기화를 관리합니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Portfolio Management Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-6">
                        <Wallet size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">포트폴리오 관리</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
                        새로운 종목을 추가하거나 보유 리스트를 관리하세요.
                    </p>
                    <AddStockDialog />
                </div>

                {/* Data Sync Card */}
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-6">
                        <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">데이터 동기화</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">
                        구글 시트에서 최신 포트폴리오 데이터를 불러옵니다.
                    </p>
                    <GoogleSheetSyncDialog />
                </div>
            </div>

            {/* Security Notice */}
            <div className="bg-zinc-100 dark:bg-zinc-900/50 p-6 rounded-xl flex items-start gap-4 border border-zinc-200 dark:border-zinc-800">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                    <ShieldCheck size={20} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">보안 안내</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        DailyPort는 귀하의 금융 API 키를 서버에 절대 저장하지 않습니다. 모든 요청은 로컬 환경에서 안전하게 처리됩니다.
                    </p>
                </div>
            </div>
        </div>
    )
}
