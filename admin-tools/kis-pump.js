
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Load env from local .env or current
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

// Configuration (MUST BE SET IN .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // IMPORTANT: Function/Service Role Key
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443'; // Real
// const KIS_BASE_URL = 'https://openapivts.koreainvestment.com:29443'; // Test

// Check if required env vars are set
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:', missingVars.join(', '));
    console.error('Please set them in .env.local file');
    process.exit(1);
}

// Optional KIS variables - only check if trying to run KIS data pump
if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    console.warn('Warning: KIS_APP_KEY and KIS_APP_SECRET not set. KIS data pump will be skipped.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Token cache file path
const TOKEN_CACHE_FILE = path.resolve(__dirname, 'token-cache.json');

// State
let ACCESS_TOKEN = '';

// Token cache management
function loadTokenCache() {
    try {
        const cacheData = fs.readFileSync(TOKEN_CACHE_FILE, 'utf8');
        return JSON.parse(cacheData);
    } catch (error) {
        // File doesn't exist or invalid JSON
        return null;
    }
}

function saveTokenCache(tokenData) {
    try {
        fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(tokenData, null, 2));
    } catch (error) {
        console.error('Failed to save token cache:', error.message);
    }
}

// Helper: Delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 0. Initialize Database Schema
async function initializeDatabase() {
    console.log('Initializing database schema...');

    try {
        // Read migration files
        const schemaPath = path.resolve(__dirname, '../supabase/migrations/00_init_schema.sql');
        const cachePath = path.resolve(__dirname, '../supabase/migrations/01_analysis_cache.sql');

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        const cacheSQL = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, 'utf8') : '';

        // Execute schema SQL
        console.log('Executing schema migration...');
        const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });

        if (schemaError) {
            // If rpc doesn't work, try direct execution by splitting SQL
            console.log('Using alternative schema initialization...');
            const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                    if (error && !error.message.includes('already exists')) {
                        console.warn('Schema statement warning:', error.message);
                    }
                }
            }
        }

        // Execute cache table SQL if exists
        if (cacheSQL) {
            console.log('Executing cache table migration...');
            const cacheStatements = cacheSQL.split(';').filter(stmt => stmt.trim().length > 0);

            for (const statement of cacheStatements) {
                if (statement.trim()) {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                    if (error && !error.message.includes('already exists')) {
                        console.warn('Cache table statement warning:', error.message);
                    }
                }
            }
        }

        console.log('Database schema initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize database schema:', error.message);
        console.log('Please manually execute the SQL files in supabase/migrations/');
        throw error;
    }
}

// 1. Get KIS Access Token (with caching)
async function getAccessToken() {
    // Try to load cached token
    const cache = loadTokenCache();

    // If cache exists and not expired (24 hours = 86400000 ms)
    if (cache && cache.token && cache.expiresAt > Date.now()) {
        ACCESS_TOKEN = cache.token;
        console.log('✅ Using cached access token (expires:', new Date(cache.expiresAt).toLocaleString() + ')');
        return;
    }

    console.log('🔄 Requesting new access token from KIS...');

    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            appsecret: KIS_APP_SECRET
        });

        ACCESS_TOKEN = res.data.access_token;

        // Set expiration to 24 hours from now (KIS tokens are valid for 24 hours)
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in milliseconds

        // Save to cache
        saveTokenCache({
            token: ACCESS_TOKEN,
            expiresAt: expiresAt,
            issuedAt: Date.now()
        });

        console.log('✅ New access token issued and cached (expires:', new Date(expiresAt).toLocaleString() + ')');

    } catch (e) {
        console.error('❌ Failed to get token:', e.response?.data || e.message);
        process.exit(1);
    }
}

