"""
Pure-ASGI performance middleware.

Tracks per-route latency (count, min, max, avg, p50, p95, p99)
and injects an X-Process-Time header on every response.

Endpoints exposed by main.py:
  GET  /perf/stats  — current stats
  POST /perf/reset  — clear all stats
"""

import time
import threading
import statistics
from collections import deque
from typing import Any, Callable

HISTORY_SIZE = 1000  # last N durations kept per route


class _RouteStats:
    __slots__ = ("count", "errors", "durations", "_lock")

    def __init__(self):
        self.count: int = 0
        self.errors: int = 0
        self.durations: deque[float] = deque(maxlen=HISTORY_SIZE)
        self._lock = threading.Lock()

    def record(self, duration_ms: float, is_error: bool) -> None:
        with self._lock:
            self.count += 1
            if is_error:
                self.errors += 1
            self.durations.append(duration_ms)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            durs = list(self.durations)
        if not durs:
            return {"count": 0, "errors": 0}
        sorted_durs = sorted(durs)
        n = len(sorted_durs)
        return {
            "count": self.count,
            "errors": self.errors,
            "avg_ms": round(statistics.mean(sorted_durs), 2),
            "min_ms": round(sorted_durs[0], 2),
            "max_ms": round(sorted_durs[-1], 2),
            "p50_ms": round(sorted_durs[int(n * 0.50)], 2),
            "p95_ms": round(sorted_durs[min(int(n * 0.95), n - 1)], 2),
            "p99_ms": round(sorted_durs[min(int(n * 0.99), n - 1)], 2),
        }


# Module-level state shared between middleware instances and endpoint helpers
_routes: dict[str, _RouteStats] = {}
_routes_lock = threading.Lock()
_started_at: float = time.time()


def get_stats() -> dict[str, Any]:
    """Return full stats snapshot (called by /perf/stats)."""
    with _routes_lock:
        routes_copy = dict(_routes)

    per_route = {path: stats.snapshot() for path, stats in routes_copy.items()}

    total_count = sum(s["count"] for s in per_route.values())
    total_errors = sum(s.get("errors", 0) for s in per_route.values())
    all_avgs = [s["avg_ms"] for s in per_route.values() if s["count"] > 0]

    return {
        "summary": {
            "total_requests": total_count,
            "total_errors": total_errors,
            "avg_ms": round(statistics.mean(all_avgs), 2) if all_avgs else 0,
            "started_at": _started_at,
        },
        "routes": per_route,
    }


def reset_stats() -> None:
    """Clear all recorded stats (called by /perf/reset)."""
    global _started_at
    with _routes_lock:
        _routes.clear()
    _started_at = time.time()


class PerformanceMiddleware:
    """
    Pure ASGI middleware — does NOT subclass BaseHTTPMiddleware.

    Wraps the `send` callable to inject X-Process-Time after headers
    are produced, then records the duration keyed by the route pattern
    (e.g. /warehouse/{item_id}) rather than the concrete path.
    """

    def __init__(self, app: Callable):
        self.app = app

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status_code = 200

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                # Inject X-Process-Time header (value updated after body)
                elapsed_ms = (time.perf_counter() - start) * 1000
                headers = list(message.get("headers", []))
                headers.append((b"x-process-time", f"{elapsed_ms:.2f}".encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

        # Record stats after the response is fully sent
        elapsed_ms = (time.perf_counter() - start) * 1000
        is_error = status_code >= 500

        # Prefer the route pattern from FastAPI's routing; fall back to raw path
        route_path: str = scope.get("path", "/unknown")
        route = scope.get("route")
        if route and hasattr(route, "path"):
            route_path = route.path

        with _routes_lock:
            if route_path not in _routes:
                _routes[route_path] = _RouteStats()
            route_stats = _routes[route_path]

        route_stats.record(elapsed_ms, is_error)
