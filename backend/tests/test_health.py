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


def test_settings_cors_and_capacitor_origins():
    from app.core.config import Settings

    # Default includes local dev and Capacitor origins
    s_default = Settings()
    assert "https://localhost" in s_default.BACKEND_CORS_ORIGINS
    assert "capacitor://localhost" in s_default.BACKEND_CORS_ORIGINS

    # Comma-separated string from environment variable
    s_custom = Settings(
        BACKEND_CORS_ORIGINS="https://app.onepause.com, https://localhost",
        FRONTEND_ORIGIN="https://frontend.render.com",
    )
    assert "https://app.onepause.com" in s_custom.BACKEND_CORS_ORIGINS
    assert "https://localhost" in s_custom.BACKEND_CORS_ORIGINS
    assert "https://frontend.render.com" in s_custom.BACKEND_CORS_ORIGINS

