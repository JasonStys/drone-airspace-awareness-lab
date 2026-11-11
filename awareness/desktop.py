"""Jason Stys: owned portable Rust-backed GUI and bounded Quit. Lines: docs/SOURCE_MAP.md.

Functions/classes: read_asset, identity, Session, OwnedServer, main. Variables: exact package,
kernel digest, ephemeral token and listener. No account store, aircraft endpoint or hardware.
"""

import argparse
import hashlib
import hmac
import json
import os
import platform
import re
import secrets
import socket
import stat
import sys
import webbrowser
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import uvicorn

from awareness import __version__
from awareness.engine import BINARY, ROOT


def read_asset(path: Path) -> bytes:
    """Read one regular opened descriptor, enforcing actual byte length as well as a 2 MiB cap."""
    descriptor = os.open(
        path, os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NONBLOCK", 0)
    )
    with os.fdopen(descriptor, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > 2 * 1024 * 1024:
            raise ValueError("Expected bounded regular resource")
        raw = stream.read(2 * 1024 * 1024 + 1)
    if len(raw) != info.st_size or len(raw) > 2 * 1024 * 1024:
        raise ValueError("Resource changed or exceeded its byte cap")
    return raw


def identity(root: Path) -> dict:
    """A frozen launch requires version/source and actual bundled Rust digest; source mode is explicit."""
    try:
        value = json.loads(read_asset(root / "awareness/resources/RELEASE.json"))
    except FileNotFoundError:
        if getattr(sys, "frozen", False):
            raise ValueError("Packaged identity missing") from None
        return {
            "name": "drone-airspace-awareness-lab",
            "version": __version__,
            "mode": "development",
        }
    if (
        not isinstance(value, dict)
        or type(value.get("schema_version")) is not int
        or value.get("schema_version") != 1
        or value.get("name") != "drone-airspace-awareness-lab"
        or value.get("version") != __version__
        or value.get("python_version") != platform.python_version()
        or not re.fullmatch(r"[a-f0-9]{40}", str(value.get("source_commit", "")))
        or type(value.get("source_dirty")) is not bool
        or value.get("kernel_sha256") != hashlib.sha256(read_asset(BINARY)).hexdigest()
    ):
        raise ValueError("Packaged identity or Rust digest invalid")
    return value


@dataclass
class Session:
    """One launch's lifecycle context, never a persisted account or a permission to operate aircraft."""

    origin: str
    metadata: dict
    token: str
    instance: str
    request_exit: Callable[[], None]

    def permitted(self, headers, *, require_origin: bool = False) -> bool:
        """Authenticate this exact loopback service, not another launch or cross-origin browser."""
        token = headers.get("X-Desktop-Token", "")
        origin = headers.get("Origin")
        return bool(
            headers.get("Host") == self.origin.removeprefix("http://")
            and (origin == self.origin if require_origin else origin in {None, self.origin})
            and re.fullmatch(r"[a-f0-9]{64}", token)
            and hmac.compare_digest(token, self.token)
        )


class OwnedServer(uvicorn.Server):
    """Report readiness only after Uvicorn owns its prebound socket and application startup succeeds."""

    def __init__(self, config, session: Session, no_browser: bool):
        """Store the caller-owned lifecycle context; use the installed Uvicorn graceful shutdown."""
        super().__init__(config)
        self.session = session
        self.no_browser = no_browser

    async def startup(self, sockets=None):
        """Actual startup and real API availability precede normal browser opening and readiness."""
        await super().startup(sockets=sockets)
        if not self.started:
            raise RuntimeError("Application startup did not complete")
        url = self.session.origin + "/"
        print("Drone Airspace Awareness Lab - synthetic advisory only.", flush=True)
        print(
            "PORTFOLIO_READY "
            + json.dumps(
                {
                    "url": url,
                    "package": self.session.metadata,
                    "instance": self.session.instance,
                    "token": self.session.token,
                }
            ),
            flush=True,
        )
        print(
            "Open " + url + "#desktop=" + self.session.token + " or press Ctrl+C to stop.",
            flush=True,
        )
        if not self.no_browser:
            webbrowser.open(url + "#desktop=" + self.session.token)


def main(argv=None) -> int:
    """Open the full existing advisory UI with an actual packaged kernel, never a different server."""
    parser = argparse.ArgumentParser(
        description="Synthetic Airspace Awareness desktop by Jason Stys"
    )
    parser.add_argument(
        "--port", type=int, choices=[0, *range(1024, 65536)], default=0, metavar="PORT"
    )
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)
    from awareness.app import app

    try:
        metadata = identity(ROOT)
        read_asset(BINARY)
        read_asset(ROOT / "dist/index.html")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(("127.0.0.1", args.port))
            listener.listen(16)
            origin = f"http://127.0.0.1:{listener.getsockname()[1]}"
            session = Session(
                origin,
                metadata,
                secrets.token_hex(32),
                os.environ.get("PORTABLE_SMOKE_NONCE", secrets.token_hex(16)),
                lambda: None,
            )
            config = uvicorn.Config(
                app,
                host="127.0.0.1",
                port=0,
                access_log=False,
                log_config=None,
                loop="asyncio",
                http="h11",
                ws="none",
                lifespan="on",
                proxy_headers=False,
                limit_concurrency=16,
                timeout_graceful_shutdown=5,
            )
            server = OwnedServer(config, session, args.no_browser)
            session.request_exit = lambda: setattr(server, "should_exit", True)
            app.state.desktop = session
            try:
                server.run(sockets=[listener])
            finally:
                app.state.desktop = None
        print("Application stopped.", flush=True)
        return 0
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Cannot start synthetic airspace app: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
