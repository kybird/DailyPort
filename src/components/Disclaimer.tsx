import { AlertTriangle } from 'lucide-react'

interface DisclaimerProps {
    variant?: 'full' | 'compact'
    className?: string
}

export default function Disclaimer({ variant = 'full', className = '' }: DisclaimerProps) {
    if (variant === 'compact') {
        return (
            <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
                본 서비스는 금융투자상품에 대한 자문, 추천, 일임을 제공하지 않습니다.
                모든 투자 결정과 그 결과는 투자자 본인에게 귀속됩니다.
            </p>
        )
    }

    return (
        <div className={`bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-semibold">투자 리스크 안내</p>
                    <ul className="space-y-1 text-amber-700 dark:text-amber-300">
                        <li>• 본 서비스는 금융투자상품에 대한 자문, 추천, 일임을 제공하지 않습니다.</li>
                        <li>• 제공되는 정보는 투자 권유 또는 조언이 아닙니다.</li>
                        <li>• 모든 투자 결정과 그에 따른 손익은 투자자 본인에게 귀속됩니다.</li>
                        <li>• 과거의 결과가 미래의 수익을 보장하지 않습니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
