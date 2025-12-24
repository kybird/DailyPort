
import { LayoutDashboard, Loader2 } from 'lucide-react'

interface GlobalLoadingProps {
    fullScreen?: boolean
    message?: string
}

export default function GlobalLoading({ fullScreen = false, message = "데이터를 불러오는 중입니다" }: GlobalLoadingProps) {
    return (
        <div className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-background z-50' : 'min-h-[60vh]'} space-y-4`}>
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                    <LayoutDashboard size={24} />
                </div>
            </div>
            <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white animate-pulse">{message}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">잠시만 기다려 주세요...</p>
            </div>

            {!fullScreen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-12 opacity-30">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800"></div>
                    ))}
                </div>
            )}
        </div>
    )
}
