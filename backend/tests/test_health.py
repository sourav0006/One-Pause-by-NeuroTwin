import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "ONE PAUSE"
    assert data["database"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "ONE PAUSE" in data["message"]
    assert data["health"] == "/api/v1/health"


def test_settings_database_url_normalization():
    from app.core.config import Settings

    # Case 1: postgres:// scheme standard on Render / Heroku
    s1 = Settings(DATABASE_URL="postgres://user:secret@host.render.com:5432/onepause")
    assert s1.DATABASE_URL.startswith("postgresql+asyncpg://")

    # Case 2: postgresql:// without async driver
    s2 = Settings(DATABASE_URL="postgresql://user:secret@host.render.com:5432/onepause")
    assert s2.DATABASE_URL.startswith("postgresql+asyncpg://")

    # Case 3: already has asyncpg driver
    s3 = Settings(DATABASE_URL="postgresql+asyncpg://user:secret@host.render.com:5432/onepause")
    assert s3.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_settings_cors_defaults_and_inclusion():
    from app.core.config import Settings

    # Default includes local dev and Capacitor origins
    s_default = Settings()
    assert isinstance(s_default.BACKEND_CORS_ORIGINS, list)
    assert "https://localhost" in s_default.BACKEND_CORS_ORIGINS
    assert "capacitor://localhost" in s_default.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s_default.BACKEND_CORS_ORIGINS

    # Direct instantiation with comma-separated string
    s_custom = Settings(
        BACKEND_CORS_ORIGINS="https://app.onepause.com, https://localhost",
        FRONTEND_ORIGIN="https://frontend.render.com",
    )
    assert isinstance(s_custom.BACKEND_CORS_ORIGINS, list)
    assert "https://app.onepause.com" in s_custom.BACKEND_CORS_ORIGINS
    assert "https://localhost" in s_custom.BACKEND_CORS_ORIGINS
    assert "https://frontend.render.com" in s_custom.BACKEND_CORS_ORIGINS


def test_cors_env_comma_separated_parsing(monkeypatch):
    """Regression test: Render sets BACKEND_CORS_ORIGINS as a comma-separated env var."""
    from app.core.config import Settings

    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "https://localhost,capacitor://localhost,https://onepause.onrender.com")
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://frontend.onrender.com")

    s = Settings()
    assert isinstance(s.BACKEND_CORS_ORIGINS, list)
    assert "https://localhost" in s.BACKEND_CORS_ORIGINS
    assert "capacitor://localhost" in s.BACKEND_CORS_ORIGINS
    assert "https://onepause.onrender.com" in s.BACKEND_CORS_ORIGINS
    assert "https://frontend.onrender.com" in s.BACKEND_CORS_ORIGINS
    assert "*" not in s.BACKEND_CORS_ORIGINS


def test_cors_env_json_array_parsing(monkeypatch):
    """Verify that JSON array string in BACKEND_CORS_ORIGINS environment variable is parsed."""
    from app.core.config import Settings

    monkeypatch.setenv("BACKEND_CORS_ORIGINS", '["https://api.onepause.com", "https://localhost"]')

    s = Settings()
    assert isinstance(s.BACKEND_CORS_ORIGINS, list)
    assert "https://api.onepause.com" in s.BACKEND_CORS_ORIGINS
    assert "https://localhost" in s.BACKEND_CORS_ORIGINS
    assert "*" not in s.BACKEND_CORS_ORIGINS
