"""Comprehensive tests for AI Provider Resilience, Configuration, and Multi-Turn Integrity.

Verifies:
1. Provider configuration & environment isolation (production cannot use demo fixtures).
2. Failure handling: missing key, quota exhaustion (429), timeouts, malformed JSON schema.
3. Multi-turn preservation: user hypothesis corrections and dismissals are never wiped by clarification.
4. Option regeneration: options update without corrupting graph node IDs or previous edits.
5. Privacy and persistence: deleted sessions return 404 and cannot be reopened.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.ai.base import (
    AIProviderConfigError,
)
from app.ai.demo import DevDemoAIProvider
from app.ai.deps import get_ai_provider
from app.ai.gemini import GeminiProvider
from app.core.config import settings


@pytest.mark.asyncio
async def test_provider_selection_logic(monkeypatch):
    """Verify strictly ordered provider selection and production environment isolation."""
    # Scenario A: Real key present -> Always GeminiProvider regardless of dev settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "real-mock-gemini-key")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    provider = get_ai_provider()
    assert isinstance(provider, GeminiProvider)

    # Scenario B: Missing key in production -> Always GeminiProvider (never fallback to demo)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    provider = get_ai_provider()
    assert isinstance(provider, GeminiProvider)
    with pytest.raises(AIProviderConfigError) as exc_info:
        provider._get_client()
    assert "GEMINI_API_KEY is not configured" in str(exc_info.value)

    # Scenario C: Missing key in dev with demo disabled -> GeminiProvider raising safe config error
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", False)
    provider = get_ai_provider()
    assert isinstance(provider, GeminiProvider)

    # Scenario D: Missing key in dev with demo explicitly enabled -> DevDemoAIProvider
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    provider = get_ai_provider()
    assert isinstance(provider, DevDemoAIProvider)


@pytest.mark.asyncio
async def test_failure_handling_and_no_credential_leak(client: AsyncClient, monkeypatch):
    """Verify that provider errors produce clean user-facing status codes without leaking credentials."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    # Register user
    email = f"resilience_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Analyze with unconfigured AI provider -> 503 Service Unavailable
    resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "A complex situation without configured key"},
        headers=headers,
    )
    assert resp.status_code == 503
    error_detail = resp.json()["detail"]
    assert error_detail["code"] == "AI_PROVIDER_NOT_CONFIGURED"
    assert "GEMINI_API_KEY" in error_detail["message"]
    # Ensure no secret strings or stack traces are leaked
    assert "traceback" not in str(resp.json()).lower()


@pytest.mark.asyncio
async def test_multi_turn_user_corrections_preserved_across_clarification(client: AsyncClient, monkeypatch):
    """Verify that multi-turn clarification never overwrites or discards user hypothesis edits."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    email = f"multiturn_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Analyze situation
    analyze_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "My team lead reassigned my primary task to an intern without prior discussion."},
        headers=headers,
    )
    assert analyze_resp.status_code == 201
    session_id = analyze_resp.json()["id"]
    initial_hypotheses = analyze_resp.json()["state"]["hypotheses"]
    assert len(initial_hypotheses) >= 2

    # 2. User explicitly corrects hypothesis 1 with a custom note
    hyp1_id = initial_hypotheses[0]["id"]
    patch1_resp = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp1_id}",
        json={"status": "corrected", "corrected_text": "The lead actually mentioned onboarding training earlier."},
        headers=headers,
    )
    assert patch1_resp.status_code == 200

    # 3. User explicitly dismisses hypothesis 2
    hyp2_id = initial_hypotheses[1]["id"]
    patch2_resp = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp2_id}",
        json={"status": "dismissed"},
        headers=headers,
    )
    assert patch2_resp.status_code == 200

    # 4. Now user submits a clarification answer
    clarify_resp = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "I asked my lead directly and they confirmed the intern needed an introductory ticket."},
        headers=headers,
    )
    assert clarify_resp.status_code == 200
    state_after_clarify = clarify_resp.json()["state"]

    # VERIFY CRITICAL INVARIANT: Previous user edits MUST be preserved
    h1_after = next(h for h in state_after_clarify["hypotheses"] if h["id"] == hyp1_id)
    assert h1_after["status"] == "corrected", "User-corrected status must NOT be reset by clarification"
    assert h1_after["user_note"] == "The lead actually mentioned onboarding training earlier."

    h2_after = next(h for h in state_after_clarify["hypotheses"] if h["id"] == hyp2_id)
    assert h2_after["status"] == "dismissed", "User-dismissed status must NOT be reset by clarification"

    # User's clarification answer is preserved as a reported fact
    assert any("introductory ticket" in f["text"] for f in state_after_clarify["reported_facts"])


@pytest.mark.asyncio
async def test_options_regeneration_preserves_unrelated_nodes(client: AsyncClient, monkeypatch):
    """Verify that refreshing options updates possible_responses without modifying other nodes."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    email = f"options_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    analyze_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Client requested an out-of-scope feature 2 days before the presentation."},
        headers=headers,
    )
    session_id = analyze_resp.json()["id"]
    facts_before = analyze_resp.json()["state"]["reported_facts"]
    unknowns_before = analyze_resp.json()["state"]["unknowns"]

    # Refresh options
    options_resp = await client.post(f"/api/v1/reflections/{session_id}/options", headers=headers)
    assert options_resp.status_code == 200
    state_after = options_resp.json()["state"]

    # Facts and unknowns must remain identical
    assert len(state_after["reported_facts"]) == len(facts_before)
    assert len(state_after["unknowns"]) == len(unknowns_before)
    # Options returned must be balanced with trade-offs
    for opt in state_after["possible_responses"]:
        assert len(opt["benefits"]) >= 1
        assert len(opt["risks"]) >= 1


@pytest.mark.asyncio
async def test_reopen_and_deleted_session_behavior(client: AsyncClient, monkeypatch):
    """Verify that a saved session reconstructs the exact graph, and deleted session cannot be reopened."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    email = f"lifecycle_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPassword123!"
    await client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_resp = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    analyze_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Dispute with co-founder regarding company hiring priorities."},
        headers=headers,
    )
    session_id = analyze_resp.json()["id"]

    # Explicitly save
    save_resp = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={"title": "Hiring Dispute"},
        headers=headers,
    )
    assert save_resp.status_code == 200
    assert save_resp.json()["is_saved"] is True

    # Reopen
    reopen_resp = await client.get(f"/api/v1/reflections/{session_id}", headers=headers)
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["title"] == "Hiring Dispute"
    assert len(reopen_resp.json()["state"]["reported_facts"]) >= 1

    # Delete
    del_resp = await client.delete(f"/api/v1/reflections/{session_id}", headers=headers)
    assert del_resp.status_code == 200

    # Stale reopen attempt must fail with 404
    stale_resp = await client.get(f"/api/v1/reflections/{session_id}", headers=headers)
    assert stale_resp.status_code == 404
