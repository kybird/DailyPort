const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Load env from local .env or current
// Load env from local .env or current
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    // Fallback to parent
    require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
}

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KRX_API_KEY = process.env.KRX_OPEN_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STOCKS_ENDPOINT = 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd';
const KOSPI_ENDPOINT = 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd'; // Same endpoint, logic handles market
// Actually KRX API separates by market usually in options or different endpoints for some sets, 
// but the code in market-data.ts used:
// KOSPI: https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd
// KOSDAQ: https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd
// ETF: https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd

const ENDPOINTS = [
    { name: 'KOSPI', url: 'https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd', type: 'STOCK', suffix: '.KS' },
    { name: 'KOSDAQ', url: 'https://data-dbg.krx.co.kr/svc/apis/sto/ksq_bydd_trd', type: 'STOCK', suffix: '.KQ' },
    { name: 'ETF', url: 'https://data-dbg.krx.co.kr/svc/apis/etp/etf_bydd_trd', type: 'ETF', suffix: '.KS' } // Most ETFs are KS? Or KQ? Usually KS. Let's assume .KS for now or check ISU_CD.
    // Actually relying on suffix might be tricky. But let's stick to .KS for ETF for now as they trade on KOSPI mostly? 
    // Wait, ETFs can be on both? KRX usually lists them. 
    // Let's assume generic .KS for ETFs to match yahoo symbol format which is usually NUMBER.KS (e.g. 069500.KS for KODEX 200).
];

async function fetchKRXData(endpoint, date) {
    try {
        const response = await axios.post(endpoint, {
            basDd: date
        }, {
            headers: {
                'Content-Type': 'application/json',
                'AUTH_KEY': KRX_API_KEY
            }
        });

        return response.data;
    } catch (error) {
        console.error(`Failed to fetch from ${endpoint}:`, error.message);
        return null;
    }
}

async function getLatestWorkingDay() {
    // Try up to 5 days back
    for (let i = 0; i < 5; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - i);
        // Skip weekends
        if (targetDate.getDay() === 0) continue;
        if (targetDate.getDay() === 6) continue;

        const basDd = targetDate.toISOString().split('T')[0].replace(/-/g, '');

        // Quick check with KOSPI endpoint
        const data = await fetchKRXData(ENDPOINTS[0].url, basDd);
        if (data && data.OutBlock_1 && data.OutBlock_1.length > 0) {
            return { dateStr: basDd, dateObj: targetDate };
        }
    }
    return null;
}

function transformData(item, type, suffix, dateStr) {
    // Common mappings
    const ticker = item.ISU_CD + suffix;
    const price = parseFloat((item.TDD_CLSPRC || '0').replaceAll(',', ''));
    const changePercent = parseFloat((item.FLUC_RT || '0').replaceAll(',', ''));
    const marketCap = parseFloat((item.MKTCAP || '0').replaceAll(',', ''));
    const volume = parseInt((item.ACC_TRDVOL || '0').replaceAll(',', ''));

    // Historical entry for today
    const historical = {
        date: new Date(dateStr.slice(0, 4), parseInt(dateStr.slice(4, 6)) - 1, dateStr.slice(6, 8)).toISOString(),
        open: parseFloat((item.TDD_OPNPRC || '0').replaceAll(',', '')),
        high: parseFloat((item.TDD_HGPRC || '0').replaceAll(',', '')),
        low: parseFloat((item.TDD_LWPRC || '0').replaceAll(',', '')),
        close: price,
        volume: volume
    };

    const data = {
        ticker: item.ISU_CD, // Store ticker without suffix inside data? Or keep consistency? 
        // market-data.ts uses ticker WITH suffix for ID.
        // Let's put ticker with suffix in data as well.
        ticker: ticker,
        currentPrice: price,
        marketCap: marketCap || undefined,
        changePercent: changePercent,
        currency: 'KRW',
        historical: [historical]
    };

    if (type === 'ETF') {
        data.nav = parseFloat((item.NAV || '0').replaceAll(',', ''));
    }

    return {
        ticker: ticker,
        data: data,
        generated_at: new Date().toISOString(),
        source: 'KRX_SYNC'
    };
}

async function sync() {
    console.log('🚀 Starting KRX Data Sync...');

    // 1. Find latest data date
    const dateInfo = await getLatestWorkingDay();
    if (!dateInfo) {
        console.error('❌ Could not find valid market data for the last 5 days.');
        return;
    }

    console.log(`📅 Latest market data date: ${dateInfo.dateStr}`);

    let totalUpserted = 0;

    // 2. Fetch and Upsert for each endpoint
    for (const ep of ENDPOINTS) {
        console.log(`📡 Fetching ${ep.name}...`);
        const result = await fetchKRXData(ep.url, dateInfo.dateStr);

        if (!result || !result.OutBlock_1) {
            console.warn(`⚠️ No data for ${ep.name}`);
            continue;
        }

        const items = result.OutBlock_1;
        console.log(`   Found ${items.length} items. Transforming...`);

        const upsertData = items.map(item => transformData(item, ep.type, ep.suffix, dateInfo.dateStr));

        // Batch upsert (Supabase has limits, let's do chunks of 100)
        const CHUNK_SIZE = 100;
        for (let i = 0; i < upsertData.length; i += CHUNK_SIZE) {
            const chunk = upsertData.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('analysis_cache').upsert(chunk, { onConflict: 'ticker' });

            if (error) {
                console.error(`❌ Error upserting chunk ${i / CHUNK_SIZE}:`, error.message);
            } else {
                // console.log(`   ✓ Upserted chunk ${i/CHUNK_SIZE}`);
            }
        }

        console.log(`   ✅ Synced ${items.length} ${ep.name} items.`);
        totalUpserted += items.length;
    }

    console.log(`🎉 Sync Completed! Total items: ${totalUpserted}`);
}

sync();
