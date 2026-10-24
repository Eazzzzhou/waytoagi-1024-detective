"""只用于本地预览；日常直接双击打开收藏.html即可。"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

root = Path(__file__).resolve().parent.parent
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
print(f'http://127.0.0.1:{server.server_port}/%E6%89%93%E5%BC%80%E6%94%B6%E8%97%8F.html', flush=True)
server.serve_forever()
