# ONE PAUSE

> *"Before you respond, see."*

ONE PAUSE is an AI-assisted reflective application designed to help people pause before responding to challenging, emotionally charged, or high-stakes interpersonal situations. Rather than acting as a conversational chatbot or generating prescriptive automated replies, ONE PAUSE helps users visualize the structure of their dilemma—distinguishing reported facts from tentative hypotheses, identifying critical unknowns, anchoring core goals, and exploring balanced response options.

---

## The Problem & Intended Users

### The Problem
In high-pressure workplace, peer, or personal interactions, people frequently react based on immediate emotional impulses and unvetted assumptions. When we feel challenged, our minds often mistake internal hypotheses (*"they don't respect my time"*, *"they are trying to test me"*) for indisputable facts. Automated chatbots exacerbate this problem by encouraging rapid conversational back-and-forth or generating canned replies that the user sends without reflection.

### Intended Users
- **Professionals & Team Members**: Navigating competing priorities, urgent requests, difficult feedback, or cross-functional friction.
- **Leaders & Managers**: Seeking to respond thoughtfully rather than reactively during high-stakes decisions.
- **Students & Collaborators**: Managing group dynamics, feedback, and project workload expectations.

---

## The Reflection Workflow

The ONE PAUSE user journey is structured around intentional cognitive pacing:

1. **Describe the Situation & Context**: Enter the external event (*what happened*) and optional personal context (*what values or goals matter*). All inputs are treated as untrusted data, never as executable instructions.
2. **The Reflective Pause**: A deliberate sensory loading transition (*"Taking a pause to reflect..."*) interrupts autonomic reactivity.
3. **Explore the Interactive Cognitive Map**: Visualizes the dilemma as an interactive graph powered by React Flow:
   - **Encounter (Amber)**: The situation being examined.
   - **Reported Facts (Blue)**: Concrete facts reported by the user.
   - **Hypotheses (Violet)**: Tentative interpretations, badged with confidence levels (*Tentative*, *Moderate*, *Strong*).
   - **Unknowns (Yellow)**: Critical missing information that warrants investigation.
   - **Goals (Green)**: The user's underlying aims and values.
   - **Possible Responses (Teal/Slate)**: Balanced behavioral choices.
4. **Inspect & Edit Hypotheses**: Click any hypothesis node to inspect it, add personal notes, confirm it, or dismiss it. Hypotheses are never treated as facts about other people's minds.
5. **Answer One Focused Follow-Up Question**: Rather than endless conversational rounds, ONE PAUSE asks exactly one clarifying question designed to anchor the user's primary goal.
6. **Compare Balanced Response Options**: Evaluates three distinct behavioral strategies, each detailing benefits (pros), risks (cons), and situational appropriateness.
7. **Complete the Pause (Completion vs. Saving)**:
   - **Completing a pause** finalizes the session and presents a full recap modal.
   - **Saving is strictly explicit**: Completing a reflection does **NOT** automatically save it to permanent history. Users can discard unsaved sessions or explicitly click *"Save to History"*.

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v7, `@xyflow/react` (React Flow v12), Axios, Lucide React, Vitest + React Testing Library.
- **Backend**: Python 3.12, FastAPI, Pydantic v2 & Pydantic Settings, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, PostgreSQL with JSONB, `pwdlib[bcrypt]`, PyJWT, Pytest + HTTPX, Ruff.
- **AI Engine**: Google Gemini API via official `google-genai` SDK (`gemini-2.5-flash`) behind a provider-independent adapter interface (`BaseAIProvider`), with an isolated development-only deterministic fixture provider (`DevDemoAIProvider`).

