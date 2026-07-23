# Credit Monitor

A dashboard that tracks remaining API credits across **LeadMagic**, **Icypeas**, **BounceBan**, **DiscoLike**, **AI Ark**, **ZeroBounce** and **MillionVerifier**. Built to deploy on **Netlify** (static page + one serverless function). API keys stay server-side in environment variables — they are never sent to the browser.

The balance-check endpoints used here are free and do **not** consume credits.

## How it works

- `public/index.html` — the dashboard. Animated count-up counters fire on first open ("live counter"), auto-refreshes every 60s, has a manual Refresh button, and keeps per-provider history in your browser's localStorage to draw sparklines + "since last check" deltas.
- `netlify/functions/credits.js` — calls all providers in parallel using env-var keys and returns combined JSON at `/api/credits`.

| Provider  | Endpoint used                                              | Auth                          |
|-----------|------------------------------------------------------------|-------------------------------|
| LeadMagic | `GET https://api.leadmagic.io/v1/credits`                  | `X-API-Key` header            |
| Icypeas   | `POST https://app.icypeas.com/api/a/actions/subscription-information` | `Authorization: <key>`, body `{email}` |
| BounceBan | `GET https://api.bounceban.com/v1/account`                 | `Authorization: <key>`        |
| DiscoLike | `GET https://api.discolike.com/v1/usage`                   | `x-discolike-key` header      |
| AI Ark    | `GET https://api.ai-ark.com/api/developer-portal/v1/payments/credits` | `X-TOKEN` header   |
| ZeroBounce | `GET https://api.zerobounce.net/v2/getcredits?api_key=<key>`         | API key in query string |
| MillionVerifier | `GET https://api.millionverifier.com/api/v3/credits?api=<key>`  | API key in query string |

> DiscoLike credits are denominated in spend (USD), so its card shows remaining **budget** (`$` available − used) and is excluded from the headline credits total.

## Local development

```bash
npm install -g netlify-cli   # if you don't have it
cp .env.example .env          # then fill in your keys
netlify dev                   # serves the site + functions at http://localhost:8888
```

## Deploy to Netlify

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Build settings are read automatically from `netlify.toml` (publish dir `public`, functions dir `netlify/functions`). No build command needed.
3. Set the environment variables under **Site settings → Environment variables**:
   - `LEADMAGIC_API_KEY`
   - `ICYPEAS_API_KEY`
   - `ICYPEAS_USER_EMAIL`
   - `BOUNCEBAN_API_KEY`
   - `DISCOLIKE_API_KEY`
   - `AIARK_API_KEY`
   - `ZEROBOUNCE_API_KEY`
   - `MILLIONVERIFIER_API_KEY`
4. Deploy. The dashboard is the site root; the function is at `/api/credits`.

Or from the CLI: `netlify deploy --prod` (set the same env vars with `netlify env:set NAME value`).

## Adding another provider

Add an entry to `PROVIDERS` and `META` in `netlify/functions/credits.js` returning `{ credits, detail }`. The frontend picks it up automatically.
