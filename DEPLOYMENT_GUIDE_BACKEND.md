# Backend API Deployment Guide - PortfolioAI

## 🎯 Goal
Deploy the FastAPI backend so your mobile app can connect to it in production.

---

## 🚀 Recommended Platforms (Best → Good)

### Option 1: Railway.app (⭐ RECOMMENDED - Easiest)

**Why Railway?**
- ✅ Free tier: $5 credit/month (enough for testing)
- ✅ Automatic HTTPS
- ✅ Git-based deployment (push to deploy)
- ✅ PostgreSQL included (or use your Supabase)
- ✅ Environment variables easy to manage
- ✅ Zero configuration needed

**Cost**: Free tier → $5/month after credit runs out

### Option 2: Render.com (Great Free Tier)

**Why Render?**
- ✅ Generous free tier (always-on free tier ending, but still good for testing)
- ✅ Automatic HTTPS & CDN
- ✅ Easy PostgreSQL integration
- ✅ Auto-deploy from GitHub
- ✅ Health checks & auto-restart

**Cost**: Free tier → $7/month for paid

### Option 3: DigitalOcean App Platform

**Why DigitalOcean?**
- ✅ $5/month starter tier
- ✅ Professional-grade infrastructure
- ✅ Scalable as you grow
- ✅ Built-in monitoring
- ✅ PostgreSQL managed databases

**Cost**: $5/month (no free tier)

### Option 4: AWS / Google Cloud (Advanced)

**When to use?**
- Need enterprise features
- High traffic expected
- Already using AWS/GCP

**Cost**: ~$10-20/month (more complex)

---

## 📋 Step-by-Step: Deploy to Railway (RECOMMENDED)

### Prerequisites
1. GitHub account (to push your code)
2. Railway account (free - sign up with GitHub)

### Step 1: Prepare Your Backend for Deployment

First, let's check if you have the required files:

```bash
cd apps/api
```

**Create `railway.json`** (Railway configuration):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Create `Procfile`** (for Render/Heroku compatibility):
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Update `requirements.txt`** (ensure these are included):
```txt
fastapi
uvicorn[standard]
python-jose[cryptography]
passlib[bcrypt]
python-multipart
supabase
httpx
anthropic
pydantic
pydantic-settings
python-dotenv
```

### Step 2: Push Code to GitHub

```bash
# In your project root
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 3: Deploy to Railway

1. **Sign up**: Go to [Railway.app](https://railway.app) → Sign in with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select `PortfolioAPI` repository
   - Choose `apps/api` as root directory

3. **Configure Environment Variables**:
   Click on your service → Variables → Add these:

   ```env
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key

   # JWT Secret (generate a random string)
   SECRET_KEY=your-super-secret-jwt-key-min-32-chars

   # Anthropic API (for AI features)
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # App Settings
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://portfolioai.app,capacitor://localhost,http://localhost:8081
   ```

4. **Deploy**:
   - Railway automatically builds and deploys
   - Wait 2-3 minutes
   - You'll get a URL like: `https://portfolioai-production.up.railway.app`

5. **Add Custom Domain** (Optional):
   - Settings → Networking → Custom Domain
   - Add `api.yourdomain.com` (if using GoDaddy domain)
   - Update DNS in GoDaddy (Railway provides instructions)

### Step 4: Update Mobile App

Update `apps/mobile/lib/constants.ts`:

```typescript
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "https://your-railway-app.up.railway.app";  // Your Railway URL
```

Rebuild mobile app:
```bash
cd apps/mobile
eas build --platform ios --profile production
```

---

## 📋 Alternative: Deploy to Render.com

### Quick Steps:

