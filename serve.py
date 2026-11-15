"""Локальный просмотр сайта: python serve.py  ->  http://localhost:5173"""
import http.server
import socketserver

PORT = 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html; charset=utf-8",
        ".webp": "image/webp",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"SPECTRE: http://localhost:{PORT}")
        httpd.serve_forever()
