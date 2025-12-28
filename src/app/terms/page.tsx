import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Disclaimer from '@/components/Disclaimer'

export const metadata = {
    title: '이용약관 | DailyPort',
    description: 'DailyPort 서비스 이용약관',
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    홈으로 돌아가기
                </Link>

                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
                    이용약관
                </h1>

                {/* 핵심 면책조항 강조 박스 */}
                <Disclaimer className="mb-8" />

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        최종 업데이트: 2025년 1월 1일
                    </p>

                    <section>
                        <h2>제1조 (목적)</h2>
                        <p>
                            본 약관은 DailyPort(이하 &quot;서비스&quot;)가 제공하는 데이터 기반 분석 서비스의
                            이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h2>제2조 (서비스의 성격)</h2>
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
                            <p className="font-semibold text-red-800 dark:text-red-200 mb-2">
                                중요 고지
                            </p>
                            <p className="text-red-700 dark:text-red-300">
                                본 서비스는 「자본시장과 금융투자업에 관한 법률」에 따른 투자자문업,
                                투자일임업에 해당하지 않으며, 금융상품에 대한 매수·매도 권유를 제공하지 않습니다.
                            </p>
                        </div>
                        <p>
                            DailyPort는 공개된 시장 데이터를 기반으로 한 정보 제공 서비스입니다.
                            제공되는 모든 정보는 참고 자료일 뿐이며, 투자 권유나 조언으로 해석되어서는 안 됩니다.
                        </p>
                    </section>

                    <section>
                        <h2>제3조 (이용자의 의무)</h2>
                        <p>이용자는 다음 사항을 준수해야 합니다:</p>
                        <ul>
                            <li>본 서비스를 통해 얻은 정보를 스스로의 판단과 책임 하에 활용할 것</li>
                            <li>타인의 개인정보를 도용하지 않을 것</li>
                            <li>서비스의 정상적인 운영을 방해하지 않을 것</li>
                            <li>관련 법령을 준수할 것</li>
                        </ul>
                    </section>

                    <section>
                        <h2>제4조 (서비스 제공자의 책임 제한)</h2>
                        <ul>
                            <li>
                                DailyPort는 이용자의 투자 결정으로 인한 손실에 대해 어떠한 책임도 지지 않습니다.
                            </li>
                            <li>
                                서비스에서 제공하는 데이터의 정확성, 완전성, 적시성에 대해 보증하지 않습니다.
                            </li>
                            <li>
                                천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
                            </li>
                            <li>
                                제3자 데이터 제공업체(Yahoo Finance, DART, Naver Finance 등)의 데이터 오류에 대해 책임을 지지 않습니다.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2>제5조 (데이터 출처)</h2>
                        <p>본 서비스에서 제공하는 데이터는 다음 출처로부터 수집됩니다:</p>
                        <ul>
                            <li><strong>시세 데이터:</strong> Yahoo Finance</li>
                            <li><strong>재무 데이터:</strong> 금융감독원 DART 전자공시시스템</li>
                            <li><strong>기업 정보:</strong> Naver Finance</li>
                        </ul>
                        <p>
                            데이터 수집 및 처리 과정에서 시간차 또는 오류가 발생할 수 있으며,
                            이로 인한 손실에 대해 DailyPort는 책임을 지지 않습니다.
                        </p>
                    </section>

                    <section>
                        <h2>제6조 (저작권 및 지적재산권)</h2>
                        <p>
                            서비스에 포함된 로고, 디자인, 알고리즘, 콘텐츠 등의 지적재산권은 DailyPort에 귀속됩니다.
                            무단 복제, 배포, 수정, 영리적 사용을 금합니다.
                        </p>
                    </section>

                    <section>
                        <h2>제7조 (서비스 변경 및 중단)</h2>
                        <p>
                            DailyPort는 운영상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
                            중요한 변경 사항은 서비스 내 공지를 통해 사전에 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h2>제8조 (분쟁 해결)</h2>
                        <p>
                            서비스 이용과 관련하여 발생한 분쟁은 대한민국 법률에 따라 해결하며,
                            관할 법원은 서울중앙지방법원으로 합니다.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-zinc-200 dark:border-zinc-700">
                        <Disclaimer variant="compact" />
                    </section>
                </div>
            </div>
        </div>
    )
}
