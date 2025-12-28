# DailyPort 프로젝트 컨텍스트

## 프로젝트 개요
- **이름**: DailyPort (일일 포트폴리오 관리 및 한국 주식 분석 애플리케이션)
- **기술 스택**: Next.js (TypeScript), Python (로컬 분석), Supabase (데이터베이스/캐싱)
- **아키텍처**: Python은 종가 기반 심층 분석, Node.js는 실시간 데이터 크롤링
- **운영 철학**: 로컬 컴퓨터에서 종가 분석, 클라우드에서 실시간 데이터 처리로 운영비 최소화

## 현재 진행 중인 작업

### 메인 작업: 데이터 소스 모듈화 및 인터페이스화
- **목표**: 향후 암호화폐 등 다른 자산 클래스로 확장 가능한 구조 구축
- **접근법**: 원소스 멀티유징을 위한 독립형 SDK 개발
- **전략**: 운영 중단 없는 점진적 리팩토링 (Strangler Pattern)

### 현재 상태: Phase 2.4 진행 중
- ✅ 프로젝트 구조 및 데이터 소스 분석 완료
- ✅ 모듈화 아키텍처 설계 완료
- ✅ 상세 구현 계획 수립 완료
- ✅ 계획 문서화 완료 (`doc/cline_plan.md`)
- ✅ Phase 1: SDK 기반 구축 완료
- ✅ Phase 2.1: Naver Finance 데이터 소스 구현 완료
- ✅ Phase 2.2: Yahoo Finance 데이터 소스 구현 완료
- ✅ Phase 2.3: KRX API 데이터 소스 구현 완료
- ✅ SDK 통합 테스트 준비 완료
- 🔄 Phase 2.4: 통합 테스트 및 검증 진행 중

## 핵심 파일 구조

### 데이터 소스 관련
- `src/utils/naver-finance.ts` - 네이버 금융 크롤러 (TypeScript)
- `src/utils/market-data.ts` - 통합 시장 데이터 관리
- `admin-tools/python/data_sources/naver_finance.py` - 네이버 금융 크롤러 (Python)
- `test_yahoo.js` - 야후 파이낸스 테스트
- `packages/market-data-sdk/` - 새로운 시장 데이터 SDK
  - `src/data-sources/naver-stock-source.ts` - 네이버 주식 데이터 소스
  - `src/data-sources/yahoo-stock-source.ts` - 야후 파이낸스 주식 데이터 소스
  - `src/data-sources/krx-index-source.ts` - KRX 지수 데이터 소스
  - `src/index.ts` - SDK 메인 진입점
- `test_sdk_integration.js` - SDK 통합 테스트

### 설정 및 관리
- `package.json` - 프로젝트 의존성
- `supabase/migrations/` - 데이터베이스 스키마
- `doc/cline_plan.md` - 현재 진행 중인 작업의 상세 계획

## 데이터 소스 현황

### 주요 소스
1. **네이버 금융** (주 소스)
   - 실시간 시세, PER/PBR, 시가총액
   - TypeScript와 Python에서 중복 구현
   - 1분 TTL 캐싱

2. **야후 파이낸스** (Fallback)
   - 일봉 데이터 및 기본 시세 정보
   - 주요 API 제한 시 사용

3. **KRX API** (지수)
   - 코스피/코스닥 지수 데이터

### 향후 확장
- **암호화폐**: 바이낸스, 코인게코 등
- **독립형 SDK**: `packages/market-data-sdk/` 개발 예정

## 기술적 제약사항
- **운영 중단 불가**: 현재 서비스는 계속 동작해야 함
- **비용 효율성**: 로컬/클라우드 분산 구조 유지
- **하위 호환성**: 기존 Supabase 스키마와 API 변경 최소화
- **성능**: 추가 레이어로 인한 성능 저하 최소화

## 다음 작업 순서

### Phase 2.4: 통합 테스트 및 검증 (진행 중)
1. SDK 통합 테스트 실행 (`test_sdk_integration.js`)
2. 기존 방식과의 데이터 일치성 검증
3. 성능 벤치마킹 테스트 수행
4. 데이터 소스별 Fallback 로직 테스트

### Phase 3: 레거시 호환성 어댑터 연동 (예정)
1. 기존 `src/utils/market-data.ts`와 SDK 연동
2. LegacyDataSourceWrapper를 통한 안전한 전환
3. 기능 플래그 구현으로 롤백 경로 확보
4. 기존 API와의 호환성 유지

### 주의사항
- 기존 코드와 병행하여 개발
- 기능 플래그를 통한 안전한 롤백 준비
- 데이터 일치성 실시간 모니터링

## 중요 결정사항
- **점진적 리팩토링**: Strangler Pattern 기반
- **독립 SDK**: 향후 다른 앱에서도 재사용 가능
- **설정 기반**: 환경변수로 데이터 소스 전환

## 참고 자료
- 상세 계획: `doc/cline_plan.md`
- 현재 상태: 이 파일의 "현재 진행 중인 작업" 섹션
- 기술 스택: 프로젝트 루트의 `package.json`

---
*컨텍스트 파일: 세션 변경 시 이 파일을 먼저 확인하여 빠르게 상황 파악*
*마지막 업데이트: 2025-12-28*
