"""Local dev server for the ScreenMind site.
Python's built-in http.server serves .js as text/plain on Windows, which breaks
ES module <script type="module">. This forces the correct MIME types.

Usage:  python serve.py           (serves this folder at http://127.0.0.1:8000/)
"""
import http.server
import socketserver

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js":   "text/javascript",
    ".mjs":  "text/javascript",
    ".css":  "text/css",
    ".json": "application/json",
    ".wasm": "application/wasm",
    ".svg":  "image/svg+xml",
})
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"ScreenMind site → http://127.0.0.1:{PORT}/  (Ctrl+C to stop)")
    httpd.serve_forever()
