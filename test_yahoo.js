const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

async function test() {
    const symbol = '000660.KS';
    console.log(`Fetching ${symbol}...`);
    try {
        const quote = await yahooFinance.quote(symbol);
        console.log('--- Quote ---');
        console.log(`Symbol: ${quote.symbol}`);
        console.log(`ShortName: ${quote.shortName}`);
        console.log(`Price: ${quote.regularMarketPrice}`);
        console.log(`Currency: ${quote.currency}`);

        // Check historical
        const queryOptions = { period1: '2024-12-01', interval: '1d' };
        const chart = await yahooFinance.chart(symbol, queryOptions);
        console.log('--- Chart (Last 1 day) ---');
        if (chart.quotes && chart.quotes.length > 0) {
            const last = chart.quotes[chart.quotes.length - 1];
            console.log(`Date: ${last.date}, Close: ${last.close}`);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

test();
