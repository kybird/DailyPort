
-- 1. portfolios 테이블에 누적 실현손익 컬럼 추가
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS realized_gain NUMERIC DEFAULT 0;

-- 2. transactions (거래 이력) 테이블 생성
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  type TEXT NOT NULL, -- 'BUY' (매수), 'SELL' (매도)
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  realized_gain NUMERIC DEFAULT 0, -- 해당 거래로 인한 실현손익 (매도 시)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select own transactions') THEN
        CREATE POLICY "select own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert own transactions') THEN
        CREATE POLICY "insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
