from http.server import BaseHTTPRequestHandler
import sys
import os

# Add the admin-tools directory to the path so we can import main.py
# Vercel places the function in /var/task/api/sync.py (usually)
# We need to reach /var/task/admin-tools/stock-data-service
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(os.path.join(project_root, 'admin-tools', 'stock-data-service'))

try:
    from main import handler as main_handler
except ImportError:
    # Fallback for debugging path issues
    main_handler = None

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import logging

try:
    from main import sync_ticker
except ImportError:
    sync_ticker = None

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request()

    def handle_request(self):
        # 1. Parse Query Parameters
        parsed_url = urlparse(self.path)
        params = parse_qs(parsed_url.query)
        ticker = params.get('ticker', [None])[0]

        # 2. Set Headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # 3. Process Request
        if not sync_ticker:
             response = {"status": "error", "message": "Import Logic Failed"}
             self.wfile.write(json.dumps(response).encode('utf-8'))
             return

        if ticker:
            try:
                # Call the logic directly
                sync_ticker(ticker)
                response = {"status": "success", "message": f"Synced {ticker}"}
            except Exception as e:
                response = {"status": "error", "message": str(e)}
        else:
             response = {"status": "error", "message": "Missing 'ticker' parameter"}

        self.wfile.write(json.dumps(response).encode('utf-8'))
