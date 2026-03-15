# Debate Training Simulator

A full-stack debate practice app with AI opponents, deterministic rubric scoring, and structured drills.

## Current Implementation 

- Topic + opponent setup flow
- Timed multi-stage debate rounds
- AI opponent responses (streamed)
- Deterministic rubric scoring (0-100)
- Coach feedback generation
- Drill assignment based on weakest rubric category
- Safety checks for user speech

## Tech Stack

- Backend: Python + FastAPI + Gemini API
- Frontend: React + Vite
- Storage: SQLite (backend runtime data)
- Data files: JSON in `backend-python/data/`

## Project Structure

```text
debate-app/
├── backend-python/
│   ├── data/
│   │   ├── topics.json
│   │   ├── characters.json
│   │   └── drills.json
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md
```

## Setup

### 1. Backend

```bash
cd backend-python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
```

Create `backend-python/.env` (or `../.env`) and set:

```env
GEMINI_API_KEY=your_key_here
# optional
GEMINI_MODEL=gemini-2.5-flash-lite
```

Run backend:

```bash
python -m uvicorn main:app --reload --port 3001 --env-file .env
```

If your `.env` is in repo root instead, use:

```bash
python -m uvicorn main:app --reload --port 3001 --env-file ../.env
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Core API (Current)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/topics` | List debate topics |
| GET | `/api/characters` | List opponent personas |
| GET | `/api/drills` | List drills |
| POST | `/api/safety-check` | Safety validation for text |
| POST | `/api/opponent-speech` | Stream opponent response |
| POST | `/api/coach-report` | Return rubric + coach feedback |
| POST | `/api/drills/{id}/complete` | Save drill completion |
| GET | `/api/drills/{id}/completion/{sessionId}` | Get completion status |

## Rubric Categories (20 each)

1. Structure & Organization
2. Argument Quality
3. Clash & Responsiveness
4. Impact & Weighing
5. Precision & Commitment

## Upcoming Tasks

1. Voice to text / text to voice
2. More casual topics
3. User management
4. Mini games / warm up
5. Attitude modifier
6. Multi-player
7. Changing the UI
