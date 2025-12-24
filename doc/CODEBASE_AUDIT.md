# Codebase Audit & Cleanup Plan

This document outlines the necessary changes to the codebase to transition from the "Serverless SaaS" model to the **"Personal Local Engine"** model.

## 1. Files to DELETE (Cleanup)
These files are residues of the previous strategy (server-side scraping or direct API calls from Vercel) and are no longer needed.

| File Path | Reason |
| :--- | :--- |
| `api/sync.py` | **Major**: We no longer scrape PyKRX from Vercel serverless functions. Data ingestion is now Local. |
| `api/requirements.txt` | Dependency file for the deleted `sync.py`. |
| `admin-tools/krx-sync.js` | **Legacy**: Old Node.js script that scraped KRX directly. Replaced by robust `pykrx` Python engine. |
| `admin-tools/sync-stocks.js` | **Legacy**: Replaced by `batch_daily.py` universe management. |
| `admin-tools/update-stock-list.js` | **Legacy**: Replaced by `batch_daily.py`. |
| `admin-tools/2_sync_prices.bat` | **Legacy**: Will be replaced by new runner scripts (e.g., `run_engine.bat`). |

## 2. Files to MODIFY
These files contain logic that is partially useful but needs realignment.

| File Path | Action |
| :--- | :--- |
| `admin-tools/kis-pump.js` | **Refactor**: Convert from "One-off Dump" to "Watchlist Loop" that pushes real-time KIS data to Supabase. |
| `admin-tools/stock-data-service/main.py` | **Refactor**: Rename to `batch_daily.py`. Change target from Supabase Direct Upsert to **Local SQLite Insert**. |
| `src/app/actions_analysis.ts` | **Update**: Logic to read from new `daily_analysis_reports` table instead of raw `analysis_cache`. |

## 3. Files to CREATE (New Engine)
The core of the new architecture.

| File Path | Purpose |
| :--- | :--- |
| `admin-tools/schema_sqlite.sql` | **Schema**: Defines `tickers`, `daily_price`, `fundamentals` for SQLite. |
| `admin-tools/db_init.py` | **Setup**: Initializes the local `dailyport.db`. |
| `admin-tools/batch_daily.py` | **Ingest**: The nightly worker. Fetches PyKRX data -> SQLite. |

## 4. Next Steps
1.  **Approve Cleanup**: Delete the files listed in Section 1.
2.  **Initialize DB**: Create Schema and Init script.
3.  **Migrate Logic**: Move `main.py` logic into `batch_daily.py` and modify to use SQLite.
