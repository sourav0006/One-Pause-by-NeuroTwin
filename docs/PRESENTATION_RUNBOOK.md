# ONE PAUSE — Presentation Runbook

> **Product Tagline**: *"Before you respond, see."*  
> **Presentation Duration**: 5 Minutes  
> **Audience**: Academic evaluators, peers, and design reviewers  

---

## 1. Five-Minute Demonstration Plan

| Time | Phase | Focus & Key Takeaway |
| :--- | :--- | :--- |
| **0:00 – 0:45** | **The Problem & Philosophy** | Why we need a pause: emotional reactivity vs. reflective clarity. The tagline *"Before you respond, see."* |
| **0:45 – 1:30** | **Scenario Entry & Cognitive Pause** | Load realistic workload scenario. Explain user situation vs. context. Observe the reflective pause transition. |
| **1:30 – 2:45** | **Interactive Reflection Map** | Break down the situation: Reported Facts vs. Tentative Hypotheses vs. Unknowns vs. Goals. Inspect a hypothesis. |
| **2:45 – 3:45** | **Clarification & Balanced Responses** | Answer the single focused follow-up question. Compare 3 distinct, non-coercive response options. |
| **3:45 – 4:45** | **Completion vs. Explicit Saving** | Complete the pause. Show that **completion does not implicitly save**. Explicitly opt in to permanent history. |
| **4:45 – 5:00** | **Q&A & Architecture Wrap-Up** | Recap privacy guarantees, local execution, and system boundaries. |

---

## 2. Implemented Demo Scenario

The application includes a pre-configured, realistic workplace dilemma accessible via the **"Fill Demo Scenario: Workload & Priorities"** button on `/reflect`:

- **Reported Situation**:
  > *"My manager asked me to take on an urgent project with an immediate deadline, but my schedule is already committed to quarterly team deliverables. I want to say yes to maintain rapport, but I am worried about compromising delivery quality."*
- **Optional Context**:
  > *"Maintaining a reputation for reliable delivery without burnout is important to me."*
- **Why This Scenario Works for Live Demonstrations**:
  - It involves common interpersonal workplace tension (manager request vs. capacity limits).
  - It clearly separates **reported facts** (manager asked, immediate deadline, schedule committed) from **hypotheses** (fear of damaging rapport, assuming manager expects an unconditional yes) and **unknowns** (is the deadline truly rigid? can deliverables be reshuffled?).
  - It demonstrates balanced options without imposing a "correct" moral reaction (e.g. confrontation vs. passive compliance).

---

## 3. Startup and Preflight Checks

Run these checks 15 minutes before the presentation on macOS:

### Step 1: Verify PostgreSQL
```bash
pg_isready -h localhost -p 5432
```
*Expected*: `localhost:5432 - accepting connections`.

### Step 2: Verify Test Suites & Build
```bash
# Backend checks (27 tests)
cd backend
.venv/bin/pytest
.venv/bin/ruff check .

# Frontend checks (33 tests & production build)
cd ../frontend
npm run test
npm run build
```
*Expected*: All tests pass; Ruff reports `All checks passed!`; Vite production build finishes cleanly.

### Step 3: Choose Your AI Provider Mode

#### Option A: Offline Demo Fixtures (Recommended for 100% Presentation Reliability)
Set in `backend/.env`:
```env
ENABLE_DEV_DEMO_AI=true
GEMINI_API_KEY=""
```
- Completely deterministic, zero external API latency, works without Wi-Fi.
- All nodes are visibly tagged with `[DEV FIXTURE]`.
- Top banner displays: `DEV DEMO FIXTURES (Offline)`.

#### Option B: Live Google Gemini 2.5
Set in `backend/.env`:
```env
ENABLE_DEV_DEMO_AI=false
GEMINI_API_KEY="your-actual-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```
- Uses the live Google Gemini API via official SDK.
- Requires active Internet connection and valid quota.

### Step 4: Start Development Servers
Open two terminal windows:

**Terminal 1 (Backend)**:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Verify: Open [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) (returns `{"status":"ok",...}`).

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm run dev
```
Verify: Open [http://localhost:5173](http://localhost:5173).

---

## 4. Click-by-Click Demonstration Sequence

### Step 1: Log In (Dashboard)
1. Navigate to `http://localhost:5173`.
2. If already logged in, you will land on `/dashboard`. If not, register or log in with credentials (e.g., `presenter@onepause.local` / `PresenterPass123!`).
3. **What to say**:
   > *"ONE PAUSE is not an automated chatbot that drafts emails or tells you what to say. It is a reflective cognitive tool designed around a single principle: Before you respond, see."*
4. Click **"Begin New Reflection"** (`+`).

---

