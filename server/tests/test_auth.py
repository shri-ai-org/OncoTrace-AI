import asyncio
import base64
import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.api import routes_vcf
from app.core import config
from app.main import app

from .conftest import TEST_PASSWORD, TEST_USERNAME, basic_auth_header

client = TestClient(app)

ANALYZE = "/api/v1/vcf/analyze"
VERIFY = "/api/v1/auth/verify"

# Enough to reach the auth dependency; the request never gets past it.
A_FILE = {"vcf_file": ("x.vcf", b"##fileformat=VCFv4.2\n", "text/plain")}


def test_verify_accepts_correct_credentials():
    r = client.post(VERIFY, headers=basic_auth_header())
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_verify_rejects_wrong_password():
    r = client.post(VERIFY, headers=basic_auth_header(password="nope"))
    assert r.status_code == 401


def test_verify_rejects_unknown_username():
    r = client.post(VERIFY, headers=basic_auth_header(username="someone-else"))
    assert r.status_code == 401


def test_wrong_username_and_wrong_password_are_indistinguishable():
    """Nothing in the response may reveal which half of the credential was wrong."""
    bad_user = client.post(VERIFY, headers=basic_auth_header(username="someone-else"))
    bad_pass = client.post(VERIFY, headers=basic_auth_header(password="nope"))
    assert bad_user.status_code == bad_pass.status_code
    assert bad_user.json() == bad_pass.json()


def test_analyze_requires_credentials():
    r = client.post(ANALYZE, files=A_FILE)
    assert r.status_code == 401


def test_analyze_rejects_wrong_credentials():
    r = client.post(ANALYZE, files=A_FILE, headers=basic_auth_header(password="nope"))
    assert r.status_code == 401


def test_health_stays_public():
    """nginx and uptime monitoring poll this unauthenticated."""
    r = client.get("/api/v1/health")
    assert r.status_code == 200


def test_401_never_sends_www_authenticate():
    """A WWW-Authenticate header makes the browser hijack the response with its
    own native credential dialog, which would bypass the app's login modal."""
    responses = [
        client.post(VERIFY),
        client.post(VERIFY, headers=basic_auth_header(password="nope")),
        client.post(ANALYZE, files=A_FILE),
        client.post(ANALYZE, files=A_FILE, headers=basic_auth_header(password="nope")),
        client.post(VERIFY, headers={"Authorization": "Basic !!!not-base64!!!"}),
        client.post(VERIFY, headers={"Authorization": "Bearer sometoken"}),
        client.post(VERIFY, headers={"Authorization": "Basic"}),
        client.post(
            VERIFY,
            headers={
                "Authorization": "Basic " + base64.b64encode(b"no-colon-here").decode()
            },
        ),
    ]
    for r in responses:
        assert r.status_code == 401, r.text
        assert "www-authenticate" not in {k.lower() for k in r.headers}


def test_malformed_authorization_headers_are_rejected():
    for header in (
        {"Authorization": "Basic !!!not-base64!!!"},
        {"Authorization": "Bearer sometoken"},
        {"Authorization": "Basic"},
        {"Authorization": ""},
        {"Authorization": "Basic " + base64.b64encode(b"no-colon-here").decode()},
    ):
        r = client.post(VERIFY, headers=header)
        assert r.status_code == 401, header


def test_password_containing_colon_is_handled():
    """Only the first colon separates user from password, so a password may
    legitimately contain colons."""
    token = base64.b64encode(f"{TEST_USERNAME}:a:b:c".encode()).decode()
    r = client.post(VERIFY, headers={"Authorization": f"Basic {token}"})
    assert r.status_code == 401  # wrong password, but parsed rather than crashing


def test_unconfigured_server_fails_closed(monkeypatch):
    """With no credential configured the analysis endpoint must refuse outright
    rather than fall back to serving everyone."""
    monkeypatch.setattr(config, "DEMO_AUTH_USERNAME", None)
    monkeypatch.setattr(config, "DEMO_AUTH_PASSWORD", None)

    for r in (
        client.post(ANALYZE, files=A_FILE, headers=basic_auth_header()),
        client.post(VERIFY, headers=basic_auth_header()),
    ):
        assert r.status_code == 503
        assert r.json()["error_kind"] == "auth_not_configured"
        assert "www-authenticate" not in {k.lower() for k in r.headers}

    # Health must stay up so an operator can still see the server is running.
    assert client.get("/api/v1/health").status_code == 200


