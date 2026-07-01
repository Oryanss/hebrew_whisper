import os
import tempfile

_tmp_dir = tempfile.mkdtemp()
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-tests-only")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp_dir}/test.db")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client, request):
    email = f"{request.node.name}@example.com".lower()
    password = "Str0ngPass!23"
    client.post(
        "/api/auth/register",
        json={"full_name": "עו\"ד בדיקה", "email": email, "password": password},
    )
    resp = client.post("/api/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
