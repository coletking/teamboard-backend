# Deployment Guide

Deploy TeamBoard to the cloud:

- **Database** → MongoDB Atlas (free tier)
- **Backend** → Render (free web service) — uses `render.yaml`
- **Frontend** → Vercel — uses `vercel.json` in the frontend repo

Do them in this order. You'll need (free) accounts for Atlas, Render and Vercel.

---

## 1. MongoDB Atlas (database)

1. Create an account at <https://www.mongodb.com/cloud/atlas> and create a free
   **M0** cluster.
2. **Database Access** → add a database user (username + password). Save them.
3. **Network Access** → Add IP Address → **Allow access from anywhere**
   (`0.0.0.0/0`) so Render can connect.
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/teamboard?retryWrites=true&w=majority
   ```
   Replace `<user>`/`<password>` and add `/teamboard` as the database name.
   Keep this — it's your `MONGO_URI`.

---

## 2. Backend on Render

1. Push the backend repo to GitHub (already done:
   `coletking/teamboard-backend`).
2. Go to <https://dashboard.render.com> → **New + → Blueprint** → connect the
   `teamboard-backend` repo. Render reads `render.yaml` and pre-fills the service.
3. When prompted for the two `sync:false` variables, set:
   - `MONGO_URI` = your Atlas connection string from step 1.
   - `CORS_ORIGIN` = `*` for now (tighten in step 4 once the frontend URL exists).
4. Click **Apply / Create**. Render runs `npm install && npm run build` then
   `node dist/main.js`. `JWT_SECRET` is auto-generated.
5. When live you'll get a URL like `https://teamboard-backend.onrender.com`.
   Verify: open `https://teamboard-backend.onrender.com/api/health` → `{ "status": "ok" }`.

> Free tier note: the service sleeps after inactivity; the first request after
> idle takes ~30–60s to wake.

---

## 3. Frontend on Vercel

1. Push the frontend repo to GitHub (already done:
   `coletking/teamboard-frontend`).
2. Go to <https://vercel.com> → **Add New → Project** → import
   `teamboard-frontend`. Vercel auto-detects Vite (`vercel.json` confirms it).
3. **Environment Variables** → add:
   - `VITE_API_URL` = `https://teamboard-backend.onrender.com/api`
     (your Render URL + `/api`).
4. **Deploy**. You'll get a URL like `https://teamboard-frontend.vercel.app`.

---

## 4. Wire CORS (final step)

1. Back in **Render → your service → Environment**, set:
   - `CORS_ORIGIN` = `https://teamboard-frontend.vercel.app` (your Vercel URL).
2. Save — Render redeploys. The frontend can now call the API from the browser.

> **Important:** auth uses an **httpOnly cookie** sent with credentials, so
> `CORS_ORIGIN` **must be the exact frontend origin** — `*` will not work (browsers
> reject credentialed requests to a wildcard origin). In production the cookie is
> issued as `Secure; SameSite=None`, which requires HTTPS on both ends (Render and
> Vercel both provide it).

---

## Quick checklist

| Step | Variable | Value |
| ---- | -------- | ----- |
| Atlas | — | create M0 cluster, DB user, allow `0.0.0.0/0` |
| Render | `MONGO_URI` | Atlas SRV string (with `/teamboard`) |
| Render | `CORS_ORIGIN` | Vercel URL (after step 3) |
| Vercel | `VITE_API_URL` | `https://<render-url>/api` |

Once all four are set, open the Vercel URL and sign up — you're live.