@pytest.mark.parametrize("password", ["change-me", "CHANGE-ME", "short-pw"])
def test_placeholder_or_short_password_fails_closed(monkeypatch, password):
    """The .env.example placeholder, or a password short enough to guess within
    the rate limit, must not work as a login -- not even when sent exactly."""
    monkeypatch.setattr(config, "DEMO_AUTH_PASSWORD", password)
    r = client.post(VERIFY, headers=basic_auth_header(password=password))
    assert r.status_code == 503
    assert r.json()["error_kind"] == "auth_not_configured"
    assert password.lower() not in r.text.lower()


def test_auth_errors_use_the_flat_error_shape():
    """The client reads top-level error_kind/message on every error, so auth
    failures must not arrive wrapped in FastAPI's {"detail": ...}."""
    expected = {"error_kind": "unauthorized", "message": "Invalid demo credentials."}
    assert client.post(VERIFY).json() == expected
    assert client.post(ANALYZE, files=A_FILE).json() == expected
    assert client.post(ANALYZE, files=A_FILE, headers=basic_auth_header(password="nope")).json() == expected


# ------------------------------------------------- pre-body gate on uploads

def _call_analyze_raw(headers: list[tuple[bytes, bytes]]):
    """Drives the ASGI app directly and fails if `receive` is ever called --
    i.e. if any of the upload body would have been read."""
    sent, body_reads = [], []

    async def receive():
        # Recorded rather than raised: FastAPI turns an exception while parsing
        # the form into a plain 400, which would hide the read.
        body_reads.append(True)
        return {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    scope = {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "POST", "scheme": "http", "path": ANALYZE, "raw_path": ANALYZE.encode(),
        "root_path": "", "query_string": b"",
        "headers": [
            (b"host", b"testserver"),
            (b"content-type", b"multipart/form-data; boundary=x"),
            (b"content-length", b"524288000"),
            *headers,
        ],
        "client": ("203.0.113.9", 50000), "server": ("testserver", 80),
    }
    asyncio.run(app(scope, receive, send))
    assert not body_reads, "the request body was read before the request was allowed"
    start = next(m for m in sent if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return start["status"], {k.decode().lower() for k, _ in start["headers"]}, json.loads(body)


def _raw_auth(password=TEST_PASSWORD):
    return [(b"authorization", basic_auth_header(password=password)["Authorization"].encode())]


@pytest.mark.parametrize("headers", [[], _raw_auth("nope"), [(b"authorization", b"Basic !!!")]])
def test_unauthenticated_upload_is_refused_before_the_body_is_read(headers, caplog):
    """FastAPI parses a multipart body BEFORE running route dependencies, so the
    credential must be checked ahead of that -- otherwise anyone can stream a
    500 MB body into the server's temp dir before being turned away."""
    with caplog.at_level(logging.WARNING, logger="oncotrace.auth"):
        status, header_names, body = _call_analyze_raw(headers)
    assert status == 401
    assert body == {"error_kind": "unauthorized", "message": "Invalid demo credentials."}
    assert "www-authenticate" not in header_names
    # The line deploy/fail2ban/ matches, with the real client address.
    assert "demo auth failure from 203.0.113.9 /api/v1/vcf/analyze" in caplog.text


def test_unconfigured_server_refuses_upload_before_the_body_is_read(monkeypatch):
    monkeypatch.setattr(config, "DEMO_AUTH_PASSWORD", None)
    status, header_names, body = _call_analyze_raw(_raw_auth())
    assert status == 503
    assert body["error_kind"] == "auth_not_configured"
    assert "www-authenticate" not in header_names


def test_upload_at_capacity_is_shed_before_the_body_is_read(monkeypatch):
    """An authenticated upload that can only be shed must not be received first."""
    monkeypatch.setattr(routes_vcf, "_analysis_slots", asyncio.Semaphore(0))
    status, _, body = _call_analyze_raw(_raw_auth())
    assert status == 503
    assert "capacity" in body["message"]
