"""Serve the local demo and its pinned Three.js modules on loopback."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parent
THREE = PROJECT.parent / "0008-pelican-layout-study" / "web" / "vendor" / "three"
VENDOR_FILES = {"three.module.min.js", "three.core.min.js", "Reflector.js", "LICENSE"}


class DemoHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        prefix = "/vendor/"
        request_path = urlsplit(path).path
        if request_path.startswith(prefix):
            name = request_path.removeprefix(prefix)
            if name in VENDOR_FILES:
                return str(THREE / name)
        return super().translate_path(path)


class DemoServer(ThreadingHTTPServer):
    allow_reuse_address = False


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=53783)
    args = parser.parse_args()
    handler = partial(DemoHandler, directory=PROJECT / "web")
    with DemoServer(("127.0.0.1", args.port), handler) as server:
        print(f"http://127.0.0.1:{server.server_port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
