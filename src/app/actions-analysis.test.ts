import { describe, it, expect, vi } from 'vitest';
import { getAlgoPicks } from './actions-analysis';

// Mock supabase server client
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({
                        data: [
                            {
                                date: '2025-12-25',
                                strategy_name: 'Value_Picks',
                                tickers: ['005930'],
                                details: {
                                    status: 'OK',
                                    meta_version: 'v5.0',
                                    candidates: [
                                        { ticker: '005930', rank: 1, metrics: { profit_quality: 15 } }
                                    ]
                                }
                            }
                        ],
                        error: null
                    }))
                }))
            }))
        }))
    }))
}));

describe('getAlgoPicks v5', () => {
    it('should fetch algo picks with v5 metadata structure', async () => {
        const picks = await getAlgoPicks();

        expect(picks).toHaveLength(1);
        expect(picks[0].strategy_name).toBe('Value_Picks');
        expect(picks[0].tickers).toContain('005930');
        expect(picks[0].details.status).toBe('OK');
    });
});
