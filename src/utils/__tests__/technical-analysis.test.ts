
import { calculateObjectives } from '../technical-analysis';

const mockCandles = Array.from({ length: 100 }, (_, i) => ({
    date: `2023-01-${i + 1}`,
    open: 100000 + i * 100,
    high: 105000 + i * 100,
    low: 95000 + i * 100,
    close: 100000 + i * 100,
    volume: 1000000
}));

const currentPrice = 110000;

console.log("--- Testing calculateObjectives V2 ---");
const objectives = calculateObjectives(currentPrice, mockCandles);

if (objectives) {
    console.log("isAbnormal:", objectives.isAbnormal);
}

console.log("\n--- Testing Abnormal Case (Stop >= Entry) ---");
// Create mock data where recent low is HIGHER than entry, which triggers the abnormal fallback
const brokenCandles = mockCandles.map(c => ({ ...c, low: 120000 })); // Low is 120,000, current price is 110,000
const abnormalObjectives = calculateObjectives(currentPrice, brokenCandles);
if (abnormalObjectives) {
    console.log("Abnormal Case isAbnormal:", abnormalObjectives.isAbnormal);
    if (!abnormalObjectives.isAbnormal) {
        console.error("[FAIL] isAbnormal should be true when stop >= entry");
    } else {
        console.log("[SUCCESS] isAbnormal is correctly identified as true");
    }
}
