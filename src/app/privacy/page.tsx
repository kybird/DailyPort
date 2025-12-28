import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Disclaimer from '@/components/Disclaimer'

export const metadata = {
    title: '개인정보처리방침 | DailyPort',
    description: 'DailyPort 개인정보처리방침',
}

export default function PrivacyPage() {
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
                    개인정보처리방침
                </h1>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        최종 업데이트: 2025년 1월 1일
                    </p>

                    <section>
                        <h2>1. 수집하는 개인정보 항목</h2>
                        <p>DailyPort는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다:</p>
                        <ul>
                            <li><strong>필수 항목:</strong> 이메일 주소</li>
                            <li><strong>선택 항목:</strong> 프로필 이름, 프로필 이미지</li>
                            <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그</li>
                        </ul>
                    </section>

                    <section>
                        <h2>2. 개인정보 수집 및 이용 목적</h2>
                        <ul>
                            <li>회원 가입 및 관리</li>
                            <li>서비스 제공 및 맞춤형 기능 지원</li>
                            <li>서비스 개선 및 통계 분석</li>
                            <li>고객 문의 응대</li>
                        </ul>
                    </section>

                    <section>
                        <h2>3. 개인정보 보유 및 이용 기간</h2>
                        <p>
                            이용자의 개인정보는 서비스 이용 기간 동안 보유됩니다.
                            <strong> 회원 탈퇴 시 지체 없이 파기</strong>합니다.
                            다만, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.
                        </p>
                        <ul>
                            <li>전자상거래법에 따른 계약 및 청약철회 기록: 5년</li>
                            <li>전자금융거래법에 따른 전자금융거래 기록: 5년</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. 개인정보의 국외 이전</h2>
                        <p>
                            DailyPort는 서비스 제공을 위해 아래와 같이 개인정보를 국외로 이전합니다:
                        </p>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <th className="text-left py-2">이전받는 자</th>
                                    <th className="text-left py-2">이전 국가</th>
                                    <th className="text-left py-2">이전 목적</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-2">Supabase Inc.</td>
                                    <td className="py-2">미국 (AWS 인프라)</td>
                                    <td className="py-2">데이터베이스 및 인증 서비스</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section>
                        <h2>5. 개인정보의 파기</h2>
                        <p>
                            개인정보 보유 기간의 경과, 처리 목적 달성 등으로 개인정보가 불필요하게 되었을 때에는
                            지체 없이 해당 개인정보를 파기합니다.
                        </p>
                    </section>

                    <section>
                        <h2>6. 이용자의 권리</h2>
                        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
                        <ul>
                            <li>개인정보 열람 요청</li>
                            <li>개인정보 정정 요청</li>
                            <li>개인정보 삭제 요청</li>
                            <li>개인정보 처리 정지 요청</li>
                        </ul>
                    </section>

                    <section>
                        <h2>7. 개인정보 보호책임자 및 문의처</h2>
                        <p>
                            개인정보 처리에 관한 문의, 불만, 피해구제 등은 아래 연락처로 문의해 주시기 바랍니다:
                        </p>
                        <ul>
                            <li><strong>이메일:</strong> support@dailyport.co.kr</li>
                        </ul>
                    </section>

                    <section className="pt-8 border-t border-zinc-200 dark:border-zinc-700">
                        <Disclaimer variant="compact" />
                    </section>
                </div>
            </div>
        </div>
    )
}
