import { describe, it, expect, beforeEach } from 'vitest';
import { calculateObjectives } from '../technical-analysis';
import { HistoricalBar } from '../technical-analysis';

describe('Trading Objective V3 Logic', () => {
    let mockCandles: HistoricalBar[];
    const currentPrice = 110000;

    beforeEach(() => {
        mockCandles = Array.from({ length: 150 }, (_, i) => ({
            date: `2023-01-${i + 1}`,
            open: 100000,
            high: 105000,
            low: 95000,
            close: 100000,
            volume: 1000000
        }));
    });

    it('should return null for insufficient data (< 120 candles)', () => {
        const result = calculateObjectives(currentPrice, mockCandles.slice(0, 100));
        expect(result).toBeNull();
    });

    it('should calculate scores within 0-100 and match status mapping', () => {
        const result = calculateObjectives(currentPrice, mockCandles);
        expect(result).not.toBeNull();

        if (result) {
            ['short', 'mid', 'long'].forEach((key) => {
                const tf = key as 'short' | 'mid' | 'long';
                const obj = result[tf];
                expect(obj.score).toBeGreaterThanOrEqual(0);
                expect(obj.score).toBeLessThanOrEqual(100);

                if (obj.score >= 70) {
                    expect(obj.status).toBe('ACTIVE');
                } else if (obj.score >= 40) {
                    expect(obj.status).toBe('WAIT');
                } else {
                    expect(obj.status).toBe('AVOID');
                }
            });
        }
    });

    it('should nullify entry, stop, and target for WAIT/AVOID statuses', () => {
        // Create a bearish scenario to ensure WAIT or AVOID
        const bearishCandles = mockCandles.map(c => ({
            ...c,
            close: c.close * 0.8,
            high: c.high * 0.8,
            low: c.low * 0.8
        }));
        const result = calculateObjectives(50000, bearishCandles);
        expect(result).not.toBeNull();

        if (result) {
            ['short', 'mid', 'long'].forEach((key) => {
                const tf = key as 'short' | 'mid' | 'long';
                const obj = result[tf];
                if (obj.status !== 'ACTIVE') {
                    expect(obj.entry).toBeNull();
                    expect(obj.stop).toBeNull();
                    expect(obj.target).toBeNull();
                }
            });
        }
    });

    it('should select a strategy for all timeframes', () => {
        const result = calculateObjectives(currentPrice, mockCandles);
        expect(result).not.toBeNull();

        if (result) {
            ['short', 'mid', 'long'].forEach((key) => {
                const tf = key as 'short' | 'mid' | 'long';
                expect(result[tf].strategy).toBeDefined();
            });
        }
    });

    it('should be deterministic (same input produces same output)', () => {
        const res1 = calculateObjectives(currentPrice, mockCandles);
        const res2 = calculateObjectives(currentPrice, mockCandles);
        expect(res1).toEqual(res2);
    });
});