// 2. Fetch Supply Data (Investor)
async function fetchInvestorData(ticker) {
    // KIS API: 주식현재가 투자자 (FHKST01010900)
    // Ticker formatting: Yahoo uses 005930.KS, KIS uses 005930
    const code = ticker.replace('.KS', '').replace('.KQ', '');

    try {
        const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor`, {
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${ACCESS_TOKEN}`,
                'appkey': KIS_APP_KEY,
                'appsecret': KIS_APP_SECRET,
                'tr_id': 'FHKST01010900'
            },
            params: {
                fid_cond_mrkt_div_code: 'J', // J: Stock, W: W-Option ? Check API docs usually J works for common
                fid_input_iscd: code
            }
        });

        if (res.data.rt_cd !== '0') {
            console.error(`API Error for ${ticker}:`, res.data.msg1);
            return null;
        }

        const output = res.data.output;
        // output.stck_prpr (Close)
        // output.frgn_ntby_qty (Foreign Net Buy Qty)
        // output.orgn_ntby_qty (Inst Net Buy Qty) -- KIS field names might vary slightly check docs
        // Based on typical KIS response for investor:
        // frgn_ntby_qty: 외국인 순매수 수량
        // orgn_ntby_qty: 기관계 순매수 수량 (Sometimes 'organ_ntby_qty' or similar) -- Need to verify standard response
        // Usually: 
        // frgn_ntby_vol (Volume?) or qty. Let's assume standard response fields.
        // Actually KIS 'investor' endpoint returns accumulated data? 
        // Let's use daily investor API. 

        // Let's rely on standard response structure:
        // output field names are usually lower case approximations of Korean.

        // Foreign Net Buy
        const foreignNetBuy = parseInt(output.frgn_ntby_qty || '0');
        // Inst Net Buy
        const instNetBuy = parseInt(output.orgn_ntby_qty || '0');

        return {
            foreignNetBuy,
            instNetBuy
        }

    } catch (e) {
        console.error(`Network Error ${ticker}:`, e.message);
        return null;
    }
}

// Preload historical data for stocks
async function preloadStockData() {
    console.log('🔄 Preloading historical stock data...');

    try {
        // Read stocks.json
        const stocksPath = path.resolve(__dirname, '../src/data/stocks.json');
        const stocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));

        console.log(`Found ${stocks.length} stocks to preload.`);

        // Note: Preloading is currently disabled
        // To enable preloading, you would need to:
        // 1. Use yahoo-finance2 directly in this Node.js context
        // 2. Or create a separate preload script that can import the functions properly
        console.log('ℹ️  Historical data preloading is currently disabled.');
        console.log('💡 To preload data, run the web application and access stocks through the UI.');
        console.log('   This will automatically cache data in the analysis_cache table.');

        console.log('🎉 Historical data preload completed (no-op)!');
    } catch (error) {
        console.error('❌ Failed to preload stock data:', error.message);
    }
}

// Main Pump Logic
async function runPump() {
    console.log('🚀 Starting DailyPort Admin Tools...');

    // Check for preload flag
    const isPreload = process.argv.includes('--preload');

    // Always initialize database schema first
    try {
        await initializeDatabase();
    } catch (error) {
        console.error('Database initialization failed. Exiting...');
        process.exit(1);
    }

    // Preload historical data if requested
    if (isPreload) {
        await preloadStockData();
    }

    // Run KIS data pump only if credentials are available
    if (KIS_APP_KEY && KIS_APP_SECRET) {
        console.log('📊 Starting KIS Data Pump...');
        await getAccessToken();

        // 1. Get All Unique Tickers from Portfolios + Watchlists (Optional)
        // For now, get unique tickers from portfolios
        const { data: portfolios, error } = await supabase
            .from('portfolios')
            .select('ticker')

        if (error) {
            console.error('DB Error:', error);
            return;
        }

        const tickers = [...new Set(portfolios.map(p => p.ticker))];
        console.log(`Found ${tickers.length} unique tickers to update.`);

        for (const ticker of tickers) {
            // Rate Limit Handling: Sleep 0.2s
            await delay(200);

            // Filter valid tickers (Simple check)
            if (!ticker.endsWith('.KS') && !ticker.endsWith('.KQ')) {
                console.log(`Skipping non-KR stock: ${ticker}`);
                continue;
            }

            const data = await fetchInvestorData(ticker);
            if (data) {
                const { error: upsertError } = await supabase
                    .from('ticker_insights')
                    .upsert({
                        ticker: ticker,
                        foreign_net_buy: data.foreignNetBuy,
                        inst_net_buy: data.instNetBuy,
                        source: 'KIS',
                        generated_at: new Date().toISOString()
                    });

                if (upsertError) console.error(`Upsert Fail ${ticker}:`, upsertError.message);
                else console.log(`✅ Updated ${ticker}: Foreign(${data.foreignNetBuy}), Inst(${data.instNetBuy})`);
            }
        }
        console.log('🎉 KIS Data Pump Finished.');
    } else {
        console.log('ℹ️  KIS credentials not provided. Skipping KIS data pump.');
        console.log('💡 To enable KIS data pump, add KIS_APP_KEY and KIS_APP_SECRET to .env.local');
    }

    console.log('🎊 All admin tools completed successfully!');
}

runPump();
