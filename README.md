README - Convert Python Bot to TypeScript and Host on Cloudflare Workers

## Overview
This guide shows how to take an existing Python Telegram bot and rewrite it in TypeScript, then host the bot as a Cloudflare Worker (server‑less edge runtime).

## 1. Keep the Python Bot as Reference
```
my-bot/
├── bot.py
├── handlers.py
├── database.py
└── requirements.txt
```
Identify all features:
- Commands (`/start`, `/help` etc.)
- Inline keyboards / callbacks
- Database access
- External API calls
- Scheduled jobs

## 2. Install Node.js (v18+)
```bash
node -v
npm -v
```
If you have both versions, you are ready.

## 3. Scaffold a Cloudflare Worker
```bash
npm create cloudflare@latest my-bot
# Choose:
#   • Worker
#   • TypeScript
#   • Yes – install dependencies
cd my-bot
```
Resulting structure:
```
my-bot/
├── src/
│   └── index.ts
├── package.json
└── wrangler.jsonc
```

## 4. Rewrite Bot Logic in TypeScript
### Example: `/start` command
**Python**
```python
async def start(update, context):
    await update.message.reply_text("Hello!")
```
**TypeScript (Cloudflare Worker)**
```typescript
export async function handleStart(chatId: number, env: Env) {
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: "👋 Hello from TypeScript!" })
  });
}
```
Create separate files under `src/handlers/` for commands, callbacks, utils, etc.

## 5. Secure the Worker (Webhook verification)
Add a secret token in Cloudflare and verify it on every request:
```typescript
const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
if (secret !== env.WEBHOOK_SECRET) return new Response("Forbidden", { status: 403 });
```
Never hard‑code `BOT_TOKEN` in source; store it as a Cloudflare secret.

## 6. Manage Secrets
Create a `.dev.vars` file for local dev (add to `.gitignore`):
```
BOT_TOKEN="123456:ABCdef..."
WEBHOOK_SECRET="random‑string"
```
Upload to Cloudflare production:
```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

## 7. Test Locally
```bash
npm run dev
```
Send a fake update with curl (replace the secret):
```bash
curl -X POST http://127.0.0.1:8787 \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: random‑string" \
  -d '{"update_id":1,"message":{"chat":{"id":12345},"text":"/start"}}'
```

## 8. Deploy to Cloudflare
```bash
npx wrangler login
npx wrangler deploy
```
Take note of the worker URL, e.g. `https://my-bot.<subdomain>.workers.dev`.

## 9. Set Telegram Webhook
```bash
curl https://api.telegram.org/bot$BOT_TOKEN/setWebhook \
  -F "url=https://my-bot.<subdomain>.workers.dev" \
  -F "secret_token=$WEBHOOK_SECRET"
```
Verify:
```bash
curl https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo
```

## 10. Database Migration (if needed)
| Python storage | Cloudflare alternative |
|--------------|------------------------|
| SQLite       | Cloudflare D1 (serverless SQLite) |
| dict / Redis | Workers KV |
| Files / Images| Cloudflare R2 |
| External DB (PostgreSQL, MongoDB) | Use an external managed DB (Neon, Supabase) and call via fetch |

## 11. CI/CD (GitHub Actions) – optional
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```
Add `CLOUDFLARE_API_TOKEN` as a repository secret.

---

### Quick Recap
1️⃣ Keep the Python code as reference
2️⃣ Scaffold a TS Cloudflare Worker
3️⃣ Rewrite commands, callbacks, DB logic
4️⃣ Store `BOT_TOKEN` & `WEBHOOK_SECRET` as Cloudflare secrets
5️⃣ Test locally (`npm run dev`)
6️⃣ Deploy (`npx wrangler deploy`)
7️⃣ Register the webhook with Telegram
8️⃣ Migrate any database to D1/KV/R2 or external service

You now have a fully functional Telegram bot running at the edge! Drag this `README.txt` file into any editor or share it – it is ready for download.
