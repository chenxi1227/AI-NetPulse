# Deploy AI NetPulse Dashboard (Online Demo)

Deploys the dashboard frontend + backend to free cloud services.
Does NOT include mitmproxy or local AI.

## Architecture

```
User → Vercel (frontend) → /api/* rewrite → Render (backend) → PostgreSQL
```

## Prerequisites

- GitHub account
- [Render](https://render.com) account (free)
- [Vercel](https://vercel.com) account (free)

---

## 1. Push to GitHub

```bash
cd /home/qq/Desktop/AI\ NetPulse
git add online_demo/
git commit -m "add online_demo deployment package"
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

---

## 2. Deploy Backend on Render

### 2a. Create PostgreSQL

1. In Render Dashboard → **New** → **PostgreSQL**
2. Select **Free** plan
3. Name: `ai-netpulse-db`
4. Once created, copy the **Internal Database URL** (starts with `postgresql://`)

### 2b. Create Web Service

1. **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name:** `ai-netpulse-backend`
   - **Root Directory:** `online_demo/backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Plan:** Free

4. Set **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your PostgreSQL Internal Database URL from step 2a |
| `JWT_SECRET` | A random secret string |
| `API_KEY` | A random API key |
| `CORS_ORIGINS` | `https://online-demo.vercel.app` (replace with your Vercel URL) |

5. **Create Web Service**

Wait for the deployment to finish. Note your Render URL: `https://ai-netpulse-backend.onrender.com`

---

## 3. Deploy Frontend on Vercel

### 3a. Update vercel.json

Edit `online_demo/frontend/vercel.json` — replace `https://your-app.onrender.com` with your actual Render URL:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://ai-netpulse-backend.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Commit and push.

### 3b. Import to Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. Settings:
   - **Root Directory:** `online_demo/frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Deploy**

Your URL: `https://online-demo.vercel.app`

---

## 4. Verify

1. Visit `https://online-demo.vercel.app`
2. Login with `admin` / `admin`

---

## Notes

- Render free plan spins down after 15 min of inactivity. First request after idle takes ~30s to wake up.
- Render free PostgreSQL: 1GB storage, auto-expires after 90 days.
- File uploads are stored as BYTEA in PostgreSQL (not filesystem).
