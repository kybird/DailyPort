
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

/**
 * Returns the text color class based on the price change.
 * Korea: Up = Red (Rose), Down = Blue
 */
export function getPriceColor(change: number | undefined | null): string {
    if (!change) return 'text-zinc-500 dark:text-zinc-400';
    if (change > 0) return 'text-rose-600 dark:text-rose-400';
    if (change < 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-zinc-500 dark:text-zinc-400';
}

/**
 * Returns the background color class based on the price change.
 */
export function getPriceBadgeColor(change: number | undefined | null): string {
    if (!change) return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
    if (change > 0) return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
    if (change < 0) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
}

/**
 * Formats the change rate with a sign and percentage.
 */
export function formatChangeRate(changePercent: number | undefined | null): string {
    if (changePercent === undefined || changePercent === null) return '0.00%';
    const sign = changePercent > 0 ? '+' : ''; // Negative sign is included in toFixed
    return `${sign}${changePercent.toFixed(2)}%`;
}

/**
 * Formats the change price with a sign.
 */
export function formatChangePrice(changePrice: number | undefined | null): string {
    if (changePrice === undefined || changePrice === null) return '0';
    const sign = changePrice > 0 ? '+' : ''; // Negative sign is included in toLocaleString
    return `${sign}${changePrice.toLocaleString()}`;
}
