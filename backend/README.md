# StoreSage Backend

API backend for **StoreSage — AI Business Consultant for E-commerce Stores**.

## Setup

```bash
cd storesage-backend
npm install
cp .env.example .env
npm start
```

Server runs at `http://localhost:4000`. The frontend (`storesage-frontend/index.html`)
already points at this URL — open the HTML file in a browser once the server is running
and the "Run audit" flow, live interview chatbot, and waitlist form will hit the real
API instead of the local demo fallback.

## Turning on real AI reasoning (Claude)

Open `.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-5
```

With a key set, `/api/report` sends the website analysis, competitors, and interview
answers to Claude and asks it to reason over them and write the report. Without a key,
the server automatically falls back to the rule-based logic in `routes/report.js` — the
product works either way, the Claude version is just smarter about open-ended answers.

Every generated report is tagged `"source": "claude"` or `"source": "rule-based"` so you
can see which one produced it (visible in the admin panel too).

**Keep your API key out of git.** `.env` is already in `.gitignore` — never commit it or
paste a real key anywhere public.

## Admin panel

Open `storesage-frontend/admin.html` in a browser (with the backend running) to log in and
see every audit that's been run and everyone on the waitlist.

Set real admin credentials in `.env` before deploying:

```
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=a-strong-password
```

The defaults in `.env.example` (`admin` / `changeme123`) are for local testing only —
change them before this goes anywhere public. Auth is currently a simple in-memory
token issued on login (lost on server restart) with plain-text password comparison —
fine for a small admin panel, but swap in hashed passwords (bcrypt) and JWTs with
expiry before using this in production.

## Endpoints

| Method | Path                     | Purpose                                          |
|--------|--------------------------|---------------------------------------------------|
| GET    | `/api/health`            | Health check, used by the frontend to detect the API |
| POST   | `/api/analyze`           | `{ url }` → website analysis + SEO/ranking signals + audit steps |
| POST   | `/api/competitors`       | `{ url }` → discovered competitor stores          |
| POST   | `/api/interview/start`   | Starts a discovery interview session              |
| POST   | `/api/interview/answer`  | `{ sessionId, answer }` → next question or final answers |
| POST   | `/api/report`            | `{ analysis, competitors, interviewAnswers }` → growth report (Claude or rule-based) |
| POST   | `/api/waitlist`          | `{ email }` → adds to the waitlist                |
| GET    | `/api/waitlist/count`    | Current waitlist size                             |
| POST   | `/api/admin/login`       | `{ username, password }` → `{ token }`            |
| POST   | `/api/admin/logout`      | Invalidates the current admin token               |
| GET    | `/api/admin/audits`      | (auth required) every audit ever run, newest first |
| GET    | `/api/admin/waitlist`    | (auth required) every waitlist signup, newest first |

## What's still mocked

- **`routes/analyze.js`** — website/SEO data is simulated. Replace with a real fetch +
  `cheerio` (or Playwright) for the storefront, and a real rank-tracking API (SerpAPI,
  Google Search Console) or a `lighthouse` run for the SEO numbers.
- **`routes/competitors.js`** — competitor list is simulated. Replace with a search/SERP
  API call scoped to the store's product category.

`routes/report.js` and the admin panel are fully real — no mocking there.

## Data persistence

Waitlist emails and every generated audit are stored in `data/waitlist.json` and
`data/audits.json` via `lib/storage.js`. For production, swap this for a real database
(Postgres, SQLite, etc.) — `lib/storage.js` is the only place that would need to change.
