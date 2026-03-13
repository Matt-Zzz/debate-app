# Debate Training Simulator

A full-stack debate practice app with AI opponents, rubric scoring, and structured drills.

## Stack

- **Backend**: Node.js + Express, Anthropic SDK
- **Frontend**: React + Vite
- **Data**: JSON files in `backend/data/`

## Project Structure

```
debate-simulator/
├── backend/
│   ├── data/
│   │   ├── topics.json       # 20 curated debate topics
│   │   ├── characters.json   # 4 opponent characters
│   │   └── drills.json       # 10 structured practice drills
│   ├── server.js             # Express API server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Full React app
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json              # Root convenience scripts
```

## Setup

### 1. Install dependencies

```bash
# From root
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set your Anthropic API key

```bash
# Backend reads from environment
export ANTHROPIC_API_KEY=sk-ant-...
```

Or create `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

And add to `server.js` top:
```js
import "dotenv/config"; // add this line, install dotenv
```

### 3. Run

Terminal 1 — Backend:
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | All debate topics |
| GET | `/api/characters` | All opponent characters |
| GET | `/api/drills` | All practice drills |
| POST | `/api/opponent-speech` | Generate opponent response |
| POST | `/api/coach-report` | Generate rubric score + AI feedback |
| POST | `/api/safety-check` | Check content safety |
| POST | `/api/drills/:id/complete` | Save drill completion |
| GET | `/api/drills/:id/completion/:sessionId` | Get completion status |

## Adding Topics

Edit `backend/data/topics.json`. Each topic needs:
```json
{
  "id": "t21",
  "title": "...",
  "tag": "Ethics",
  "difficulty": "Medium",
  "description": "One sentence summary",
  "sideA": { "position": "...", "args": ["...", "..."] },
  "sideB": { "position": "...", "args": ["...", "..."] }
}
```

Restart the backend after editing. Target: 60 topics across all tags.

## Rubric Scoring (0–100)

Scores are computed deterministically from transcript text — no AI involvement in the number.

| Category | Weight | What It Measures |
|----------|--------|-----------------|
| Structure & Organization | 20 | Definitions, framework, flow |
| Argument Quality | 20 | Warrants, examples, logic bridges |
| Clash & Responsiveness | 20 | Engaging opponent arguments |
| Impact & Weighing | 20 | Stakes, comparisons, why it matters |
| Precision & Commitment | 20 | Clear claims, stable definitions |

## Safety Gates

- **Blocked patterns**: Content that targets protected groups with dehumanizing language is blocked at the API level.
- **Topic allowlist**: Only topics in `topics.json` can be debated. No free-form topic entry.
- **User speech check**: Every user submission is checked before processing.

## Drills

10 drills are stored in `backend/data/drills.json`. After each session, the app automatically assigns the drill that matches the student's weakest rubric category. All 10 drills are also browsable from the report screen.

Drill completions are stored in memory during server uptime. Add a database (SQLite, Postgres) to persist across restarts.
