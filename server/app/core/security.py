"""Shared-credential gate for the invite-only demo.

The Authorization header is parsed by hand rather than with FastAPI's
``HTTPBasic``: that helper attaches ``WWW-Authenticate: Basic`` to its 401s even
with ``auto_error=False`` (a malformed header still raises through its internal
error path), and that header makes the browser hijack the response with its own
native credential dialog -- which would defeat the app's designed login modal.
Nothing here ever sets that header.

The same check runs twice for an upload: once in routes_vcf.AnalyzeGate, a raw
ASGI middleware that rejects before a single body byte is read (FastAPI parses
a multipart form BEFORE running dependencies, so the dependency alone would
let anyone stream 500 MB into /tmp first), and again as the route dependency.
"""

import base64
import binascii
import logging
import secrets

from fastapi import Request
from fastapi.responses import JSONResponse

from . import config

logger = logging.getLogger("oncotrace.auth")


class DemoAuthError(Exception):
    """A refused request. Rendered (by main.py's handler, or directly by the
    upload gate) as the flat {error_kind, message} body every other API error
    uses -- and never with a WWW-Authenticate header."""

    def __init__(self, status_code: int, error_kind: str, message: str):
        self.status_code = status_code
        self.error_kind = error_kind
        self.message = message
        super().__init__(message)

    def response(self) -> JSONResponse:
        return JSONResponse(
            status_code=self.status_code,
            content={"error_kind": self.error_kind, "message": self.message},
        )


def _unauthorized(client: str, path: str) -> DemoAuthError:
    # One identical response for every failure mode -- absent header, malformed
    # header, wrong username, wrong password -- so nothing distinguishes "no
    # such user" from "wrong password" to someone probing the endpoint.
    #
    # Logged at WARNING with the client IP so repeated failures are visible in
    # journald and can be picked up by fail2ban. A single shared credential is
    # inherently brute-forceable, so silent failures are not acceptable. The
    # attempted username is deliberately NOT logged: it is frequently a
    # mistyped password, and those must never reach the logs.
    #
    # `client` is the real client IP: uvicorn rewrites it from nginx's
    # X-Forwarded-For (trusted from 127.0.0.1 only), so this line is what the
    # fail2ban filter in deploy/fail2ban/ matches.
    logger.warning("demo auth failure from %s %s", client, path)
    return DemoAuthError(401, "unauthorized", "Invalid demo credentials.")


def check_demo_auth(authorization: str, client: str, path: str) -> str:
    """Validates an HTTP Basic Authorization header value against the configured
    demo login. Framework-free so the pre-body upload gate can call it on raw
    ASGI headers.

    Returns the authenticated username; raises DemoAuthError -- 401 on any
    failure, 503 when the server has no usable credential configured.
    """
    problem = config.demo_auth_problem()
    if problem:
        logger.error("demo auth is not configured -- %s (see server/.env.example)", problem)
        raise DemoAuthError(
            503, "auth_not_configured", "Demo authentication is not configured on this server.",
        )

    scheme, _, param = authorization.partition(" ")
    if scheme.lower() != "basic" or not param:
        raise _unauthorized(client, path)

    try:
        decoded = base64.b64decode(param, validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise _unauthorized(client, path)

    username, separator, password = decoded.partition(":")
    if not separator:
        raise _unauthorized(client, path)

    # Both comparisons always run -- `and` would short-circuit on a username
    # mismatch and leak, through response timing, whether the username was right.
    # compare_digest needs bytes here: it rejects str containing non-ASCII.
    username_ok = secrets.compare_digest(
        username.encode("utf-8"), config.DEMO_AUTH_USERNAME.encode("utf-8")
    )
    password_ok = secrets.compare_digest(
        password.encode("utf-8"), config.DEMO_AUTH_PASSWORD.encode("utf-8")
    )
    if not (username_ok and password_ok):
        raise _unauthorized(client, path)

    return username


def require_demo_auth(request: Request) -> str:
    """Route dependency form of check_demo_auth."""
    return check_demo_auth(
        request.headers.get("authorization", ""),
        request.client.host if request.client else "unknown",
        request.url.path,
    )
