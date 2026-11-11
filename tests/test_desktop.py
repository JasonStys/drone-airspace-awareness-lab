"""Jason Stys: actual API lifecycle authorization, source identity and native startup. Lines: docs/SOURCE_MAP.md."""

import asyncio
import hashlib
import json
import platform
import stat
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from awareness import app as service
from awareness import desktop


@pytest.fixture
def session(monkeypatch):
    """Isolate synthetic lifecycle state; no real application service, profile or account is reused."""
    exits = []
    value = desktop.Session(
        "http://127.0.0.1", {"version": "0.2.0"}, "a" * 64, "b" * 32, lambda: exits.append(True)
    )
    monkeypatch.setattr(service.app.state, "desktop", value, raising=False)
    return value, exits


def test_native_status_and_exact_quit_through_actual_api_stack(session):
    """Private control is opt-in; the public source service is never a generic shutdown endpoint."""
    value, exits = session
    with TestClient(service.app, base_url=value.origin) as client:
        assert client.get("/api/health").json()["package"] == value.metadata
        assert client.get("/api/desktop/status").status_code == 403
        headers = {
            "X-Desktop-Token": value.token,
            "Origin": value.origin,
            "Content-Type": "application/json",
        }
        response = client.get("/api/desktop/status", headers=headers)
        assert response.status_code == 200 and response.json()["mode"] == "synthetic-airspace-only"
        assert client.get("/api/desktop/exit", headers=headers).status_code == 405
        response = client.post("/api/desktop/exit", headers=headers, content=b'{"action":"quit"}')
        assert response.status_code == 202 and response.json() == {"stopping": True}
        assert exits == [True]


@pytest.mark.parametrize(
    "kind,body,code",
    [
        ("no-token", b'{"action":"quit"}', 403),
        ("wrong-token", b'{"action":"quit"}', 403),
        ("unicode-token", b'{"action":"quit"}', 403),
        ("no-origin", b'{"action":"quit"}', 403),
        ("foreign-origin", b'{"action":"quit"}', 403),
        ("other-loopback-port", b'{"action":"quit"}', 403),
        ("wrong-action", b'{"action":"nope"}', 400),
        ("extra-field", b'{"action":"quit","extra":true}', 400),
        ("invalid-json", b"{bad}", 400),
    ],
)
def test_unowned_or_invalid_quit_never_invokes_exit(session, kind, body, code):
    """Missing credentials, authority mismatch and malformed confirmations leave the launch usable."""
    value, exits = session
    headers = {
        "X-Desktop-Token": value.token,
        "Origin": value.origin,
        "Content-Type": "application/json",
    }
    if kind == "no-token":
        headers.pop("X-Desktop-Token")
    elif kind == "wrong-token":
        headers["X-Desktop-Token"] = "0" * 64
    elif kind == "unicode-token":
        headers["X-Desktop-Token"] = "not-a-token"
    elif kind == "no-origin":
        headers.pop("Origin")
    elif kind == "foreign-origin":
        headers["Origin"] = "https://foreign.invalid"
    elif kind == "other-loopback-port":
        headers["Host"] = "127.0.0.1:54321"
    with TestClient(service.app, base_url=value.origin) as client:
        assert client.post("/api/desktop/exit", headers=headers, content=body).status_code == code
        assert not exits and client.get("/api/health").status_code == 200


def test_regular_source_service_has_no_native_control(monkeypatch):
    """A valid-looking token cannot enable shutdown on the ordinary existing source API."""
    monkeypatch.setattr(service.app.state, "desktop", None, raising=False)
    with TestClient(service.app, base_url="http://127.0.0.1") as client:
        assert client.get("/api/desktop/status").status_code == 404
        assert client.post("/api/desktop/exit", json={"action": "quit"}).status_code == 404


def test_kernel_digest_and_runtime_identity_are_both_checked(tmp_path, monkeypatch):
    """Real tiny resource bytes make a modified kernel fail even when the manifest identity matches."""
    assert desktop.identity(tmp_path)["mode"] == "development"
    monkeypatch.setattr(desktop.sys, "frozen", True, raising=False)
    with pytest.raises(ValueError, match="missing"):
        desktop.identity(tmp_path)
    binary = tmp_path / "owned-inert-kernel"
    binary.write_bytes(b"fixture bytes; never executed")
    monkeypatch.setattr(desktop, "BINARY", binary)
    manifest = tmp_path / "awareness/resources/RELEASE.json"
    manifest.parent.mkdir(parents=True)
    value = {
        "schema_version": 1,
        "name": "drone-airspace-awareness-lab",
        "version": "0.2.0",
        "source_commit": "b" * 40,
        "source_dirty": False,
        "python_version": platform.python_version(),
        "kernel_sha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
    }
    manifest.write_text(json.dumps(value))
    assert desktop.identity(tmp_path) == value
    binary.write_bytes(b"different bytes")
    with pytest.raises(ValueError, match="digest"):
        desktop.identity(tmp_path)
    for key, bad in [
        ("schema_version", True),
        ("name", "other"),
        ("version", "0.1.0"),
        ("source_commit", "main"),
        ("source_dirty", 1),
        ("python_version", "0.0.0"),
    ]:
        manifest.write_text(json.dumps({**value, key: bad}))
        with pytest.raises(ValueError):
            desktop.identity(tmp_path)


