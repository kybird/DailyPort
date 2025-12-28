# 데이터 소스 모듈화 및 인터페이스화 구현 계획

## 프로젝트 개요

### 목표
- 한국 주식 분석 애플리케이션의 데이터 소스 모듈화
- 향후 암호화폐 등 다른 자산 클래스로 확장 가능한 구조
- 운영비 최소화를 위한 로컬/클라우드 분산 구조 유지
- 원소스 멀티유징을 위한 독립형 SDK 구축

### 현재 상태
- **기술 스택**: Next.js (TypeScript), Python (로컬 분석), Supabase (캐싱)
- **데이터 소스**: 네이버 금융 (주), 야후 파이낸스 (fallback), KRX API (지수)
- **아키텍처**: Python은 종가 기반 심층 분석, Node.js는 실시간 데이터 크롤링

## 핵심 요구사항

1. **운영 중단 없는 점진적 리팩토링**
   - 현재 서비스는 계속 동작해야 함
   - Strangler Pattern 기반 점진적 전환
   - 기능 플래그를 통한 안전한 롤백

2. **데이터 소스 전환 용이성**
   - 설정만으로 데이터 소스 변경 가능
   - 인터페이스 기반의 유연한 아키텍처
   - 자산 클래스 무관의 통합 처리

3. **비용 효율성 유지**
   - 기존 로컬/클라우드 분산 구조 유지
   - 불필요한 운영비 증가 방지
   - 효율적인 캐싱 전략

## 아키텍처 설계

### 독립형 SDK 구조
```
packages/market-data-sdk/
├── src/
│   ├── interfaces/
│   │   ├── data-source.interface.ts
│   │   ├── market-data.interface.ts
│   │   └── cache.interface.ts
│   ├── data-sources/
│   │   ├── base/
│   │   │   └── base-data-source.ts
│   │   ├── stock/
│   │   │   ├── naver-stock-source.ts
│   │   │   ├── yahoo-stock-source.ts
│   │   │   └── krx-index-source.ts
│   │   └── crypto/ (향후 확장)
│   │       ├── binance-source.ts
│   │       └── coingecko-source.ts
│   ├── managers/
│   │   ├── data-source-manager.ts
│   │   └── cache-manager.ts
│   └── index.ts
├── package.json
└── README.md
```

### 앱별 구조
```
korean-stock-app/ (현재 DailyPort)
├── package.json
├── src/
└── dependencies: "@your-org/market-data-sdk": "^1.0.0"

crypto-analysis-app/ (미래 앱)
├── package.json
├── src/
└── dependencies: "@your-org/market-data-sdk": "^1.0.0"
```

## 상세 구현 계획

### Phase 1: 안전한 SDK 기반 구축 (1-2주)

#### 1.1 SDK 프로젝트 초기 설정
- [ ] `packages/market-data-sdk/` 폴더 구조 생성
- [ ] TypeScript 설정 및 빌드 환경 구축
- [ ] package.json 설정 (의존성, 빌드 스크립트)
- [ ] NPM 패키지로 배포할 수 있도록 설정

#### 1.2 인터페이스 설계
- [ ] `IMarketDataSource` 기본 인터페이스 정의
- [ ] `QuoteData`, `HistoricalData` 등 데이터 모델 표준화
- [ ] `DataSourceConfig`, `CacheConfig` 설정 인터페이스
- [ ] `Market`, `AssetClass` 등 열거형 타입 정의
- [ ] 현재 `naver-finance.ts`, `market-data.ts`의 인터페이스 완벽 호환 분석

### Phase 2: 병렬 구현 및 테스트 (2-3주)

#### 2.1 SDK 내부 구현
- [ ] `BaseDataSource` 추상 클래스 구현
- [ ] 공통 HTTP 클라이언트 및 에러 핸들링
- [ ] 기본 캐싱 로직 구현
- [ ] 헬스체크 및 재시도 메커니즘

#### 2.2 데이터 소스 리팩토링
- [ ] `NaverStockDataSource` 구현 (기존 `naver-finance.ts` 리팩토링)
- [ ] `YahooStockDataSource` 구현 (기존 `yahoo-finance2` 코드 통합)
- [ ] `KRXIndexDataSource` 구현 (현재 KRX API 코드 통합)
- [ ] 각 소스별 단위 테스트 작성

#### 2.3 기능 플래그 기반 통합
- [ ] `USE_NEW_MARKET_DATA_SDK` 환경변수/기능 플래그 도입
- [ ] 기존 `market-data.ts`에 SDK 래퍼 추가
- [ ] 플래그 OFF시 기존 동작, ON시 SDK 사용하도록 분기 처리
- [ ] 데이터 일치성 검증 테스트

