# Portfolio site + AI assistant — setup & deploy

This project is a static portfolio site plus a small serverless function that powers the "Ask about me" AI assistant at `/chat`.

```
index.html, styles.css, script.js     -> main portfolio page
chat.html, chat.css, chat.js           -> the /chat assistant page (email gate + chat UI)
functions/api/chat.js                  -> serverless function: OpenAI + Google Sheets logging
assets/                                -> images, logos, resume PDF, favicon, OG image
.env.example                           -> the environment variables you must set
```

The site works as plain files, but the chat assistant only works once it's deployed with the environment variables below. The OpenAI key never touches the browser — it lives only in the function.

---

## 1. What you need

- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account (Pages + Functions).
- An [OpenAI API key](https://platform.openai.com/api-keys).
- A Google account (for the Sheet + a service account to write to it).

---

## 2. Deploy the site to Cloudflare Pages

You can deploy by connecting a Git repo (recommended) or by direct upload.

**Option A — Git (recommended)**

1. Push this folder to a GitHub/GitLab repo.
2. In the Cloudflare dashboard: **Workers & Pages > Create > Pages > Connect to Git**, pick the repo.
3. Build settings: there is no build step. Leave **Build command** empty and set **Build output directory** to `/` (the repo root).
4. Deploy. Cloudflare automatically detects the `functions/` folder and serves `functions/api/chat.js` at `/api/chat`.

**Option B — Direct upload**

1. **Workers & Pages > Create > Pages > Upload assets**, and upload this folder.
2. Cloudflare still picks up the `functions/` folder for the API route.

After deploying, the assistant page is at `https://your-site.pages.dev/chat`.

---

## 3. Add the OpenAI key

In **your Pages project > Settings > Environment variables**, add:

- `OPENAI_API_KEY` = your OpenAI secret key
- `OPENAI_MODEL` = `gpt-4o-mini` (optional; this is the default)

Add them for **Production** (and **Preview** if you want previews to work). Redeploy after adding variables.

At this point the chat works end-to-end. Logging to Google Sheets is optional — if you skip section 4, the chat still answers; it just won't record conversations.

---

## 4. Set up Google Sheets logging

Every conversation is appended as a row: `[timestamp, email, question, answer]`.

1. **Create the Sheet.** Make a new Google Sheet. Note its ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`.
   Make sure the first tab is named `Sheet1` (or set `SHEET_TAB` to its name). Optionally add headers in row 1: `Timestamp | Email | Question | Answer`.

2. **Create a service account.**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
   - Enable the **Google Sheets API** (APIs & Services > Library > Google Sheets API > Enable).
   - APIs & Services > **Credentials > Create credentials > Service account**. Give it a name, create it.
   - Open the service account > **Keys > Add key > Create new key > JSON**. A JSON file downloads — keep it safe.

3. **Share the Sheet with the service account.** Open the JSON file, copy the `client_email` (looks like `name@project.iam.gserviceaccount.com`), then in the Google Sheet click **Share** and give that email **Editor** access.

4. **Add the env vars** in Cloudflare Pages (Settings > Environment variables):
   - `GOOGLE_CLIENT_EMAIL` = the `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` = the `private_key` from the JSON, pasted exactly, including the `\n` sequences, wrapped in quotes
   - `GOOGLE_PROJECT_ID` = the `project_id` from the JSON (not used by the write flow, but included for completeness)
   - `GOOGLE_SHEET_ID` = the Sheet ID from step 1
   - `SHEET_TAB` = the tab name (optional; defaults to `Sheet1`)

   Tip: the `private_key` value in the JSON already contains `\n` escapes. Paste it as-is. The function converts them to real newlines.

5. Redeploy. New conversations should now appear as rows in your Sheet.

If a Sheets write fails for any reason, the chat still replies — logging is best-effort and never blocks the conversation.

---

## 4b. Optional: email verification + per-user daily limit

By default the chat uses a simple email gate (enter email, start chatting). You can optionally require visitors to verify their email with a 6-digit code, and cap each verified email to 10 questions per day. These turn on automatically once both pieces below are configured; until then the chat keeps working with the simple gate.

**1. Create a Cloudflare KV namespace** (stores the codes, sessions, and daily counts). From your project folder:

```
npx wrangler kv namespace create CHAT_KV
```

It prints an `id`. Open `wrangler.toml`, uncomment the `[[kv_namespaces]]` block, and paste the id. (You can also create the namespace in the dashboard under **Storage & Databases > KV**.) The id is not a secret, so committing it is fine.

**2. Set up Brevo for sending the code emails** (free, no domain needed):

- Create a free account at brevo.com.
- Go to **Senders, Domains & Dedicated IPs > Senders** and add + verify a sender email (your Gmail works — you'll click a confirmation link).
- Go to **SMTP & API > API Keys** and create an API key.
- In Cloudflare, add these as **runtime** Variables and secrets (same place as `OPENAI_API_KEY`):
  - `BREVO_API_KEY` = the API key
  - `BREVO_SENDER_EMAIL` = the sender address you verified
  - `BREVO_SENDER_NAME` = optional display name (defaults to "Tareesh's Assistant")

**3. Redeploy.** Once `CHAT_KV` is bound and the Brevo secrets are set, the gate switches to: enter email → receive a 6-digit code → enter code → chat. The daily limit (10 questions per email) also activates. Sessions last 24 hours; codes expire in 10 minutes.

To change the daily limit, edit `DAILY_LIMIT` near the top of `chat-core.js`.

---

## 5. Test locally (optional)

To run the function locally you need the Cloudflare Wrangler CLI:

```
npm install -g wrangler
wrangler pages dev .
```

Put your secrets in a local file named `.dev.vars` (same keys as `.env.example`). This file is git-ignored. Opening `index.html` directly with `file://` shows the site, but the chat needs `wrangler pages dev` (or a real deploy) for the `/api/chat` route to exist.

---

## 6. Netlify alternative

If you prefer Netlify: move `functions/api/chat.js` to `netlify/functions/chat.js`, change the handler to Netlify's signature (`export async function handler(event)` reading `JSON.parse(event.body)` and returning `{ statusCode, body }`), and point `chat.js`'s `API_URL` to `/.netlify/functions/chat`. The OpenAI and Google logic is identical. Cloudflare Pages Functions are the simpler path and need no code changes.

---

## Environment variables summary

See `.env.example`. Required for chat: `OPENAI_API_KEY`. For logging: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PROJECT_ID`, `GOOGLE_SHEET_ID`. Optional: `OPENAI_MODEL`, `SHEET_TAB`. Never commit real values.