def test_regular_descriptor_and_actual_size_are_required(tmp_path, monkeypatch):
    """A declared resource size cannot waive regular-file identity or actual capped-read length."""
    path = tmp_path / "resource"
    path.write_bytes(b"bytes")
    assert desktop.read_asset(path) == b"bytes"
    monkeypatch.setattr(
        desktop.os, "fstat", lambda _fd: SimpleNamespace(st_mode=stat.S_IFIFO, st_size=0)
    )
    with pytest.raises(ValueError, match="regular"):
        desktop.read_asset(path)
    monkeypatch.setattr(
        desktop.os, "fstat", lambda _fd: SimpleNamespace(st_mode=stat.S_IFREG, st_size=1)
    )
    with pytest.raises(ValueError, match="changed"):
        desktop.read_asset(path)


@pytest.mark.parametrize("no_browser", [False, True])
def test_ready_is_after_actual_startup_and_normal_opener_is_optional(
    monkeypatch, capsys, no_browser
):
    """Control-flow test keeps Uvicorn startup delegation; actual packaged startup is separate acceptance."""
    calls = []

    async def startup(server, sockets=None):
        assert sockets == ["owned-socket"]
        server.started = True

    monkeypatch.setattr(desktop.uvicorn.Server, "startup", startup)
    monkeypatch.setattr(desktop.webbrowser, "open", lambda url: calls.append(url))
    value = desktop.Session(
        "http://127.0.0.1:45678", {"version": "0.2.0"}, "a" * 64, "b" * 32, lambda: None
    )
    server = desktop.OwnedServer(desktop.uvicorn.Config(service.app), value, no_browser)
    asyncio.run(server.startup(["owned-socket"]))
    assert "PORTFOLIO_READY" in capsys.readouterr().out
    assert calls == ([] if no_browser else [value.origin + "/#desktop=" + value.token])


def test_failed_uvicorn_startup_never_claims_ready(monkeypatch, capsys):
    """A lifespan/startup failure is not transformed into readiness or a browser launch."""

    async def fail(_server, sockets=None):
        return None

    monkeypatch.setattr(desktop.uvicorn.Server, "startup", fail)
    value = desktop.Session("http://127.0.0.1:45678", {}, "a" * 64, "b" * 32, lambda: None)
    server = desktop.OwnedServer(desktop.uvicorn.Config(service.app), value, True)
    with pytest.raises(RuntimeError, match="startup"):
        asyncio.run(server.startup())
    assert "PORTFOLIO_READY" not in capsys.readouterr().out


def test_launcher_prebinds_its_own_socket_and_resets_state(tmp_path, monkeypatch, capsys):
    """Inspect an actual bound socket; no existing listener or global app session is adopted."""
    binary = tmp_path / "kernel"
    binary.write_bytes(b"inert")
    (tmp_path / "dist").mkdir()
    (tmp_path / "dist/index.html").write_text("inert")
    monkeypatch.setattr(desktop, "ROOT", tmp_path)
    monkeypatch.setattr(desktop, "BINARY", binary)

    class FakeServer:
        def __init__(self, config, session, no_browser):
            assert config.timeout_graceful_shutdown == 5 and not config.proxy_headers
            assert no_browser and session.metadata["mode"] == "development"
            self.session = session
            self.should_exit = False

        def run(self, sockets):
            assert sockets[0].getsockname()[0] == "127.0.0.1"
            assert sockets[0].getsockname()[1] >= 1024
            assert service.app.state.desktop is self.session
            self.session.request_exit()
            assert self.should_exit

    monkeypatch.setattr(desktop, "OwnedServer", FakeServer)
    assert desktop.main(["--no-browser"]) == 0
    assert service.app.state.desktop is None
    assert "Application stopped." in capsys.readouterr().out
    binary.unlink()
    assert desktop.main(["--no-browser"]) == 1
    for port in ("80", "-1", "65536"):
        with pytest.raises(SystemExit):
            desktop.main(["--port", port])
