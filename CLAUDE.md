# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PartsHelper: upload a car photo plus make/model/year, get back an AI-generated parts condition report. Two independent npm packages, no root package.json:

- `server/` — Express 5 API (ESM, single file: `parts-helper.mjs`) with one endpoint, `POST /analyze`. Takes a multipart image upload, sends it to Gemini (`gemini-2.5-flash`) with a JSON-only system instruction, and returns the parsed JSON array of parts.
- `client/` — React 18 + Vite SPA (single component: `src/App.jsx`) that posts the form and renders the result table.

There are no tests and no linter configured.

## Commands

Server (requires `GEMINI_API_KEY`, loaded from `server/.env` via dotenv):

```bash
cd server && npm install
node parts-helper.mjs        # listens on :3000 (PORT to override); no npm start script
```

Client:

```bash
cd client && npm install
npm run dev                  # Vite dev server on :5173
npm run build                # outputs client/dist
```

Docker:

```bash
docker build -t parts-helper-server server/
docker build -t parts-helper-client client/   # optional --build-arg VITE_API_URL=...
```

## How client reaches server

The client calls `${VITE_API_URL}/analyze`, and `VITE_API_URL` is deliberately empty in both dev and the default Docker build, so requests are relative and a proxy forwards them:

- Dev: `client/vite.config.js` proxies `/analyze` to `http://localhost:3000`.
- Docker: nginx proxies `/analyze` to the server container; the upstream comes from the `API_URL` env var substituted into `client/nginx.conf.template` at container start (e.g. `API_URL=http://server:3000`). Set `VITE_API_URL` as a build arg only if the API is served from a different origin, and then set `CLIENT_ORIGIN` on the server so CORS allows it.

If you add a second API route, it must be added to both proxies (vite.config.js and nginx.conf.template).

## Constraints that live in multiple places

- Upload size limit is 10MB in two spots that must stay in sync: multer's `fileSize` limit in `parts-helper.mjs` and `client_max_body_size` in `nginx.conf.template`.
- The Gemini system instruction in `parts-helper.mjs` defines the response contract (`part`, `location`, `condition`, `urgency`, `estimated_price_range`); the client table in `App.jsx` renders exactly those keys. Model-level errors (`{"error": ...}`) currently come back as HTTP 200 and hit the client's non-array fallback branch.
