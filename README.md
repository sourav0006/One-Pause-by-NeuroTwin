# ONE PAUSE

> *"Before you respond, see."*

ONE PAUSE is an AI-assisted reflective application designed to help people examine a situation, notice what may be influencing their response, separate reported facts from tentative hypotheses and unknowns, and choose a deliberate next step.

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v7, Axios, React Flow (`@xyflow/react`), Vitest + React Testing Library.
- **Backend**: Python 3.12, FastAPI, Pydantic v2 & Pydantic Settings, SQLAlchemy 2.x (async), Alembic, PostgreSQL with JSONB, `pwdlib` with `bcrypt`, PyJWT, Pytest + HTTPX, Ruff.
- **AI Engine**: Google Gemini API via official `google-genai` SDK behind a provider-independent adapter interface (`AI_PROVIDER="gemini"`).

---

## Local Development Setup

### 1. Prerequisites
- Python 3.12 (`/opt/homebrew/bin/python3.12` on macOS)
- Node.js v20+ (`node` and `npm`)
- PostgreSQL 16+ running locally on port 5432

### 2. Database Creation
Ensure local PostgreSQL is running and create the databases:
```bash
psql -U $(whoami) -d postgres -c "CREATE DATABASE one_pause;"
psql -U $(whoami) -d postgres -c "CREATE DATABASE one_pause_test;"
```

### 3. Backend Setup
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head
```

### 4. Frontend Setup
```bash
cd frontend
npm install
```

---

## Running the Application Locally

### Start Backend Server
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Health: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- Swagger OpenAPI Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## Running Tests

### Backend Test Suite
```bash
cd backend
source .venv/bin/activate
pytest
```

### Backend Linting
```bash
cd backend
source .venv/bin/activate
ruff check .
```

### Frontend Test Suite
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

## AI Configuration (Google Gemini)

In `backend/.env`:
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```
When `GEMINI_API_KEY` is provided, the reflection engine performs live structured analysis according to PRD prompts. Unit tests mock the AI provider so valid credentials are not required to run standard test suites.