### Step 2: Situation Entry
1. On `/reflect`, point out the clean, distraction-free situation entry form.
2. Click the quick-fill button: **"Fill Demo Scenario: Workload & Priorities"**.
3. Point out that the scenario text and the optional personal context fields are filled automatically.
4. **What to say**:
   > *"Notice the distinction between the situation itself—what happened externally—and the context—what internal values or goals matter to the user. We treat all user inputs as raw, untrusted data, never as executable instructions."*
5. Click **"Pause & Reflect"**.

---

### Step 3: The Reflective Pause (Brain-to-Map Transition)
1. A gentle pulsing animation appears: *"Taking a pause to reflect..."*
2. **What to say**:
   > *"Even the transition reinforces the core design: we deliberately insert a sensory pause. We do not rush to generate answers; we slow down the user's autonomic impulse to react."*

---

### Step 4: Interactive Reflection Map Canvas
1. The canvas loads on `/reflections/:id`.
2. If in offline mode, highlight the visible amber banner:
   > *"Notice the clear label: DEV DEMO FIXTURES (Offline). In this mode, every node is marked [DEV FIXTURE] to ensure academic honesty—we never pretend offline mock data came from a live foundation model."*
3. Point out the color-coded semantic nodes on the canvas:
   - **Encounter (Amber)**: The situation being examined.
   - **Reported Facts (Blue)**: Concrete events reported by the user.
   - **Hypotheses (Violet)**: Tentative interpretations, explicitly badged with confidence levels (e.g., *Tentative*).
   - **Unknowns (Yellow)**: Critical missing information.
   - **Goals (Green)**: The user's underlying aims.
   - **Response Options (Teal/Slate)**: Balanced behavioral paths.
4. Demonstrate map navigation:
   - Drag to pan across the canvas.
   - Scroll to zoom.
   - Click the **"Fit Map"** button (top-right of canvas controls) to re-center the entire graph.

---

### Step 5: Inspecting and Editing a Hypothesis
1. Click on `hypothesis_1` (*"Possible interpretation: You may be feeling pressure to protect rapport at the cost of your current capacity"*).
2. The **Inspect & Edit Hypothesis** modal opens.
3. Show the interactive controls:
   - **Keep as Tentative** (default).
   - **Confirm Hypothesis** (user validates this interpretation).
   - **Dismiss Hypothesis** (removes or flags irrelevant assumptions).
   - **User Notes** textarea.
4. Type a short note: *"Accurate—I historically overpromise."* and click **"Save Changes"**.
5. **What to say**:
   > *"Hypotheses are never treated as facts about other people's minds. The user maintains cognitive agency to confirm, annotate, or dismiss any AI-generated hypothesis."*
6. Press `Escape` (or click Close) to dismiss the inspector.

---

### Step 6: Clarifying with One Focused Question
1. Scroll down to the **"Follow-Up Question"** panel.
2. Read the question: *"What is the single most important outcome you need from this interaction?"*
3. Read the purpose: *"Clarifying your primary priority helps distinguish between urgent reactions and strategic choices."*
4. Type in the answer box:
   > *"Delivering our core quarterly commitment cleanly without burning out the team."*
5. Click **"Submit Answer"**.
6. Observe the map updating: a new **Reported Fact** node appears with your clarification, and the hypothesis confidence shifts to *Moderate*.
7. **What to say**:
   > *"Rather than endless conversational back-and-forth, ONE PAUSE asks exactly one focused question to anchor the user's primary goal."*

---

### Step 7: Exploring Balanced Response Options
1. Scroll down to the **"Balanced Response Options"** panel.
2. Show that three distinct strategies are presented:
   - **Option 1**: Acknowledge receipt now, buy thinking time, evaluate tradeoffs.
   - **Option 2**: State current workload transparently, offer a prioritized counter-proposal.
   - **Option 3**: Accept with explicit scope limitations and agreed support.
3. Emphasize that each option details:
   - **Benefits** (Pros)
   - **Risks** (Cons)
   - **Appropriate When** (Contextual suitability)
4. Select **Option 2** (*"State your current workload transparently and offer a prioritized counter-proposal"*).
5. **What to say**:
   > *"The AI does not choose for you, nor does it preach conflict or submission. It balances three real-world strategies so the user can evaluate the risks and tradeoffs of each."*

---

### Step 8: Completing the Pause (Completion vs. Saving)
1. Click **"Complete Pause"** in the top navigation bar.
2. The **Completion Recap** modal appears:
   - Summarizes the situation, hypotheses considered, clarified answer, and chosen response.
   - **Crucial Feature**: A prominent notice states:
     > *"This reflection is completed, but is NOT yet saved to your permanent history."*