### Phase 3: 안전한 전환 (1-2주)

#### 3.1 카나리아 배포
- [ ] 특정 종목이나 사용자 그룹에만 SDK 적용 테스트
- [ ] 데이터 일치성 실시간 모니터링
- [ ] 성능 차이 측정 및 최적화
- [ ] 모니터링 대시보드용 메트릭 수집

#### 3.2 점진적 전환
- [ ] API별 순차적 전환 (먼저 시세, 다음 일봉 등)
- [ ] 데이터 소스별 전환 (먼저 네이버, 다음 야후 등)
- [ ] 문제 발생시 즉시 기존 코드로 롤백 가능한 상태 유지

### Phase 4: 안정화 및 정리 (1주)

#### 4.1 기존 코드 정리
- [ ] SDK가 안정화된 후 기존 코드 제거
- [ ] 불필요한 기능 플래그 정리
- [ ] 최종 성능 최적화

#### 4.2 문서화 및 배포
- [ ] 내부 사용 문서 업데이트
- [ ] SDK 사용법 문서 작성
- [ ] API 레퍼런스 자동 생성
- [ ] 샘플 앱 및 사용 예제
- [ ] NPM 패키지로 배포

## 기술적 결정사항

### 점진적 리팩토링 전략
```typescript
// src/utils/market-data.ts (수정 최소화)
const USE_NEW_SDK = process.env.USE_NEW_MARKET_DATA_SDK === 'true'

export async function getMarketData(ticker: string): Promise<MarketData | null> {
  if (USE_NEW_SDK) {
    // 새로운 SDK 사용 (테스트 중)
    const sdk = new MarketDataSDK(getSDKConfig())
    return await sdk.getMarketData(ticker)
  } else {
    // 기존 로직 (운영 중인 코드)
    return await fetchMarketDataInternal(ticker)
  }
}
```

### 설정 기반 데이터 소스 관리
```typescript
// config/data-sources.ts
export const dataSourceConfig = {
  useNewSDK: process.env.USE_NEW_SDK === 'true',
  migrationRate: parseFloat(process.env.SDK_MIGRATION_RATE || '0.0'),
  enabledSources: ['NAVER', 'YAHOO', 'KRX'],
  fallback: true
}
```

### 롤백 계획
- **즉시 롤백**: 환경변수 하나로 기존 코드로 복귀
- **부분 롤백**: 특정 데이터 소스만 기존 방식으로
- **모니터링**: 실시간으로 데이터 차이 감지 및 알림

## 확장성 고려사항

### 암호화폐 지원 준비
- `CryptoDataSource` 인터페이스 설계
- 바이낸스 API 연동 준비
- 자산 클래스별 라우팅 로직

### Python 연동
- TypeScript SDK와 Python 간 데이터 교환 인터페이스
- 로컬 분석 시점에 동일 데이터 소스 사용 가능하도록

## 리스크 관리

### 기술적 위험
- **성능 저하**: 추가 레이어로 인한 지연 발생 가능성
- **데이터 불일치**:新旧 시스템 간 데이터 차이 발생
- **의존성 충돌**: 새로운 SDK의 의존성과 기존 프로젝트 충돌

### 완화 전략
- **성능 벤치마킹**: 전환 전후 성능 측정 및 최적화
- **데이터 검증**: 실시간 데이터 일치성 모니터링
- **격리된 배포**: SDK를 독립적으로 테스트 후 통합

## 예상 기간
- **총 5-8주** (Python 연동 및 암호화폐 확장 제외)
- **MVP**: Phase 1-3 완료 시 기본 기능 사용 가능 (4-6주)
- **완성버전**: Phase 4까지 포함 (5-7주)

## 성공 지표
- [ ] 운영 중단 없는 전환 완료
- [ ] 데이터 소스 변경 시 설정만으로 가능
- [ ] 성능 저하 10% 이내 유지
- [ ] 암호화폐 데이터 소스 추가 시 1주 내 완료
- [ ] 코드 재사용률 70% 이상 달성

## 다음 단계
1. Phase 1: SDK 프로젝트 초기 설정 및 인터페이스 설계
2. 기능 플래그 및 모니터링 시스템 구축
3. 점진적 테스트 및 전환 시작

---
*문서 생성일: 2025-12-28*
*마지막 업데이트: 2025-12-28*
