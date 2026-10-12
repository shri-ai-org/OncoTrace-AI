import base64

import pytest

from app.core import config

TEST_USERNAME = "test-user"
# At least config.MIN_DEMO_PASSWORD_LENGTH: a shorter one is refused as unconfigured.
TEST_PASSWORD = "test-password-123"


def basic_auth_header(username=TEST_USERNAME, password=TEST_PASSWORD):
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


@pytest.fixture(autouse=True)
def configured_demo_auth(monkeypatch):
    """Gives every test a known demo credential.

    app.core.security reads these off the config module at call time, so
    patching the attributes here is enough -- no environment juggling, and the
    real credential never has to exist for the suite to run.
    """
    monkeypatch.setattr(config, "DEMO_AUTH_USERNAME", TEST_USERNAME)
    monkeypatch.setattr(config, "DEMO_AUTH_PASSWORD", TEST_PASSWORD)