3. **What to say**:
   > *"This is a core privacy decision: Completing a reflection and saving a reflection are two completely distinct actions. If a user was venting or processing a private sensitive thought, they can finish the pause and close the window without anything persisting in their permanent dashboard history."*
4. Click **"Save to History"** (or point out **"Return to Dashboard (Discard Unsaved)"**).
5. The session updates to `is_saved = true` and navigates back to `/dashboard`.

---

### Step 9: Dashboard & Lifecycle
1. On `/dashboard`, show the newly completed reflection card:
   - Shows session title, completion timestamp, and a green badge: **"Completed & Saved"**.
2. Click the reflection card to reopen it: all nodes, user notes, and selected options are restored in full interactive fidelity.
3. Navigate back to dashboard using the keyboard shortcut `Alt + D` or the top back link.
4. Show the **Delete** button: clicking it opens an explicit confirmation dialog (*"Delete Reflection"*), ensuring reflections cannot be deleted accidentally.

---

## 5. What to Explain at Each Step (Pedagogical Rationale)

1. **Why not a chat bot?**
   Chatbots encourage rapid text exchanges, simulating interpersonal argument and worsening emotional flooding. A node-based map engages visual-spatial cognition, creating psychological distance.
2. **Why separate facts from hypotheses?**
   Cognitive-behavioral science demonstrates that conflict escalation happens when people treat their internal emotional hypotheses as indisputable external facts.
3. **Why avoid psychological diagnosis?**
   ONE PAUSE is strictly bound by prompt safety directives: it never attempts psychiatric diagnosis, never invents neurological claims, and never pretends to read the mind of an absent party.
4. **Why separate completion from saving?**
   Privacy by design: Users must feel safe exploring difficult interpersonal dilemmas without fearing an auto-saved permanent trail of unvetted thoughts.

---

## 6. Offline-Demo Fallback Protocol

If the venue Wi-Fi fails or Gemini API keys cannot be used:

1. Verify `ENABLE_DEV_DEMO_AI=true` in `backend/.env`.
2. Restart uvicorn if modified.
3. Transparently inform the audience:
   > *"For guaranteed stability during this presentation, we are running ONE PAUSE with our built-in offline demo fixture provider. As indicated by the amber banner, this uses deterministic structured fixtures that demonstrate the complete React Flow graph and state lifecycle without relying on venue Wi-Fi."*
4. All interactions (hypothesis editing, clarification, options selection, completion, saving, deleting) function 100% identically.

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Immediate Fix |
| :--- | :--- | :--- |
| **"Could not connect to server" on Login** | Backend uvicorn server is not running on `127.0.0.1:8000`. | In terminal: `source backend/.venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000` |
| **PostgreSQL Connection Error** | PostgreSQL service stopped or database `one_pause` does not exist. | Run `brew services start postgresql@16` (or `pg_ctl start`) and `psql -c "CREATE DATABASE one_pause;"` |
| **HTTP 503 "AI Provider Not Configured"** | `GEMINI_API_KEY` is missing while `ENABLE_DEV_DEMO_AI=false`. | Switch `ENABLE_DEV_DEMO_AI=true` in `backend/.env` for presentation demo mode, or add a valid key. |
| **HTTP 429 "AI service rate limit"** | Gemini API free quota exceeded. | Switch `ENABLE_DEV_DEMO_AI=true` in `backend/.env` immediately to fall back to local demo fixtures. |
| **HTTP 401 "Could not validate credentials"** | Token expired (tokens expire in 60 minutes). | Log out and log back in, or register a new test user (`presenter2@onepause.local`). |
| **Inspector modal won't close** | Focus stuck inside input. | Press `Escape` or click outside the modal overlay. |
| **Navigation hotkey not working** | Focus is currently inside an `<input>` or `<textarea>`. | `Alt + D` is intentionally disabled during text editing to prevent accidental navigation while typing. Click outside the input and press `Alt + D`. |

---

## 8. Final 10-Minute Pre-Presentation Checklist

- [ ] Local PostgreSQL is active (`pg_isready` returns 0).
- [ ] Backend running on `http://127.0.0.1:8000` (`/api/v1/health` responds 200).
- [ ] Frontend running on `http://localhost:5173`.
- [ ] Browser window is sized to 100% zoom (1920x1080 or standard presentation resolution).
- [ ] Logged into test account with a clean dashboard (delete old test sessions if needed).
- [ ] Verified whether running in **Live Gemini** or **Offline Demo Fixture** mode.
- [ ] Browser devtools console open in secondary window (or closed to avoid visual clutter).
- [ ] Audio/video projection tested; colors on projector clearly distinguish blue (facts), violet (hypotheses), and green (goals).
