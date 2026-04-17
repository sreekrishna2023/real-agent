# Real Estate AI Agent Website

Complete starter project for a real estate AI chatbot website with:
- Landing page (`index.html`)
- Register/Login flow
- Protected dashboard chat
- LLM provider switch (OpenAI, Gemini, Claude)
- Optional real estate listing/search connectors

## 1) Run locally

```bash
npm install
copy .env.example .env
```

Edit `.env` and add:
- `JWT_SECRET`
- One LLM API key (`OPENAI_API_KEY` or `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`)
- Optional: `RENTCAST_API_KEY`, `SERPAPI_API_KEY`

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 2) Project structure

- `server.js` - Backend API + auth + chat logic
- `public/index.html` - Landing page
- `public/login.html` - Login page
- `public/register.html` - Sign up page
- `public/dashboard.html` - AI chat workspace
- `public/*.js` - Frontend logic
- `public/styles.css` - Styling

## 3) Notes on Zillow and data sources

Zillow does not provide a broadly open/public API for unrestricted scraping/production use.
For legal and stable production integrations, use approved third-party APIs (examples wired here):
- RentCast API for listing/property data
- SerpApi for market/search signals

You can extend `server.js` with your licensed MLS/IDX feed providers.

## 4) Deploy

### GitHub
1. Create a new repo on GitHub.
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial real estate AI website"
   git branch -M main
   git remote add origin <your_repo_url>
   git push -u origin main
   ```

### Public landing page (GitHub Pages)

This repo includes a static marketing site under `docs/` (same look as the app landing).

1. On GitHub: open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose **Branch**: `main`, folder **`/docs`**, then **Save**.
4. After a minute, GitHub shows your site URL, usually:
   - `https://<your-username>.github.io/<repo-name>/`
5. Edit **`docs/config.js`** and set `window.REAL_AGENT_API` to your **deployed backend URL** (no trailing slash), for example `https://your-service.onrender.com`. Commit and push so **Login** and **Get Started** send visitors to the live app.

GitHub Pages only serves static files. **Login, register, dashboard, and `/api/*` run on your Node host**, not on `github.io`.

### Backend + full app (Render — recommended)

Use Render (or Railway/Fly) to run `server.js` so everyone can use login and chat.

1. Create a **Web Service** on [Render](https://render.com) and connect this GitHub repo.
2. **Build command:** `npm install`
3. **Start command:** `npm start`
4. **Environment** (minimum):
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = long random string
   - `LLM_PROVIDER` = `openai` | `gemini` | `anthropic`
   - One of: `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`
   - Optional listing/search: `RENTCAST_API_KEY`, `SERPAPI_API_KEY`
5. **CORS (optional):** If your marketing site is on GitHub Pages, set:
   - `CLIENT_ORIGIN` = `https://<username>.github.io`  
   You only need this if the browser on `github.io` will call your API directly (for example, future embedded forms). If users only open **Login** on the Render URL, you can leave it unset.

6. After deploy, copy the service URL (for example `https://real-agent-xxxx.onrender.com`) into **`docs/config.js`** as `REAL_AGENT_API`, commit, and push so the Pages landing links to production.

**Persistence:** The sample app stores users in `data/users.json`. On free tiers the filesystem is often **ephemeral** — users may reset when the service restarts. For production, move users to a managed database on your host.

### Hosting options
- Render
- Railway
- Fly.io
- VPS (Node runtime)

Set all environment variables from `.env` in your host dashboard.

## 5) Production hardening (recommended next)

- Move users from `data/users.json` to PostgreSQL
- Add email verification and password reset
- Add rate limiting and request logging
- Add multi-turn conversation storage
- Add admin analytics and usage metering
