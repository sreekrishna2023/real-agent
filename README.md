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