For detailed architectural flowcharts, database schemas, and request lifecycles, see [`docs/ARCHITECTURE.md`](file:///Users/souravmahato/Downloads/OnePause/docs/ARCHITECTURE.md).

---

## Repository Structure

```
OnePause/
├── README.md                           # Project documentation & setup guide
├── docs/
│   ├── ARCHITECTURE.md                 # Technical design, schemas, API flow & security
│   └── PRESENTATION_RUNBOOK.md         # 5-minute presentation script & demo runbook
├── backend/
│   ├── .env.example                    # Backend environment configuration template
│   ├── pyproject.toml                  # Python dependencies & build configuration
│   ├── alembic.ini                     # Database migration configuration
│   ├── alembic/                        # SQLAlchemy database migrations
│   ├── app/
│   │   ├── main.py                     # FastAPI application entrypoint & middleware
│   │   ├── core/                       # Settings (config.py) and JWT/bcrypt security (security.py)
│   │   ├── models/                     # SQLAlchemy models (User, ReflectionSession)
│   │   ├── schemas/                    # Pydantic v2 validation models (Auth, Reflection)
│   │   ├── ai/                         # Gemini adapter, prompts, demo provider, base interface
│   │   ├── db/                         # Database engine and async session dependency
│   │   └── api/                        # API routes (/auth, /reflections, /health)
│   └── tests/                          # 27 backend test cases (auth, reflections, AI safety, e2e)
└── frontend/
    ├── package.json                    # Node dependencies and scripts
    ├── vite.config.ts                  # Vite build and proxy configuration
    ├── vitest.config.ts                # Vitest test runner configuration
    ├── index.html                      # Single page application HTML shell
    └── src/
        ├── main.tsx                    # React application entrypoint
        ├── App.tsx                     # Top-level routing & layout wrapper
        ├── api/                        # Axios HTTP client with Bearer auth interceptor
        ├── context/                    # AuthContext managing user sessions and JWT
        ├── types/                      # TypeScript domain definitions
        ├── pages/                      # Application pages (Welcome, Auth, Dashboard, Reflect, View)
        ├── components/                 # UI components (map, common, layout, reflection)
        └── tests/                      # 33 frontend Vitest test cases
```

---

## Local Development Setup (macOS)

### 1. Prerequisites
- **macOS** with Command Line Tools (`xcode-select --install`)
- **Python 3.12** (`brew install python@3.12`)
- **Node.js v20+** and `npm` (`brew install node`)
- **PostgreSQL 16+** (`brew install postgresql@16 && brew services start postgresql@16`)

### 2. Database Creation
Create the development and test databases using PostgreSQL:
```bash
psql -U $(whoami) -d postgres -c "CREATE DATABASE one_pause;"
psql -U $(whoami) -d postgres -c "CREATE DATABASE one_pause_test;"
```

### 3. Backend Setup
```bash
cd backend

# Create and activate Python 3.12 virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install backend dependencies in editable mode
pip install -e ".[dev]"

# Configure environment file
cp .env.example .env

# Run database migrations
alembic upgrade head
```

### 4. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install
```

---

## Running the Application Locally

Start the backend and frontend in separate terminal windows:

### Terminal 1: Backend API Server
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Health Endpoint: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- OpenAPI Interactive Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Terminal 2: Frontend Dev Server
```bash
cd frontend
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## Registration, Login & Presentation Demo Workflow

1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Click **"Get Started"** or **"Sign In"** to register or log in (e.g. `presenter@onepause.local` / `PresenterPass123!`).
3. On the Dashboard, click **"Begin New Reflection"** (`+`).
4. On the Situation Entry page, click the quick-fill button: **"Fill Demo Scenario: Workload & Priorities"** to populate a realistic workplace dilemma.
5. Click **"Pause & Reflect"** to transition to the interactive map.
6. For the complete step-by-step presentation script and speech prompts, follow [`docs/PRESENTATION_RUNBOOK.md`](file:///Users/souravmahato/Downloads/OnePause/docs/PRESENTATION_RUNBOOK.md).

---

## AI Configuration (Google Gemini vs. Offline Demo Mode)

In `backend/.env`:

### Option A: Live Google Gemini 2.5
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-actual-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
ENABLE_DEV_DEMO_AI=false
```
When configured with a valid API key, reflections are analyzed live using the official `google-genai` SDK.

### Option B: Deterministic Offline Demo Mode
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY=""
ENABLE_DEV_DEMO_AI=true
```
If running offline or without an active Gemini API key during local demonstrations:
- Setting `ENABLE_DEV_DEMO_AI=true` enables local deterministic fixture responses.
- **Academic Honesty & Safety**: All fixture nodes are visibly labeled with `[DEV FIXTURE]`, and a prominent amber banner displays: `DEV DEMO FIXTURES (Offline)`.
- **Production Guard**: Demo AI mode is strictly prohibited and deactivated if `ENVIRONMENT="production"`.

### Safe Missing-Key Behavior
If `GEMINI_API_KEY` is empty and `ENABLE_DEV_DEMO_AI=false`, the server returns a clear HTTP 503 error informing the user:
> *"Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env or enable demo fixtures with ENABLE_DEV_DEMO_AI=true for offline testing."*
The application never silently substitutes fixture output for a failed live provider request.

---

## Running Verification & Tests

### Backend Automated Test Suite (27 Tests)
```bash
cd backend
source .venv/bin/activate
pytest
```

### Backend Linting (Ruff)
```bash
cd backend
source .venv/bin/activate
ruff check .
```

### Frontend Automated Test Suite (33 Tests)
```bash
cd frontend
npm run test
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## Current Limitations & Features Outside MVP Scope

### Verified Capabilities
- Complete 16-step user journey verified through automated test suites (27 backend, 33 frontend).
- Strict authentication, JWT claims validation, ownership isolation, and session immutability enforced.
- Development-only offline fixture provider with clear visual indicators.
- Keyboard ergonomics (`Escape` modal dismissal, `Alt + D` dashboard navigation).

### Verified Baseline & Pending Verifications
- **Live Gemini API Execution**: The live Gemini provider integration is implemented according to Google's official `google-genai` SDK specifications, and passes mocked unit tests. Because no live API key was configured in the local development environment, live requests against external Google servers remain to be verified by a user with a valid key.
- **Headless Browser Automation**: Vitest and React Testing Library cover all DOM interactions, user events, and navigation flows. Full headless browser automation (Playwright) was not run due to container environment constraints and remains a manual verification step.

### Features Intentionally Outside MVP Scope
- Automatic long-term user memory, behavioral profiling, or "NeuroTwin" models.
- Clinical psychological diagnosis or physiological/neurological claims.
- Cloud PDF generation or public web sharing.
- External analytics, tracking cookies, or third-party telemetry.
