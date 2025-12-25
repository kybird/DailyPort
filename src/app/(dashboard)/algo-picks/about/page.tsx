
import Link from 'next/link'
import { ArrowLeft, DollarSign, Zap, Box, CheckCircle2, Target, BarChart3, LineChart, ArrowRight } from 'lucide-react'

export default function AlgoAboutPage() {
    const strategies = [
        {
            id: 'value',
            title: '저평가 우량주 (Value Picks)',
            icon: DollarSign,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
            description: 'PER/PBR을 통한 밸류에이션 점검과 동시에 수익성(ROE/영업이익률)을 검증하여 가치 함정을 피합니다.',
            logic: [
                'ROE(자기자본이익률) 10% 이상 (효율적 자본 운용)',
                '영업이익률 5% 이상 (본업의 높은 수익성)',
                'PER 12배 미만 & PBR 0.3~1.1 사이 (저평가 매력)'
            ],
            target: '안정적인 펀더멘털과 저평가 매력을 겸비한 우량주 투자'
        },
        {
            id: 'twin',
            title: '기관/외인 동반매수 (Twin Engines)',
            icon: Zap,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-950/30',
            description: '단순 매수가 아닌 시가총액 대비 유의미한 수급 강도와 매수 연속성을 가진 종목을 선별합니다.',
            logic: [
                '수급강도: (외인+기관 합산 매수액 / 시총) 0.05% 이상',
                '연속성: 최근 3거래일 중 2일 이상 동반 또는 강세 매수',
                '가격위치: 현재가 < 20일 이동평균선 + 10% (추격매수 방지)'
            ],
            target: '메이저 수급이 유입되는 시장 주도주 모멘텀 투자'
        },
        {
            id: 'acc',
            title: '외국인 매집/횡보 (Foreigner Accumulation)',
            icon: Box,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30',
            description: '변동성이 축소된 Box권 구간에서 외국인이 지분을 늘려가는 "에너지 응축" 종목을 포착합니다.',
            logic: [
                '박스권 응축: 최근 20일 주가 변동폭 10% 이내 (변동성 축소)',
                '추세지표: 60일 또는 120일 이동평균선 상단 위치 (중장기 정배열)',
                '거래량 말림: 5일 평균 거래량 < 20일 평균 (거래 절벽 속 매집)'
            ],
            target: '안정적인 박스권 돌파 전야의 선취매 전략'
        },
        {
            id: 'trend',
            title: '추세추종 (Trend Following)',
            icon: LineChart,
            color: 'text-rose-500',
            bgColor: 'bg-rose-50 dark:bg-rose-950/30',
            description: '강한 거래량과 함께 전고점을 돌파하는 종목을 찾되, 과매수 여부와 윗꼬리 저항을 필터링합니다.',
            logic: [
                '거래 폭발: 금일 거래량 > 20일 평균 거래량의 1.5배 이상',
                '과열 방지: RSI(14) 지표 70 미만 (단기 과열 구간 제외)',
                '캔들 완성도: 윗꼬리 길이 < 몸통 길이 (장중 차익실현 압력 체크)'
            ],
            target: '강한 추세와 거래량을 동반한 고확률 돌파 매매'
        }
    ]

    const globalFilters = [
        { title: '시가총액 1,000억 이상', desc: '초소형 잡주 및 작전 세력 개입 가능성 배제' },
        { title: '5일 평균 거래대금 10억 이상', desc: '원활한 진출입이 가능한 최소한의 유동성 확보' },
        { title: '수익성 검증 (영업이익 > 0)', desc: '지속적인 영업적자 및 관리종목 위험 배제' }
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <header className="space-y-4">
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
                    DailyPort의 알고리즘<br />
                    <span className="text-blue-600 dark:text-blue-400 text-3xl">스크리닝 기법 소개</span>
                </h1>
                <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl">
                    DailyPort는 기술적 지표와 수급 데이터를 결합한 퀀트 알고리즘을 통해 매일 아침(마지막 분석 완료 시점) 시장의 기회를 선별하여 제공합니다.
                    <span className="block mt-2 text-sm text-zinc-400 font-medium">※ 본 스크리닝 결과에는 장중 실시간 시세 변동이 반영되지 않습니다.</span>
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

            <section className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-500 rounded-lg text-white">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">공통 위생 필터 (Global Hygiene Filters)</h2>
                        <p className="text-sm text-zinc-500">모든 알고리즘에는 아래의 기본적인 필터가 공통 적용되어 리스크를 최소화합니다.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {globalFilters.map((f, idx) => (
                        <div key={idx} className="space-y-1">
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-200 text-sm">{f.title}</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

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
