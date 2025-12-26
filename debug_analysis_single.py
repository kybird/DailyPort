import sys
import os
import logging
from dotenv import load_dotenv

# Setup minimal env
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock valid environment for analyzer_daily import
# We need to ensure it can find .env or we set it manually
env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
load_dotenv(env_path)
os.environ["NODE_ENV"] = "development" # Ensure assertions don't kill it if applicable

# Add admin-tools/python to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'admin-tools', 'python'))

from analyzer_daily import process_watchlist, calculate_objectives_v3

print("--- Testing 488900 Analysis ---")
try:
    process_watchlist(["488900"])
    print("✅ process_watchlist completed without exception.")
except Exception as e:
    print(f"❌ process_watchlist FAILED: {e}")
    import traceback
    traceback.print_exc()
