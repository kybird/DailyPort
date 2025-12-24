
import { ArrowLeft, DollarSign, Zap, Box, CheckCircle2, Target, BarChart3, LineChart, ArrowRight } from 'lucide-react'

export default function GuruAboutPage() {
    const strategies = [
        {
            id: 'value',
            title: '저평가 우량주 (Value Picks)',
            icon: DollarSign,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
            description: 'PER과 PBR 지표를 활용하여 시장 가치 대비 저평가된 우량 종목을 선별합니다.',
            logic: [
                'PER(주가수익비율) 0~12 사이',
                'PBR(주가순자산비율) 0.3~1.1 사이',
                '지나치게 낮은 PBR은 제외하여 "가치 함정(Value Trap)" 방지'
            ],
            target: '안정적인 가치 투자를 선호하는 장기 투자자'
        },
        {
            id: 'twin',
            title: '기관/외인 동반매수 (Twin Engines)',
            icon: Zap,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-950/30',
            description: '소위 "스마트 머니"로 불리는 기관과 외국인이 동시에 순매수하는 종목을 찾습니다.',
            logic: [
                '금일 외국인 순매수 > 0',
                '금일 기관 순매수 > 0',
                '합산 순매수 대금이 높은 순으로 정렬'
            ],
            target: '시장 주도주와 강한 수급 모멘텀을 추종하는 스윙 투자자'
        },
        {
            id: 'acc',
            title: '외국인 매집/횡보 (Foreigner Accumulation)',
            icon: Box,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30',
            description: '주가는 횡보하고 있지만 외국인은 꾸준히 지분을 늘려가는 매집 단계의 종목을 포착합니다.',
            logic: [
                '최근 20거래일 동안 외국인 순매수 합계 > 0',
                '최근 21거래일간 주가 변동폭이 12% 이내 (횡보)',
                '에너지를 응축하고 있는 상승 전야의 종목'
            ],
            target: '선취매를 통해 안정적인 수익 구간을 노리는 전략적 투자자'
        },
        {
            id: 'trend',
            title: '추세추종 (Trend Following)',
            icon: LineChart,
            color: 'text-rose-500',
            bgColor: 'bg-rose-50 dark:bg-rose-950/30',
            description: '강한 상승 추세를 형성하고 있으며 전 고점 돌파 가능성이 높은 종목을 발굴합니다.',
            logic: [
                '단기/중기 이동평균선 정배열 (MA20 > MA60)',
                '현재 주가가 6개월(120일) 최고가 대비 10% 이내 위치',
                '추세 강도(Momentum)가 높은 순으로 추출'
            ],
            target: '추세의 힘을 믿고 돌파 매매를 선호하는 공격적 투자자'
        }
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <header className="space-y-4">
                <Link
                    href="/algo-picks"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Algo Picks로 돌아가기
                </Link>
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
                    DailyPort의 알고리즘<br />
                    <span className="text-blue-600 dark:text-blue-400 text-3xl">스크리닝 기법 소개</span>
                </h1>
                <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl">
                    DailyPort는 기술적 지표와 수급 데이터를 결합한 퀀트 알고리즘을 통해 시장의 기회를 매일 아침 선별하여 제공합니다.
                </p>
            </header>

            <div className="space-y-16">
                {strategies.map((s) => {
                    const Icon = s.icon
                    return (
                        <section key={s.id} className="relative group">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className={`p-4 rounded-2xl ${s.bgColor} ${s.color} shrink-0 ring-1 ring-black/5 dark:ring-white/10`}>
                                    <Icon size={32} />
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                            {s.title}
                                        </h2>
                                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">
                                            {s.description}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800">
                                            <h4 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-200 mb-4">
                                                <BarChart3 size={18} className="text-blue-500" />
                                                수식 및 로직
                                            </h4>
                                            <ul className="space-y-3">
                                                {s.logic.map((item, idx) => (
                                                    <li key={idx} className="flex gap-2 text-sm text-zinc-500">
                                                        <CheckCircle2 size={16} className="text-zinc-300 shrink-0 mt-0.5" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800">
                                            <h4 className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-200 mb-4">
                                                <Target size={18} className="text-emerald-500" />
                                                추천 투자 대상
                                            </h4>
                                            <p className="text-sm text-zinc-500 leading-relaxed">
                                                {s.target}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )
                })}
            </div>

            <footer className="pt-20 border-t border-zinc-100 dark:border-zinc-800">
                <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-10 text-white text-center space-y-4">
                    <h3 className="text-2xl font-bold">지금 바로 종목을 확인해보세요</h3>
                    <p className="opacity-80">데이터는 매 영업일 오전 8시~11시 사이에 최신화됩니다.</p>
                    <div className="pt-4">
                        <Link
                            href="/algo-picks"
                            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform"
                        >
                            오늘의 픽 보기
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
