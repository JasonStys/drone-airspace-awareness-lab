"""Jason Stys: loopback, origin, request bounds and actual-service API contracts. Lines: docs/SOURCE_MAP.md."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from awareness import app as service
from awareness.engine import KernelUnavailable

client = TestClient(service.app, base_url="http://127.0.0.1")


def test_actual_api_and_ui():
    """Replay native computation through the HTTP stack; serve the real built application."""
    assert client.get("/api/health").json()["ready"]
    data = client.get("/api/examples").json()
    response = client.post("/api/analyze", json=data)
    assert response.status_code == 200 and response.json()["alerts"]
    assert "Jason Stys" in client.get("/").text
    assert client.get("/").headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in client.get("/").headers["content-security-policy"]
    assert client.get("/api/missing").status_code == 404
    assert client.get("/../requirements.lock").status_code == 404


@pytest.mark.parametrize(
    "host",
    ["evil.example", "127.0.0.1.evil", "localhost.evil", "0.0.0.0", "[::1]"],  # noqa: S104 - rejection fixture, not a bind address
)
def test_rebinding(host):
    """Reject DNS rebinding / external Host headers even on a local TCP connection."""
    assert client.get("/api/health", headers={"Host": host}).status_code == 400


def test_origin_type_methods_and_boundaries():
    """Browser CSRF, form posts, preflight and streamed oversize writes are rejected."""
    assert (
        client.post("/api/analyze", headers={"Origin": "https://evil.example"}, json={}).status_code
        == 403
    )
    assert client.post("/api/analyze", content="{}").status_code == 415
    assert client.options("/api/analyze").status_code == 405
    assert (
        client.post(
            "/api/analyze", content=b" " * 262145, headers={"Content-Type": "application/json"}
        ).status_code
        == 413
    )
    response = client.post(
        "/api/analyze",
        content=b"bad",
        headers={"Content-Type": "application/json", "Origin": "http://127.0.0.1"},
    )
    assert response.status_code == 422 and "input" not in response.json()["errors"][0]


def test_busy_and_native_failure(monkeypatch):
    """Overload/unavailable workers return explicit failure, never successful empty advisories."""
    data = client.get("/api/examples").json()
    service.GATE.acquire()
    service.GATE.acquire()
    try:
        assert client.post("/api/analyze", json=data).status_code == 429
    finally:
        service.GATE.release()
        service.GATE.release()

    def fail(*args):
        """Deliberately unavailable worker verifies error mapping."""
        raise KernelUnavailable()

    monkeypatch.setattr(service, "analyze", fail)
    assert client.post("/api/analyze", json=data).status_code == 503


def test_missing_build_and_kernel(monkeypatch, tmp_path):
    """Readiness and UI make incomplete installation visible."""
    monkeypatch.setattr(service, "BINARY", tmp_path / "absent")
    monkeypatch.setattr(service, "ROOT", tmp_path)
    assert client.get("/api/health").status_code == 503
    assert client.get("/").status_code == 503


def test_slow_body(monkeypatch):
    """Timeout branch is controlled at the body deadline, not by sleeping tests."""

    class Timeout:
        """Deterministic async deadline failure."""

        async def __aenter__(self):
            raise TimeoutError()

        async def __aexit__(self, *args):
            return False

    monkeypatch.setattr(asyncio, "timeout", lambda value: Timeout())
    assert client.post("/api/analyze", json={}).status_code == 408


def test_launcher_is_loopback_only(monkeypatch):
    """Exercise CLI parsing without spawning another server in the unit coverage session."""
    import sys

    from awareness import __main__ as launcher

    calls = []
    monkeypatch.setattr(sys, "argv", ["awareness", "--port", "8873"])
    monkeypatch.setattr(launcher.uvicorn, "run", lambda *args, **kw: calls.append((args, kw)))
    launcher.main()
    assert calls[0][1] == {"host": "127.0.0.1", "port": 8873, "access_log": False}
    monkeypatch.setattr(sys, "argv", ["awareness", "--port", "80"])
    with pytest.raises(SystemExit):
        launcher.main()
