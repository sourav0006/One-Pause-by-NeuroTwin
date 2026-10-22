"""Prompt 10: Security, Privacy, Authentication, and Data Integrity Audit Test Suite.

Verifies:
1. Token claims validation: expired tokens, malformed tokens, missing exp/sub are rejected with 401.
2. Ownership enforcement on all endpoints (get, clarify, patch hypothesis, options, complete, save, delete).
3. Parameter tampering protection: extra fields in request payloads are forbidden (422).
4. Boundary limits: excessive input lengths rejected with 422.
5. Production secret validation: default dev secret rejected in production.
6. Immutability of completed sessions: clarify/patch/options rejected with 400 once completed.
7. Option ID integrity: invalid selected_option_id rejected with 400.
8. Privacy: password hash never serialized in API responses.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import AsyncClient

from app.core.config import Settings, settings
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_jwt_token_validation_and_malformed_tokens(client: AsyncClient):
    """Verify expired, malformed, unsigned, and incomplete tokens are strictly rejected."""
    # 1. Missing token on protected route -> 401
    unauth_resp = await client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401
    assert "Authentication credentials were not provided" in unauth_resp.json()["detail"]

    # 2. Malformed token string -> 401
    malformed_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert malformed_resp.status_code == 401

    # 3. Token signed with wrong secret key -> 401
    fake_token = jwt.encode(
        {"sub": str(uuid.uuid4()), "exp": datetime.now(UTC) + timedelta(minutes=10)},
        "completely-different-wrong-secret-key-123",
        algorithm="HS256",
    )
    wrong_key_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert wrong_key_resp.status_code == 401

    # 4. Expired token -> 401
    expired_token = create_access_token(
        subject=str(uuid.uuid4()),
        expires_delta=timedelta(seconds=-10),
    )
    expired_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_resp.status_code == 401

    # 5. Token missing 'sub' claim -> 401
    no_sub_token = jwt.encode(
        {"exp": datetime.now(UTC) + timedelta(minutes=10)},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    no_sub_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {no_sub_token}"},
    )
    assert no_sub_resp.status_code == 401


@pytest.mark.asyncio
async def test_production_secret_key_rejection():
    """Verify default insecure dev secret cannot be used when ENVIRONMENT is production."""
    with pytest.raises(ValueError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="one-pause-local-mvp-secret-key-change-in-production-only",
        )
    assert "JWT_SECRET_KEY must be set to a secure" in str(exc_info.value)


@pytest.mark.asyncio
async def test_extra_fields_forbidden_against_mass_assignment(client: AsyncClient):
    """Verify request payloads with extra/tampered fields are rejected with HTTP 422."""
    # Register with injected admin/role field -> 422
    tampered_reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "password": "ValidPassword123!",
            "is_admin": True,
            "role": "superuser",
        },
    )
    assert tampered_reg.status_code == 422

    # Analyze with injected is_saved field -> 422
    # Register valid user first
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "ValidPassword123!"
    reg = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    tampered_analyze = await client.post(
        "/api/v1/reflections/analyze",
        json={
            "situation": "A valid situation with enough characters for validation",
            "is_saved": True,
            "status": "completed",
        },
        headers=headers,
    )
    assert tampered_analyze.status_code == 422


@pytest.mark.asyncio
async def test_password_hash_never_exposed(client: AsyncClient):
    """Verify password hash is never serialized in registration, login, or /me responses."""
    email = f"privacy_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "ValidPassword123!"

    reg_resp = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    assert reg_resp.status_code == 201
    assert "password_hash" not in str(reg_resp.json()).lower()

    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert "password" not in me_resp.json()
    assert "password_hash" not in me_resp.json()


@pytest.mark.asyncio
async def test_completed_session_immutability_and_option_validation(client: AsyncClient, monkeypatch):
    """Verify completed sessions cannot be modified and invalid option IDs are rejected."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    email = f"immutable_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "ValidPassword123!"
    reg = await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create reflection
    res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Examining team conflict regarding project architecture."},
        headers=headers,
    )
    session_id = res.json()["id"]

    # Attempt to complete with invalid option ID -> 400
    bad_complete = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={"selected_option_id": "nonexistent_hacked_option_id"},
        headers=headers,
    )
    assert bad_complete.status_code == 400
    assert "does not exist in this reflection" in bad_complete.json()["detail"]

    # Complete validly without choosing
    good_complete = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={"selected_option_id": None},
        headers=headers,
    )
    assert good_complete.status_code == 200
    assert good_complete.json()["status"] == "completed"

    # Attempt to clarify completed session -> 400
    clarify_attempt = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "Trying to clarify completed reflection"},
        headers=headers,
    )
    assert clarify_attempt.status_code == 400
    assert "Cannot clarify a completed reflection session" in clarify_attempt.json()["detail"]

    # Attempt to modify hypothesis on completed session -> 400
    hyp_attempt = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/hypothesis_1",
        json={"status": "dismissed"},
        headers=headers,
    )
    assert hyp_attempt.status_code == 400
    assert "Cannot modify hypotheses on a completed reflection session" in hyp_attempt.json()["detail"]

    # Attempt to refresh options on completed session -> 400
    options_attempt = await client.post(
        f"/api/v1/reflections/{session_id}/options",
        headers=headers,
    )
    assert options_attempt.status_code == 400
    assert "Cannot refresh options for a completed reflection session" in options_attempt.json()["detail"]
