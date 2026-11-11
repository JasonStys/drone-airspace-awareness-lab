"""Jason Stys: stateless loopback-only HTTP boundary and UI delivery. Lines: docs/SOURCE_MAP.md.

No accounts, analytics, outbound fetches, upload persistence or external AI services.
"""

import asyncio
import json
import re
import threading

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from awareness.engine import BINARY, ROOT, KernelUnavailable, analyze
from awareness.models import Replay

app = FastAPI(title="Drone Airspace Awareness Lab", docs_url=None, redoc_url=None, openapi_url=None)
GATE = threading.BoundedSemaphore(2)
MAX_BODY = 262_144
HEADERS = {
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
}


@app.middleware("http")
async def boundary(request: Request, call_next):
    """Reject rebinding/cross-origin writes; bound streamed bodies even without Content-Length."""
    host = request.headers.get("host", "")
    if not re.fullmatch(r"(?:127\.0\.0\.1|localhost)(?::[1-9][0-9]{0,4})?", host):
        response = JSONResponse({"error": "Loopback Host required"}, status_code=400)
    elif request.method not in {"GET", "HEAD", "POST"}:
        response = JSONResponse({"error": "Method not allowed"}, status_code=405)
    elif request.method == "POST":
        origin = request.headers.get("origin")
        if origin and origin != f"http://{host}":
            response = JSONResponse({"error": "Same-origin requests only"}, status_code=403)
        elif request.headers.get("content-type", "").split(";")[0] != "application/json":
            response = JSONResponse({"error": "application/json required"}, status_code=415)
        else:
            data = bytearray()
            try:
                async with asyncio.timeout(5):
                    async for chunk in request.stream():
                        data.extend(chunk)
                        if len(data) > MAX_BODY:
                            break
                if len(data) > MAX_BODY:
                    response = JSONResponse({"error": "Body exceeds 256 KiB"}, status_code=413)
                else:
                    request._body = bytes(data)
                    response = await call_next(request)
            except TimeoutError:
                response = JSONResponse({"error": "Request body timeout"}, status_code=408)
    else:
        response = await call_next(request)
    response.headers.update(HEADERS)
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_request, error):
    """Expose useful field locations without reflecting submitted documents or exception contexts."""
    return JSONResponse(
        {"errors": [{"field": list(item["loc"]), "type": item["type"]} for item in error.errors()]},
        status_code=422,
    )


@app.get("/api/health")
def health():
    """Readiness is not a flight-safety judgement."""
    ready = BINARY.is_file()
    value = {"ready": ready, "mode": "synthetic-local-only"}
    session = getattr(app.state, "desktop", None)
    if session is not None:
        value.update(package=session.metadata, instance=session.instance)
    return JSONResponse(value, status_code=200 if ready else 503)


@app.get("/api/desktop/status")
def desktop_status(request: Request):
    """Enable desktop controls only for the matching instance's private in-memory credential."""
    session = getattr(app.state, "desktop", None)
    if session is None:
        return JSONResponse({"error": "Not a desktop session"}, status_code=404)
    if not session.permitted(request.headers):
        return JSONResponse({"error": "Owned application token required"}, status_code=403)
    return {
        "version": session.metadata["version"],
        "package": session.metadata,
        "mode": "synthetic-airspace-only",
    }


@app.post("/api/desktop/exit")
async def desktop_exit(request: Request):
    """Quit only this exact launch after explicit same-origin confirmation, never through GET."""
    session = getattr(app.state, "desktop", None)
    if session is None:
        return JSONResponse({"error": "Not a desktop session"}, status_code=404)
    if not session.permitted(request.headers, require_origin=True):
        return JSONResponse(
            {"error": "Owned application token and origin required"}, status_code=403
        )
    raw = await request.body()
    if raw != b'{"action":"quit"}':
        return JSONResponse({"error": "Exact Quit confirmation required"}, status_code=400)
    session.request_exit()
    return JSONResponse({"stopping": True}, status_code=202)


@app.get("/api/examples")
def examples():
    """Return the fixed original synthetic exercise; never load caller-selected paths."""
    return json.loads((ROOT / "examples/training-replay.json").read_text(encoding="utf-8"))


@app.post("/api/analyze")
async def calculate(replay: Replay):
    """Run at most two bounded native processes; overload and kernel errors fail visibly."""
    if not GATE.acquire(blocking=False):
        return JSONResponse({"error": "Analysis busy; try again"}, status_code=429)
    try:
        return await run_in_threadpool(analyze, replay)
    except KernelUnavailable:
        return JSONResponse(
            {"error": "Native analysis unavailable; no assessment produced"}, status_code=503
        )
    finally:
        GATE.release()


@app.get("/")
def index():
    """Serve built UI only; no development proxy or user-controlled file path."""
    path = ROOT / "dist/index.html"
    if not path.is_file():
        return JSONResponse({"error": "Build UI with npm run build"}, status_code=503)
    return FileResponse(path)


app.mount("/assets", StaticFiles(directory=ROOT / "dist/assets", check_dir=False), name="assets")
