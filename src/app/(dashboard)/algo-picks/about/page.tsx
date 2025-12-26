import Link from 'next/link'
import { DollarSign, Zap, Box, CheckCircle2, Target, BarChart3, LineChart, ArrowRight } from 'lucide-react'

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
                'ROE(자기자본이익률) 8% 이상 (효율적 자본 운용)',
                '영업이익률 5% 이상 (본업의 높은 수익성)',
                'PER 0~30배 & PBR 0.3~1.2 사이 (저평가 매력)',
                '정렬 순서: Profit Quality ↓ → PER ↑ → PBR ↑'
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
                '수급강도(Demand Power): (외인+기관 합산 / 시총) × 100 ≥ 0.05%',
                '외인/기관 모두 순매수 (당일 기준)',
                '정렬 순서: Demand Power ↓ → Co-Momentum ↓ → 합산매수 ↓'
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
                '박스권 응축: 최근 21일 주가 변동폭 12% 이내',
                '21일 누적 외인 순매수 > 0',
                '매집 밀도(Density): (21일 외인 순매수 / 시총) × 100',
                '정렬 순서: Density ↓ → 21일 누적 ↓ → Box Range ↑'
            ],
            target: '안정적인 박스권 돌파 전야의 선취매 전략'
        },
        {
            id: 'trend',
            title: '추세추종 (Trend Following)',
            icon: LineChart,
            color: 'text-rose-500',
            bgColor: 'bg-rose-50 dark:bg-rose-950/30',
            description: '강한 거래량과 함께 양봉으로 마감한 종목을 찾되, 윗꼬리 저항을 필터링합니다.',
            logic: [
                '양봉 마감: 종가 > 시가',
                '거래 폭발(Vol Power): 금일 거래량 / 20일 평균 ≥ 1.5배 (최대 5배 캡)',
                '윗꼬리 체크: 윗꼬리 < 몸통 (장중 차익실현 압력 필터)',
                '정렬 순서: Vol Power ↓ → Trend Score ↓ → Breakout Age ↑'
            ],
            target: '강한 추세와 거래량을 동반한 고확률 돌파 매매'
        }
    ]

    const globalFilters = [
        { title: '동적 시가총액 필터', desc: '상위 70% 시총 또는 최소 3,000억 중 높은 값을 기준으로 소형주 필터링' },
        { title: '영업이익 양수 (EPS > 0)', desc: '지속적인 영업적자 및 관리종목 위험 배제' },
        { title: 'Confluence 점수', desc: 'Flow/Price/Fundamental 그룹별 가중치 기반 통합 순위 (상위 5종목 선정)' }
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <header className="space-y-4">
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white">
                    DailyPort의 알고리즘<br />
                    <span className="text-blue-600 dark:text-blue-400 text-3xl">검증 기법 상세설명</span>
                </h1>
                <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl">
                    DailyPort는 기술적 지표와 수급 데이터를 결합한 퀀트 알고리즘을 통해 매일 아침(마지막 분석 완료 시점) 수치화된 전략 출력을 산출합니다.
                    <span className="block mt-2 text-sm text-zinc-400 font-medium">※ 본 시뮬레이션 결과에는 장중 실시간 시세 변동이 반영되지 않습니다.</span>
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
                                                모델링 분석 대상
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
                    <h3 className="text-2xl font-bold">최신 검증 데이터를 확인하세요</h3>
                    <p className="opacity-80">데이터는 매 영업일 오전 8시~11시 사이에 분석 완료됩니다.</p>
                    <div className="pt-4">
                        <Link
                            href="/algo-picks"
                            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform"
                        >
                            알고리즘 출력 데이터 확인
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
