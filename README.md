# AI Image Generation Service

A small "image generation as a service" app. An admin defines **tasks** (a master
prompt, how many images, whether users may add their own prompt); end users pick a
task, upload reference images, enter their API key, and get images back from Google
Gemini. n8n handles key checking, logging and storage.

## Architecture

```
User ─▶ Next.js server action (submitWorkflow)
          1. POST api key ─▶ n8n auth webhook (key lookup in Google Sheets)   10 s timeout
          2. build prompt = task.masterPrompt (+ user prompt if task allows)
          3. Gemini 2.5 Flash Image via n8n  |  Gemini 3 Pro Image direct      120 s timeout
          4. POST result ─▶ n8n log webhook (Sheets + Drive)
Admin ─▶ /admin (Prisma + SQLite): create / edit / enable / delete tasks
```

## Security

The admin area is protected by a **signed session cookie** (`app/lib/session.ts`):
`base64url(payload).HMAC-SHA256`, with an expiry inside the signed payload, verified
in `proxy.ts` **and** again inside every admin server action — server actions can be
called directly, so the proxy alone is not enough. Without `SESSION_SECRET` nobody can
log in (fail closed). Passwords are bcrypt hashes.

`npm test` covers: valid token, an unsigned/forged cookie, a payload re-signed with
another token's signature, expiry, a different secret, a missing secret, and garbage
input.

## Run

```bash
cp .env.example .env            # fill SESSION_SECRET and GOOGLE_API_KEY
npm ci
npx prisma migrate deploy
node prisma/seed.ts             # admin / 1234 — change it (Node 22.6+)
npm run dev
```

n8n workflow: `N8N/image-generation.json` — import it, then replace
`YOUR_GOOGLE_SHEET_ID`, `YOUR_DRIVE_FOLDER_ID`, `YOUR_GEMINI_API_KEY` and attach your own
credentials. Docker: `docker compose up -d --build` (includes a Cloudflare quick tunnel).

## Known limitations

- The seed admin password is a placeholder for local use.
- No rate limit on login or on generation per API key yet.

## Stack

Next.js 16 · React 19 · Prisma · SQLite · n8n · Google Gemini · Docker

## License

MIT
