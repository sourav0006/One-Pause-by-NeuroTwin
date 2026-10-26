"""Complete 12-step End-to-End User Journey and Persistence Integration Test.

Tests the full lifecycle of ONE PAUSE:
1. Register and log in.
2. Enter a fictional situation.
3. Submit it for analysis (using DevDemoAIProvider in dev mode).
4. Display returned facts, hypotheses, unknowns, and goals.
5. Edit/dismiss a hypothesis.
6. Submit follow-up clarification answer.
7. Generate and inspect balanced response options.
8. Complete without choosing an option.
9. Verify completion recap (completed_at set, is_saved remains False).
10. Verify unsaved reflection does NOT appear on dashboard.
11. Explicitly save the reflection and reopen it from the dashboard.
12. Verify cross-user ownership isolation (privacy).
13. Delete the reflection and verify it disappears.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_complete_12_step_user_journey(client: AsyncClient, monkeypatch):
    """Execute all 12 steps of the user journey sequentially."""
    # Ensure dev demo mode is active for deterministic offline integration
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    # Step 1: Register and log in
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123!"

    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password},
    )
    assert reg_resp.status_code == 201, reg_resp.text
    assert "user" in reg_resp.json()

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2 & 3: Enter a fictional situation and submit for analysis
    situation_payload = {
        "situation": "My manager asked me to take on another project by Friday, but I am already at maximum bandwidth.",
        "context": "I want to protect my performance rating and maintain a good relationship.",
    }
    analyze_resp = await client.post(
        "/api/v1/reflections/analyze",
        json=situation_payload,
        headers=headers,
    )
    assert analyze_resp.status_code == 201, analyze_resp.text
    session_data = analyze_resp.json()
    session_id = session_data["id"]

    # Step 4: Verify returned facts, hypotheses, unknowns, goals on the interactive map
    state = session_data["state"]
    assert len(state["reported_facts"]) >= 2
    assert len(state["hypotheses"]) >= 2
    assert len(state["unknowns"]) >= 2
    assert len(state["goals"]) >= 1
    assert state["follow_up_question"] is not None
    assert len(state["possible_responses"]) == 3, f"Expected exactly 3 response options, got {len(state['possible_responses'])}"
    # Verify [DEV FIXTURE] tag is present on fixtures in dev demo mode
    assert "[DEV FIXTURE]" in state["encounter"]["description"]

    # Step 5: Edit or dismiss a hypothesis
    hyp_to_edit = state["hypotheses"][0]["id"]
    edit_resp = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp_to_edit}",
        json={"status": "corrected", "corrected_text": "I spoke to my lead and capacity is now acknowledged."},
        headers=headers,
    )
    assert edit_resp.status_code == 200, edit_resp.text
    updated_hyp = next(h for h in edit_resp.json()["state"]["hypotheses"] if h["id"] == hyp_to_edit)
    assert updated_hyp["status"] == "corrected"
    assert updated_hyp["user_note"] == "I spoke to my lead and capacity is now acknowledged."

    # Step 6: Submit the follow-up answer when requested
    clarify_resp = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "The project can actually slip by one week without impacting clients."},
        headers=headers,
    )
    assert clarify_resp.status_code == 200, clarify_resp.text
    clarified_state = clarify_resp.json()["state"]
    # User's answer added as reported fact
    assert any("Clarification provided" in f["text"] for f in clarified_state["reported_facts"])

    # Step 7: Generate and inspect balanced response options
    options_resp = await client.post(
        f"/api/v1/reflections/{session_id}/options",
        headers=headers,
    )
    assert options_resp.status_code == 200, options_resp.text
    options = options_resp.json()["state"]["possible_responses"]
    assert len(options) == 3, f"Expected exactly 3 regenerated options, got {len(options)}"
    for opt in options:
        assert len(opt["benefits"]) >= 1
        assert len(opt["risks"]) >= 1

    # Step 8: Complete without choosing an option
    complete_resp = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={"selected_option_id": None, "custom_response": None},
        headers=headers,
    )
    assert complete_resp.status_code == 200, complete_resp.text
    completed_data = complete_resp.json()

    # Step 9: Verify completion recap
    assert completed_data["status"] == "completed"
    assert completed_data["completed_at"] is not None
    assert completed_data["selected_response_id"] is None
    # Crucial Privacy Rule: Completing a reflection does NOT automatically save it
    assert completed_data["is_saved"] is False

    # Step 10: Confirm unsaved reflections do NOT appear in dashboard
    dashboard_before_save = await client.get("/api/v1/reflections", headers=headers)
    assert dashboard_before_save.status_code == 200
    assert len(dashboard_before_save.json()) == 0, "Unsaved reflection must not appear on dashboard"

    # Step 11: Explicitly save the reflection
    save_resp = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={"title": "Manager Overload Negotiation"},
        headers=headers,
    )
    assert save_resp.status_code == 200, save_resp.text
    assert save_resp.json()["is_saved"] is True
    assert save_resp.json()["title"] == "Manager Overload Negotiation"

    # Step 11b: Return to dashboard and reopen the saved reflection
    dashboard_after_save = await client.get("/api/v1/reflections", headers=headers)
    assert dashboard_after_save.status_code == 200
    saved_list = dashboard_after_save.json()
    assert len(saved_list) == 1
    assert saved_list[0]["id"] == session_id
    assert saved_list[0]["title"] == "Manager Overload Negotiation"

    # Reopen saved reflection
    reopen_resp = await client.get(f"/api/v1/reflections/{session_id}", headers=headers)
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["id"] == session_id
    assert reopen_resp.json()["state"]["encounter"] is not None

    # Privacy Check: Another user cannot access or delete this session
    other_email = f"other_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": other_email, "password": password})
    other_login = await client.post("/api/v1/auth/login", json={"email": other_email, "password": password})
    other_token = other_login.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    other_dashboard = await client.get("/api/v1/reflections", headers=other_headers)
    assert len(other_dashboard.json()) == 0, "User 2 must not see User 1's saved reflections"

    other_get = await client.get(f"/api/v1/reflections/{session_id}", headers=other_headers)
    assert other_get.status_code == 404, "User 2 cannot read User 1's reflection"

    # Step 12: Delete it after confirmation and verify it disappears
    delete_resp = await client.delete(f"/api/v1/reflections/{session_id}", headers=headers)
    assert delete_resp.status_code == 200, delete_resp.text

    dashboard_after_delete = await client.get("/api/v1/reflections", headers=headers)
    assert len(dashboard_after_delete.json()) == 0, "Deleted reflection must not appear on dashboard"

    reopen_deleted = await client.get(f"/api/v1/reflections/{session_id}", headers=headers)
    assert reopen_deleted.status_code == 404, "Deleted session must return 404"
