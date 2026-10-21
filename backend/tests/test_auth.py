import pytest
from httpx import AsyncClient

from app.core.security import get_password_hash, verify_password


def test_password_hashing():
    raw = "MySecretPassword42!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register a new user
    register_payload = {
        "email": "tester@example.com",
        "password": "SecurePassword123!",
    }
    reg_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "tester@example.com"
    # Never return password hash (PRD §7 FR-01)
    assert "password_hash" not in reg_data["user"]
    assert "password" not in reg_data["user"]

    token = reg_data["access_token"]

    # 2. Duplicate registration should fail with 400
    dup_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Successful login
    login_payload = {
        "email": "tester@example.com",
        "password": "SecurePassword123!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == "tester@example.com"

    # 4. Incorrect login password fails with 401
    bad_login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "tester@example.com", "password": "WrongPassword!"},
    )
    assert bad_login_res.status_code == 401

    # 5. Nonexistent user login fails with 401
    no_user_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "Password123!"},
    )
    assert no_user_res.status_code == 401

    # 6. Access protected /auth/me with valid Bearer token
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "tester@example.com"

    # 7. Access protected /auth/me without token should fail with 401
    unauth_res = await client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401

    # 8. Access protected /auth/me with invalid token should fail with 401
    invalid_token_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token_xyz"},
    )
    assert invalid_token_res.status_code == 401

    # 9. Logout returns successful message
    logout_res = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200
    assert "Successfully logged out" in logout_res.json()["message"]


@pytest.mark.asyncio
async def test_registration_validation(client: AsyncClient):
    # Short password rejected
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "123"},
    )
    assert res.status_code == 422

    # Invalid email rejected
    res_bad_email = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "ValidPassword123!"},
    )
    assert res_bad_email.status_code == 422
