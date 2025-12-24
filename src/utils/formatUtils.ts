
/**
 * Formats large Korean Won numbers into human-readable units (억, 조).
 * @param value Number in KRW
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatKoreanUnit(value: number, decimals: number = 1): string {
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // 1조 = 1,000,000,000,000 (10^12)
    // 1억 = 100,000,000 (10^8)

    if (absValue >= 1_000_000_000_000) {
        return `${isNegative ? '-' : ''}${(absValue / 1_000_000_000_000).toFixed(decimals)}조`;
    } else if (absValue >= 100_000_000) {
        return `${isNegative ? '-' : ''}${(absValue / 100_000_000).toFixed(decimals)}억`;
    } else if (absValue >= 10_000) {
        return `${isNegative ? '-' : ''}${(absValue / 10_000).toFixed(decimals)}만`;
    }

    return `${isNegative ? '-' : ''}${absValue.toLocaleString()}`;
}
