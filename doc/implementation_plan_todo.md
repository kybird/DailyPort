# Todo 리스트 구현 및 디버깅 계획

본 문서는 `doc/todo.md`에 명시된 작업 항목들을 `CODING_CONVENTION.md`에 정의된 규칙에 따라 구현하고 해결하기 위한 상세 계획입니다.

## 📅 Phase 1: 버그 수정 (Critical Bug Fixes)
데이터의 정확성과 신뢰성을 확보하기 위해 최우선으로 진행합니다.

### 1. 관심종목/개별종목 가격 불일치 및 부호 오류 수정 (Todo 1, 2, 10)
- **문제**: 
    - 관심종목의 가격이 현재가와 완전히 다름 (싱크 문제).
    - 등락률이 마이너스임에도 플러스 색상/부호로 표시됨.
- **분석**:
    - 데이터 소스(`market-data.ts`)와 UI 컴포넌트 간의 데이터 전달 과정 확인 필요.
    - `AnalysisPanel.tsx` 및 `Watchlist.tsx`의 색상 결정 로직(`text-rose-500` vs `text-blue-500`) 점검.
    - 캐싱된 데이터가 갱신되지 않고 있는지 확인 (Admin Tool vs 실시간 API 차이).
- **작업 파일**:
    - `src/utils/market-data.ts` (데이터 페칭 로직)
    - `src/components/Watchlist.tsx` (렌더링 로직)
    - `src/components/AnalysisPanel.tsx` (렌더링 로직)
- **구현 계획**:
    - `market-data.ts`: 실시간 데이터와 캐시 데이터의 병합 로직 검증 (Convention 2.2, 4.0 준수).
    - `format-utils.ts`: 등락률 포맷팅 함수(`formatChangeRate`) 표준화 및 단위 테스트 추가.
    - UI 컴포넌트: 하드코딩된 색상 조건문을 유틸리티 함수로 교체.

## 🚀 Phase 2: 포트폴리오 기능 강화 (Portfolio Enhancements)
사용자 자산 관리 기능을 보강합니다.

### 2. 포트폴리오 비중 자동 계산 및 현금 관리 (Todo 3, 4)
- **목표**:
    - 종목별 현재 평가액 기준 비중(%) 표시.
    - 현금 자산 추가 및 전체 자산 대비 현금 비중 관리.
- **작업 파일**:
    - `src/components/PortfolioList.tsx`
    - `src/types/portfolio.ts` (타입 정의 필요)
- **구현 계획**:
    - **UI**: 'Stock 추가', '현금 추가' 버튼 분리 및 배치 (Tailwind CSS 활용).
    - **Logic**: 
        - 총 자산 = Σ(보유수량 × 현재가) + 현금.
        - 개별 비중 = (평가액 / 총 자산) * 100.
        - 소수점 2자리까지 표기.

### 3. 컬럼 정렬 기능 (Todo 5)
- **목표**: 포트폴리오 리스트 헤더 클릭 시 오름차순/내림차순 정렬.
- **구현 계획**:
    - `useState`를 사용하여 `sortConfig` { key, direction } 상태 관리.
    - 유틸리티 함수 `sortPortfolioData(data, key, direction)` 구현.
    - 정렬 아이콘(Lucide React `ArrowUpDown`) 추가.

## 🎨 Phase 3: UI/UX 개선 (UI/UX Improvements)
사용자 경험 및 정보 전달력을 개선합니다.

### 4. 개발 중 메시지 표시 (Todo 6)
- **목표**: 첫 화면에 Beta 버전임을 알리고 데이터 오류 가능성 명시.
- **작업 파일**: `src/components/Disclaimer.tsx` (신규 또는 기존 수정)
- **구현 계획**:
    - `Dashboard` 최상단 또는 `TopPanel`에 경고 배너 추가.
    - 닫기 가능한 Alert 컴포넌트 사용.

### 5. 백테스팅/분석 상세 설명 및 링크 개선 (Todo 7, 8, 9)
- **목표**:
    - '박스권 XX%', '매집밀도 XX%' 용어에 대한 툴팁 또는 설명 모달 추가.
    - 네이버 증권/DART 바로가기 링크 개선 (항상 표시).
- **작업 파일**:
    - `src/app/(dashboard)/algo-filter/AlgoDashboard.tsx` (예상 경로)
    - `src/components/AnalysisPanel.tsx`
- **구현 계획**:
    - **용어 설명**: `HoverCard` 또는 하단 범례(Legend) 영역 추가하여 산식 설명 (Convention 4.0 문서화).
    - **링크**: `AnalysisPanel` 헤더 또는 하단에 외부 링크 아이콘 버튼 그룹화 (네이버, Yahoo, DART).
    - **조건 제거**: 데이터 유의 상태와 무관하게 항상 링크 렌더링하도록 조건문 제거.

## 🛠 실행 순서 (Action Plan)

1.  **Phase 1 (버그 수정)** 먼저 진행하여 데이터 신뢰성 회복.
2.  **Phase 3 (UI 개선)** 중 링크 및 문구 수정은 빠르게 적용 가능하므로 병행.
3.  **Phase 2 (포트폴리오)** 로직 변경이 포함되므로 마지막에 진행.
