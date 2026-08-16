# PDF Pro AI

A Telegram Mini App for PDF and document tools — merge, split, compress,
convert, sign, scan, OCR, and more — built with Node.js, Express, and a
glassmorphism front end that runs inside Telegram's WebApp platform.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in TELEGRAM_BOT_TOKEN at minimum
npm run dev             # nodemon, or `npm start` for plain node
```

The server serves both the API and the Mini App frontend on `PORT`
(default `3000`). Open `http://localhost:3000` in a browser to see the
UI in "guest mode" (no Telegram), or set up a bot with @BotFather and
point its Menu Button / a `/start` message at your deployed URL to test
inside real Telegram.

### Telegram setup

1. Create a bot with [@BotFather](https://t.me/BotFather), grab the token.
2. Put it in `.env` as `TELEGRAM_BOT_TOKEN`.
3. Set `TELEGRAM_MINI_APP_URL` to your public HTTPS URL (Mini Apps
   require HTTPS — use ngrok/Cloudflare Tunnel for local testing).
4. In BotFather, run `/setmenubutton` (or `/newapp`) and point it at
   that same URL.
5. In development the bot runs in **long-polling** mode automatically
   (see `config/telegram.js`). For production, switch to webhooks and
   call `bot.setWebHook(TELEGRAM_WEBHOOK_URL)` once during deploy.

## What's fully functional out of the box

These run on pure JS dependencies (`pdf-lib`, `pdfjs-dist`, `sharp`,
`qrcode`, `tesseract.js`) — no extra system packages needed:

- Merge PDF, Split PDF, Rotate PDF, Delete Pages
- Add Watermark, Add Signature
- Extract Text, Extract Images
- Image → PDF, Image Compressor, Scan Document (image → cleaned-up PDF)
- QR Generator, QR Scanner (camera, fully client-side)
- OCR (via Tesseract.js — bundles its own recognition engine)

## What needs an extra system binary

A few features shell out to well-established external tools rather
than reinventing them badly in pure JS. They're fully wired up — just
install the binary and they start working:

| Feature | Needs | Install |
|---|---|---|
| Compress PDF (real compression) | **Ghostscript** (`gs`) | `apt install ghostscript` — without it, falls back to a light pdf-lib-only optimization and tells the user so |
| PDF ⇄ Word / Excel / PowerPoint | **LibreOffice** (`soffice`) | `apt install libreoffice` — conversion quality depends on document complexity |
| Protect PDF / Unlock PDF | **qpdf** | `apt install qpdf` |

If a binary is missing, the corresponding route returns a clear error
message rather than crashing — check `logs/error.log`.

## What needs a third-party API key

- **Background Remover** — needs a `REMOVE_BG_API_KEY` in `.env`
  ([remove.bg](https://www.remove.bg/api)). Without a key it returns
  an explanatory error instead of pretending to work. Swap in any
  other background-removal API by editing `services/backgroundRemover.js`.

## Architecture

```
server.js          Express app entry point
config/             env-driven configuration (app, telegram, multer)
bot/                Telegram bot: commands, keyboards, message handlers
routes/             thin Express routers
controllers/        request/response glue — no business logic
services/           the actual PDF/image/document logic (one file per operation)
middleware/         upload handling, validation, rate limiting, errors
utils/              logger, response shape, helpers, file cleanup, tiny JSON datastore
public/             the Mini App itself (vanilla HTML/CSS/JS, no build step)
```

`utils/db.js` is a minimal JSON-file datastore for user accounts,
premium flags, and usage stats — enough to make the admin panel and
premium gating real without pulling in a database for a project this
size. Swap it for Postgres/Mongo/etc. by reimplementing its four
exported functions.

Uploaded and generated files live under `uploads/input` and
`uploads/output` and are auto-deleted after ~1 hour by
`utils/fileCleaner.js`.

## Frontend

Single-page app, no build tooling — `public/index.html` plus four CSS
files and five JS files, loaded directly as `<script>` tags:

- `js/telegram.js` — wraps the Telegram WebApp SDK (theme sync, Main/Back
  buttons, haptics, native share), no-ops gracefully outside Telegram
- `js/ui.js` — view routing, sidebar drawer, toasts, modal, i18n, dark mode
- `js/upload.js` — drag & drop + XHR upload with real progress events
- `js/pdf.js` — the tool catalog and the generic panel renderer that
  turns each tool's config into a working upload+options+result UI
- `js/app.js` — bootstraps everything, Telegram login handshake, admin
  panel, settings, FAQ

Design direction: "Scanlight" — frosted glass panels over an
indigo/cyan gradient field, with a signature animated light-sweep
(`.scan-beam` in `animation.css`) echoing light passing through a
scanner, tying the visual language back to what the app actually does.

## Data layer

Persistence is six flat JSON files under `/data`, each owned by its own
tiny module in `utils/stores/`, composed by `utils/db.js` into one `db.*`
API for the rest of the app:

| File | Holds |
|---|---|
| `users.json` | Telegram id, username, join date, status |
| `payments.json` | Payment id, amount, status, date (Telegram Stars charges) |
| `subscriptions.json` | Premium plan, start date, expiry date |
| `settings.json` | Maintenance mode, free daily limit, plan pricing — **live config**, editable at runtime via `/api/user/admin/settings`, seeded once from `.env` on first boot |
| `channels.json` | Back-compat storage for channel-gate settings (disabled in the current build) |
| `usage.json` | Per-user daily tool-usage counts — backs the free-tier cap and survives restarts |

Swap any of these for a real database later by re-implementing the same
functions inside that store's module — nothing else needs to change.

## Auth, channel-gate, and premium-gate middleware

Three middleware run in front of every tool route (`routes/pdf.js`,
`routes/image.js`):

1. **`middleware/auth.js`** (`identify`) — verifies who's calling from the
   JWT minted at `/api/user/login` (itself only issued after Telegram's
   HMAC-signed `initData` is verified). Sets `req.telegramId`. Never trusts
   the `X-Telegram-Id` header for authorization — that's spoofable from
   any browser console.
2. **`middleware/channelCheck.js`** — blocks the request until the user
   has joined every channel in `channels.json` (skipped when `forceJoin`
   is off, or for anonymous/guest callers).
3. **`middleware/premiumCheck.js`** — hard-blocks Premium-only tools
   (PDF↔Word/Excel/PPT, OCR, background remover) for non-subscribers.
   `middleware/rateLimiter.js`'s `dailyOperationLimiter` handles the
   softer case — capping free tools per day rather than blocking them.

## Security notes for production

- Set a real `JWT_SECRET`.
- `ADMIN_TELEGRAM_IDS` gates `/api/user/admin/*` — set your own numeric
  Telegram user ID(s) here.
- Telegram login is verified server-side via the documented HMAC
  scheme (`controllers/userController.js`) — never trust `initData`
  without that check.
- File uploads are limited by type (`config/multer.js`) and size
  (`MAX_FILE_SIZE_MB`). Tighten `helmet`'s CSP for your deployment.

## Channel gate

The current build opens the dashboard directly. Channel-gate checks are disabled, so there is no Join Channel screen and no verify button.

Owners/admins listed in `ADMIN_TELEGRAM_IDS` or `OWNER_TELEGRAM_ID` access the admin dashboard directly.

If you still see any old join-screen wording in a deployed build, redeploy the current code and clear the browser cache.