1. **Sign up**: [Render.com](https://render.com) → Sign in with GitHub

2. **Create Web Service**:
   - New → Web Service
   - Connect GitHub repository
   - Settings:
     - **Root Directory**: `apps/api`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Environment**: Python 3.11

3. **Add Environment Variables**: Same as Railway above

4. **Deploy**: Render auto-deploys on git push

5. **URL**: You get `https://portfolioai-api.onrender.com`

---

## 🌐 Using GoDaddy (For Static Content)

Since you have GoDaddy, use it for:

### 1. Landing Page / Marketing Site
- Create `index.html` with app info
- Upload to GoDaddy cPanel → File Manager
- Access at `https://yourdomain.com`

### 2. Privacy Policy (Required for App Store)
- Create `privacy.html`
- Upload to GoDaddy
- Link in App Store Connect: `https://yourdomain.com/privacy.html`

### 3. Terms of Service
- Create `terms.html`
- Upload to GoDaddy
- Use in app footer

### 4. Custom API Domain (Advanced)
- Point `api.yourdomain.com` to Railway/Render
- In GoDaddy DNS:
  - Add CNAME record
  - Name: `api`
  - Value: Your Railway/Render URL
  - Then configure custom domain in Railway/Render

---

## 🔒 Security Checklist

Before going live:

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enabled (Railway/Render do this automatically)
- [ ] CORS configured with your app URL
- [ ] Supabase RLS policies enabled
- [ ] Rate limiting enabled (if needed)
- [ ] API key rotation plan
- [ ] Database backups enabled (Supabase does this)

---

## 📊 Database: Supabase (Already Set Up)

Your PostgreSQL is already on Supabase:
- ✅ Free tier: 500MB storage, unlimited API requests
- ✅ Automatic backups
- ✅ Already configured in your app
- ✅ No migration needed

Just ensure your production environment variables use Supabase production keys.

---

## 🧪 Testing Your Deployed API

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-railway-url.up.railway.app/

# API docs
open https://your-railway-url.up.railway.app/docs

# Test auth (should return 401)
curl https://your-railway-url.up.railway.app/portfolios
```

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | $5 credit/mo | $5/mo after credit | Quick start, testing |
| **Render** | Limited free | $7/mo | Production-ready |
| **DigitalOcean** | None | $5/mo | Scalability |
| **GoDaddy** | ❌ Not suitable for FastAPI | - | Static sites only |

**Recommendation**: Start with Railway (free $5/month credit), migrate to Render/DO if needed later.

---

## 🚀 Quick Start Commands

### Railway
```bash
# Install Railway CLI (optional, for local testing)
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
git push origin main  # Auto-deploys on Railway

# View logs
railway logs
```

### Environment Variable Template

Save this as `.env.production` (DON'T commit to git):

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# JWT
SECRET_KEY=generate-a-random-32-char-string-here

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# App
ENVIRONMENT=production
ALLOWED_ORIGINS=https://portfolioai.app,capacitor://localhost
```

---

## 📝 GoDaddy DNS Setup (If Using Custom Domain)

To point `api.yourdomain.com` to Railway:

1. **In Railway**:
   - Settings → Networking → Custom Domain
   - Enter: `api.yourdomain.com`
   - Copy the CNAME value Railway provides

2. **In GoDaddy**:
   - DNS Management
   - Add Record → CNAME
   - Name: `api`
   - Value: `your-app.up.railway.app` (from Railway)
   - TTL: 600 seconds
   - Save

3. **Wait**: DNS propagation takes 5-30 minutes

4. **Test**: `curl https://api.yourdomain.com`

---

## ✅ Deployment Checklist

### Backend (Railway/Render)
- [ ] Code pushed to GitHub
- [ ] Railway/Render project created
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Health check passes (`/` endpoint)
- [ ] API docs accessible (`/docs`)
- [ ] Custom domain configured (optional)

### Mobile App
- [ ] `API_URL` updated to production
- [ ] New build created (`eas build`)
- [ ] Submitted to TestFlight
- [ ] Client can connect to backend

### GoDaddy (Static Content)
- [ ] Landing page uploaded
- [ ] Privacy policy published
- [ ] DNS configured for custom domain (optional)

---

## 🎉 You're Live!

Once deployed:
1. Mobile app connects to `https://your-railway-url.up.railway.app`
2. Users can sign up, create portfolios, add holdings
3. AI analysis works with Anthropic API
4. Data stored securely in Supabase

---

## 📞 Support Resources

- **Railway**: [railway.app/docs](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **FastAPI**: [fastapi.tiangolo.com/deployment](https://fastapi.tiangolo.com/deployment/)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)

---

**Ready to deploy? Start with Railway! 🚀**

**Estimated Time**: 30 minutes for first deployment
