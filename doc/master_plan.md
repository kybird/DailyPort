프로젝트 마스터 지시서: DailyPort Service (Full-Stack JS/TS - Next.js)

1. 프로젝트 개요

DailyPort는 사용자가 웹 환경에서 자신의 주식 포트폴리오와 기술적 분석 조언을 받는 개인용 오픈소스 서비스입니다.

핵심 철학: "민감한 정보(금융 키)는 유저 로컬에, 편리한 UI는 웹과 구글 시트에."

운영 원칙: 서버 리소스 최소화를 위해 모든 분석은 유저가 요청한 시점에만 수행하는 온디맨드(On-demand) 방식을 채택합니다. 유저의 "조회" 행위를 명확한 트리거로 삼아 법적 리스크를 최소화합니다.

2. 기술 스택 및 서비스 구성

Web Framework: Next.js (App Router / TypeScript)

Hosting: Vercel (Next.js 최적화 배포 환경)

Backend/Serverless: Supabase Edge Functions (Deno) & Next.js API Routes

Database/Auth: Supabase (PostgreSQL / RLS 적용)

Data APIs:

Primary: Yahoo Finance (yahoo-finance2)

Fallback: 공공데이터포털 (금융위 주식시세정보)

Notification: Telegram Bot API (1:1 DM 및 분석 결과 요약 전송)

Google Sheets API: google-spreadsheet 라이브러리를 사용한 서비스 계정(Service Account) 기반 실시간 연동

3. 시스템 아키텍처 및 데이터 흐름

3.1. 보안 설계 (KIS API 완전 분리)

구조적 보안: 웹/DB 계층에서 증권사 API Key가 물리적으로 존재하지 않도록 설계하여 침해 사고 시에도 금융 계정 노출 가능성을 원천 차단합니다.

Admin Tool (Local): 한국투자증권(KIS) API 연동은 개발자가 로컬에서 실행하는 별도의 스크립트로 분리합니다. 이 툴은 데이터를 수집해 DB의 ticker_insights 테이블에 데이터를 공급합니다.

4. 상세 기능 및 UI/UX 요구사항

4.0. 랜딩 페이지 (Landing Page)

Hero Section: "내 로컬의 안전함과 웹의 편리함을 동시에" - 하이브리드 아키텍처 부각.

4.1. 회원가입 및 인증 (Supabase Auth + Next.js Middleware)

인증 방식: 이메일/비밀번호 기반 인증.

4.2. 데이터 입력 및 관리 UX (Dual-Path Entry)

방법 1: 웹 기반 직접 입력 (Web-Native CRUD)

입력 UI: 종목 추가 모달 및 인라인 에디팅(Inline Editing) 지원.

방법 2: 구글 시트 API 동기화 (One-Click Sync Workflow)

중요 지침: CSV 파일 수동 업로드/다운로드 방식은 절대 금지.

서식 제공: API로 접속하여 표준 헤더(Ticker, Quantity, AvgPrice, TargetWeight)를 즉시 생성/업데이트하는 기능 제공.

Import UX (Dry-Run): 시트 데이터를 읽어와 실제 반영 전 '변경 요약'을 보여주고 유저 컨펌 후 실행.

4.3. 스마트 종목 검색 (Search Component)

데이터 구조: stocks.json 기반 (ticker, name, market, chosung).

4.4. 온디맨드 분석 엔진 및 리포트 (Edge Functions)

캐싱 전략: 분석 요청 시 5~15분 TTL 캐시 적용하여 외부 API 부하 방지.

4.5. 구글 시트 연동 로직 명세 (Service Account 기반)

인증 방식: 유저가 개별적으로 Google Login을 수행할 필요 없음.

서버는 사전에 발급된 서비스 계정 JSON 키를 환경 변수(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)로 보유함.

유저는 본인의 구글 시트 공유 설정에서 위 서비스 계정 이메일을 '편집자'로 추가함.

유저는 웹 UI에 Spreadsheet ID만 입력하면 연동 완료.

필수 컬럼 명세: Ticker, Quantity, AvgPrice, TargetWeight.

파이프라인: Validator -> Normalize -> Upsert. 부분 성공을 허용하고 ImportResult 리포트를 반환함.

5. 데이터베이스 설계 (SQL)

-- 1. 포트폴리오
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  target_weight NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- 2. 수급 데이터
CREATE TABLE ticker_insights (
  ticker TEXT PRIMARY KEY,
  foreign_net_buy BIGINT DEFAULT 0,
  inst_net_buy BIGINT DEFAULT 0,
  source TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 유저 설정
CREATE TABLE user_configs (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  google_sheet_id TEXT,
  telegram_chat_id TEXT
);


5.2. RLS 정책 명세 (임의 작성 금지)

포트폴리오, 관심종목 테이블에 대해 유저별 SELECT, INSERT, UPDATE, DELETE 정책을 개별적으로 설정 (단순 FOR ALL 금지).

6. 에이전트를 위한 기술적 가이드 (핵심 강조)

배포 및 환경 변수: * 본 프로젝트는 Vercel에 배포됨을 전제로 한다.

모든 외부 API 키(Supabase, Google Service Account, Telegram)는 Vercel 환경 변수(Environment Variables) 기능을 통해 관리한다.

구글 시트 API 복잡성 오해 금지: OAuth2 대신 서비스 계정 방식을 사용하여 구현을 단순화한다. CSV 방식은 자동화 철학에 반하므로 배제한다.

RLS 준수: 세부 명세를 그대로 구현한다.

캐싱 레이어: 동일 ticker 분석 요청 시, TTL 내 중복 외부 API 호출을 금지한다.

고정 면책 조항: 모든 분석 결과 하단에 투자 면책 문구를 고정 노출한다.

7. 구현 단계 (Milestones)

Step 1: Supabase Auth/DB 구축 및 Next.js 기초 구조 설정 (Vercel 배포 초기 설정 포함).

Step 2: Google Sheets API 연동(Validator 포함 Sync) 및 Dry-Run 요약 UI 구현.

Step 3: 분석 엔진(캐싱 포함) 개발 및 리포트 시각화.

Step 4: 텔레그램 봇 연동 및 로컬 KIS 데이터 펌프 도구 작성.