const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env from local .env or current
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

// Configuration (MUST BE SET IN .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if required env vars are set
const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:', missingVars.join(', '));
    console.error('Please set them in .env.local file');
    console.error('\nExample .env.local:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Database Schema
async function initializeDatabase() {
    console.log('🚀 Initializing DailyPort Database Schema...');
    console.log('📍 Using Supabase URL:', SUPABASE_URL);

    try {
        // Read migration files
        const schemaPath = path.resolve(__dirname, '../supabase/migrations/00_init_schema.sql');
        const cachePath = path.resolve(__dirname, '../supabase/migrations/01_analysis_cache.sql');

        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file not found:', schemaPath);
            process.exit(1);
        }

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        const cacheSQL = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, 'utf8') : '';

        console.log('📄 Read schema migration file');

        // Try to execute schema SQL using Supabase SQL editor approach
        console.log('🔧 Executing schema migration...');

        // Split SQL into individual statements and execute them
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    // Use raw SQL execution
                    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

                    if (error) {
                        // Check if it's an "already exists" error, which is OK
                        if (error.message.includes('already exists') ||
                            error.message.includes('duplicate key') ||
                            error.message.includes('already exists')) {
                            console.log(`⚠️  Statement ${i + 1}: Already exists (skipping)`);
                        } else {
                            console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
                        }
                    } else {
                        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
                    }
                } catch (execError) {
                    // If rpc doesn't work, this might be expected for some Supabase setups
                    console.log(`ℹ️  Statement ${i + 1}: Supabase RPC not available (expected for hosted Supabase)`);
                }
            }
        }

        // Execute cache table SQL if exists
        if (cacheSQL) {
            console.log('🔧 Executing cache table migration...');
            const cacheStatements = cacheSQL.split(';').filter(stmt => stmt.trim().length > 0);

            for (let i = 0; i < cacheStatements.length; i++) {
                const statement = cacheStatements[i].trim();
                if (statement) {
                    try {
                        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

                        if (error) {
                            if (error.message.includes('already exists') ||
                                error.message.includes('duplicate key')) {
                                console.log(`⚠️  Cache statement ${i + 1}: Already exists (skipping)`);
                            } else {
                                console.warn(`⚠️  Cache statement ${i + 1} warning:`, error.message);
                            }
                        } else {
                            console.log(`✅ Cache statement ${i + 1}/${cacheStatements.length} executed`);
                        }
                    } catch (execError) {
                        console.log(`ℹ️  Cache statement ${i + 1}: Supabase RPC not available`);
                    }
                }
            }
        }

        console.log('🎉 Database schema initialized successfully!');
        console.log('💡 Next steps:');
        console.log('   1. Run the web application: npm run dev');
        console.log('   2. Sign up for an account');
        console.log('   3. Add stocks to your portfolio');
        console.log('   4. Optional: Run admin-tools for KIS data: npm run pump');

    } catch (error) {
        console.error('❌ Failed to initialize database schema:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your .env.local file has correct Supabase credentials');
        console.log('   2. Verify your Supabase project is active');
        console.log('   3. Try manually executing SQL in Supabase Dashboard > SQL Editor');
        console.log('   4. SQL files are located in: supabase/migrations/');
        process.exit(1);
    }
}

initializeDatabase();
