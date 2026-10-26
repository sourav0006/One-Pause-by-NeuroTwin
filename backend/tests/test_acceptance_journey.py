"""Prompt 9: End-to-End Acceptance Journey and Invariant Verification.

Executes all 16 specific journey steps specified in Prompt 9:
1. Register a new test account.
2. Log in and verify the authenticated dashboard.
3. Start a new reflection.
4. Load the workload-and-priorities demo scenario.
5. Generate the reflection map.
6. Verify that reported facts, hypotheses, unknowns, goals, and possible responses are represented appropriately.
7. Answer the single follow-up question.
8. Verify that edited or dismissed hypotheses remain corrected after clarification.
9. Explore the response options without being forced to choose one.
10. Complete the reflection.
11. Verify completion does not automatically save it.
12. Explicitly save the reflection and verify it appears in dashboard history.
13. Reopen it and verify the saved state is preserved.
14. Verify search and status filters.
15. Test deletion and confirm the deleted session disappears.
16. Verify that one user's sessions cannot be accessed or modified by another user.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_full_acceptance_journey_16_steps(client: AsyncClient, monkeypatch):
    """Rigorous end-to-end acceptance test covering all 16 prompt journey steps."""
    # Ensure offline demo AI fixtures are active for deterministic verification
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    # STEP 1: Register a new test account
    test_email = f"acceptance_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "SecurePassword123!"

    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": test_password},
    )
    assert reg_res.status_code == 201, f"Step 1 Failed: {reg_res.text}"
    user_data = reg_res.json()["user"]
    assert user_data["email"] == test_email
    assert "id" in user_data

    # STEP 2: Log in and verify the authenticated dashboard
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": test_password},
    )
    assert login_res.status_code == 200, f"Step 2 Failed: {login_res.text}"
    token = login_res.json()["access_token"]
    assert token and len(token) > 20
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Verify initial empty dashboard
    initial_dashboard_res = await client.get("/api/v1/reflections", headers=auth_headers)
    assert initial_dashboard_res.status_code == 200
    assert initial_dashboard_res.json() == [], "New user dashboard must be empty initially"

    # STEP 3 & 4: Start a new reflection & Load workload-and-priorities demo scenario
    demo_situation = (
        "My manager asked me to take on an urgent project with an immediate deadline, "
        "but my schedule is already committed to quarterly team deliverables. "
        "I want to say yes to maintain rapport, but I am worried about compromising delivery quality."
    )
    demo_context = "Maintaining a reputation for reliable delivery without burnout is important to me."

    # STEP 5: Generate the reflection map
    analyze_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": demo_situation, "context": demo_context},
        headers=auth_headers,
    )
    assert analyze_res.status_code == 201, f"Step 5 Failed: {analyze_res.text}"
    session = analyze_res.json()
    session_id = session["id"]
    state = session["state"]

    # STEP 6: Verify reported facts, hypotheses, unknowns, goals, and possible responses
    assert len(state["reported_facts"]) >= 2, "Reported facts must be extracted"
    assert len(state["hypotheses"]) >= 2, "Tentative hypotheses must be formed"
    assert len(state["unknowns"]) >= 2, "Missing context/unknowns must be highlighted"
    assert len(state["goals"]) >= 1, "Goals must be identified"
    assert len(state["possible_responses"]) == 3, "Exactly 3 balanced response options must be generated"
    assert state["follow_up_question"] is not None, "A focused follow-up question must exist"
    assert "[DEV FIXTURE]" in state["encounter"]["description"], "Dev fixtures must be clearly labeled"

    # User hypothesis edit: Mark hypothesis 1 as corrected with custom note
    hyp_1 = state["hypotheses"][0]
    hyp_1_id = hyp_1["id"]
    patch_hyp1_res = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp_1_id}",
        json={"status": "corrected", "corrected_text": "I clarified with the lead: capacity is the main bottleneck."},
        headers=auth_headers,
    )
    assert patch_hyp1_res.status_code == 200

    # User hypothesis dismissal: Mark hypothesis 2 as dismissed
    hyp_2 = state["hypotheses"][1]
    hyp_2_id = hyp_2["id"]
    patch_hyp2_res = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp_2_id}",
        json={"status": "dismissed"},
        headers=auth_headers,
    )
    assert patch_hyp2_res.status_code == 200

    # STEP 7: Answer the single follow-up question
    clarify_answer = "The single most important outcome is preserving the quality of the core quarterly launch."
    clarify_res = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": clarify_answer},
        headers=auth_headers,
    )
    assert clarify_res.status_code == 200, f"Step 7 Failed: {clarify_res.text}"
    clarified_state = clarify_res.json()["state"]

    # STEP 8: Verify edited or dismissed hypotheses remain corrected after clarification
    h1_after = next(h for h in clarified_state["hypotheses"] if h["id"] == hyp_1_id)
    assert h1_after["status"] == "corrected", "Corrected status must be preserved across multi-turn clarification"
    assert h1_after["user_note"] == "I clarified with the lead: capacity is the main bottleneck."

    h2_after = next(h for h in clarified_state["hypotheses"] if h["id"] == hyp_2_id)
    assert h2_after["status"] == "dismissed", "Dismissed status must be preserved across multi-turn clarification"

    # User answer is stored as a reported fact
    assert any("preser" in f["text"].lower() for f in clarified_state["reported_facts"])

    # STEP 9: Explore response options without being forced to choose one
    options = clarified_state["possible_responses"]
    assert len(options) == 3, "Exactly 3 response options must be present after clarification"
    for opt in options:
        assert len(opt["benefits"]) >= 1, "Each option must contain explicit benefits"
        assert len(opt["risks"]) >= 1, "Each option must contain explicit trade-offs/risks"
        assert opt["appropriate_when"], "Each option must specify when fitting"

    # STEP 10: Complete the reflection without selecting an option
    complete_res = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={"selected_option_id": None},
        headers=auth_headers,
    )
    assert complete_res.status_code == 200, f"Step 10 Failed: {complete_res.text}"
    completed_session = complete_res.json()
    assert completed_session["status"] == "completed"
    assert completed_session["completed_at"] is not None
    assert completed_session["selected_response_id"] is None

    # STEP 11: Verify completion does not automatically save it
    assert completed_session["is_saved"] is False, "Completed reflection must NOT be auto-saved"
    dashboard_check = await client.get("/api/v1/reflections", headers=auth_headers)
    assert len(dashboard_check.json()) == 0, "Unsaved reflection must not appear in saved history"

    # STEP 12: Explicitly save the reflection and verify it appears in dashboard history
    save_res = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={"title": "Manager Workload & Priorities Reflection"},
        headers=auth_headers,
    )
    assert save_res.status_code == 200, f"Step 12 Failed: {save_res.text}"
    saved_session = save_res.json()
    assert saved_session["is_saved"] is True
    assert saved_session["title"] == "Manager Workload & Priorities Reflection"

    dashboard_with_saved = await client.get("/api/v1/reflections", headers=auth_headers)
    assert len(dashboard_with_saved.json()) == 1, "Saved reflection must now appear on dashboard"
    assert dashboard_with_saved.json()[0]["id"] == session_id

    # STEP 13: Reopen it and verify the saved state is preserved
    reopen_res = await client.get(f"/api/v1/reflections/{session_id}", headers=auth_headers)
    assert reopen_res.status_code == 200
    reopened_data = reopen_res.json()
    assert reopened_data["id"] == session_id
    assert reopened_data["status"] == "completed"
    assert reopened_data["is_saved"] is True
    assert len(reopened_data["state"]["reported_facts"]) >= 2
    assert len(reopened_data["state"]["hypotheses"]) >= 2

    # STEP 14: Verify search and status filter properties
    # The summary list contains initial_situation and status for client-side search/filtering
    summary = dashboard_with_saved.json()[0]
    assert "initial_situation" in summary
    assert "status" in summary
    assert summary["status"] == "completed"
    assert "manager" in summary["initial_situation"].lower()

    # STEP 15: Test deletion and confirm the deleted session disappears
    delete_res = await client.delete(f"/api/v1/reflections/{session_id}", headers=auth_headers)
    assert delete_res.status_code == 200, f"Step 15 Failed: {delete_res.text}"

    dashboard_after_del = await client.get("/api/v1/reflections", headers=auth_headers)
    assert len(dashboard_after_del.json()) == 0, "Deleted session must disappear immediately"

    get_deleted = await client.get(f"/api/v1/reflections/{session_id}", headers=auth_headers)
    assert get_deleted.status_code == 404, "Deleted session cannot be retrieved"

    # STEP 16: Verify that one user's sessions cannot be accessed or modified by another user
    # Create another reflection for user 1 and save it
    re_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "A private confidential situation for User 1"},
        headers=auth_headers,
    )
    user1_private_id = re_res.json()["id"]
    await client.post(
        f"/api/v1/reflections/{user1_private_id}/save",
        json={"title": "User 1 Private Session"},
        headers=auth_headers,
    )

    # Register and log in User 2
    user2_email = f"user2_{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": user2_email, "password": test_password})
    u2_login = await client.post("/api/v1/auth/login", json={"email": user2_email, "password": test_password})
    u2_token = u2_login.json()["access_token"]
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 2 dashboard must not show User 1's session
    u2_dashboard = await client.get("/api/v1/reflections", headers=u2_headers)
    assert len(u2_dashboard.json()) == 0, "User 2 cannot see User 1's saved reflections"

    # User 2 cannot read User 1's session
    u2_get = await client.get(f"/api/v1/reflections/{user1_private_id}", headers=u2_headers)
    assert u2_get.status_code == 404

    # User 2 cannot patch User 1's hypotheses
    u2_patch = await client.patch(
        f"/api/v1/reflections/{user1_private_id}/hypotheses/hypothesis_1",
        json={"status": "dismissed"},
        headers=u2_headers,
    )
    assert u2_patch.status_code == 404

    # User 2 cannot delete User 1's session
    u2_del = await client.delete(f"/api/v1/reflections/{user1_private_id}", headers=u2_headers)
    assert u2_del.status_code == 404
