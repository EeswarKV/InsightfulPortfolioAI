# 🚀 START HERE - Deploy PortfolioAI in 3 Steps

## What You Need to Do (I can't do these for you 😊)

### 1️⃣ Sign Up for Accounts (10 minutes)

**Apple Developer** (Required - $99/year)
- Go to: https://developer.apple.com/programs/
- Sign up with your Apple ID
- Pay $99
- Wait 24-48 hours for approval ⏰

**Railway** (Required for backend - Free tier)
- Go to: https://railway.app
- Click "Sign Up" with GitHub (free)
- Done! ✅

**Expo** (Will create during setup - Free)
- Created automatically when you run the script below

---

### 2️⃣ Run the Automated Setup Script (5 minutes)

I've created a script that does EVERYTHING else automatically!

**Open PowerShell in the mobile app folder:**

```powershell
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# Run the setup script
.\setup-deployment.ps1
```

**The script will:**
- ✅ Install EAS CLI
- ✅ Login to Expo (creates account if needed)
- ✅ Initialize your project
- ✅ Configure app.json with your info
- ✅ Configure eas.json with your Apple ID
- ✅ Update constants.ts with backend URL
- ✅ Optionally start the iOS build

**Just answer the prompts - it's interactive!**

---

### 3️⃣ Deploy Backend to Railway (30 minutes)

**While waiting for Apple approval**, deploy your backend:

1. **Open Railway**: https://railway.app
2. **New Project** → "Deploy from GitHub repo"
3. **Select**: Your `PortfolioAPI` repository
4. **Root Directory**: `apps/api`
5. **Add Environment Variables**: Click "Variables" and add:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   SECRET_KEY=any-random-32-character-string-here
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://portfolioai.app,capacitor://localhost,http://localhost:8081
   ```
6. **Deploy** → Copy your Railway URL: `https://yourapp.up.railway.app`
7. **Test it**: Open `https://yourapp.up.railway.app/docs` in browser

**Done!** ✅

---

## 🎯 What Happens Next?

### Day 1-2: Waiting for Apple
- Apple approves your Developer account (24-48 hours)
- You receive approval email

### Day 3: Build iOS App
Once Apple approves, the script will:
1. Build your iOS app (15-20 minutes on Expo servers)
2. Ask for your Apple ID password & 2FA code
3. Create certificates automatically
4. Upload to App Store Connect

**Command** (the script will offer to do this):
```powershell
eas build --platform ios --profile production
```

### Day 4: Submit to TestFlight
```powershell
eas submit --platform ios --latest
```

### Day 5: Invite Your Client
1. Go to: https://appstoreconnect.apple.com
2. My Apps → PortfolioAI → TestFlight
3. Internal Testing → Add Tester
4. Enter client's email
5. Client gets email → Downloads TestFlight → Installs your app!

---

## 📝 Quick Checklist

**Before running the script:**
- [ ] Sign up for Apple Developer ($99)
- [ ] Sign up for Railway (free)
- [ ] Have your Supabase credentials ready
- [ ] Have your Anthropic API key ready

**Run the script:**
- [ ] Open PowerShell
- [ ] Navigate to `apps/mobile`
- [ ] Run `.\setup-deployment.ps1`
- [ ] Answer all prompts

**Deploy backend:**
- [ ] Railway project created
- [ ] Environment variables added
- [ ] Backend deployed and working
- [ ] URL copied and added to script

**Build iOS app** (after Apple approves):
- [ ] Run `eas build --platform ios --profile production`
- [ ] Wait 15-20 minutes
- [ ] Build succeeds

**Submit to TestFlight:**
- [ ] Run `eas submit --platform ios --latest`
- [ ] Wait 10-30 minutes for processing

**Invite client:**
- [ ] Add tester in App Store Connect
- [ ] Client receives invite
- [ ] Client installs TestFlight
- [ ] Client installs your app
- [ ] **🎉 SUCCESS!**

---

## 🆘 If Something Goes Wrong

### "Script won't run"
```powershell
# Enable script execution (run once)
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Try again
.\setup-deployment.ps1
```

### "EAS CLI install fails"
```powershell
# Install manually
npm install -g eas-cli

# Continue with script
.\setup-deployment.ps1
```

### "Build fails"
- Check the build logs: `eas build:list`
- Most common issue: Wrong Apple ID or expired credentials
- Solution: Run `eas credentials` to reset

### "I need help!"
- Check the detailed guides:
  - [DEPLOY_NOW.md](DEPLOY_NOW.md) - Quick reference
  - [DEPLOYMENT_GUIDE_IOS.md](DEPLOYMENT_GUIDE_IOS.md) - Complete iOS guide
  - [DEPLOYMENT_GUIDE_BACKEND.md](DEPLOYMENT_GUIDE_BACKEND.md) - Backend guide

---

## ⏱️ Time Estimate

| Task | Time |
|------|------|
| Sign up for accounts | 10 min |
| Run setup script | 5 min |
| Deploy backend to Railway | 30 min |
| **Wait for Apple approval** | **24-48 hours** |
| Build iOS app | 20 min (automated) |
| Submit to TestFlight | 10 min |
| Process in TestFlight | 30 min (automated) |
| Invite client | 5 min |
| **Total (excluding Apple wait)** | **~2 hours** |

---

## 💰 Total Cost

- **Apple Developer**: $99/year (one-time payment)
- **Railway**: $0 (free tier, then $5/month)
- **Expo EAS**: $0 (free tier, 30 builds/month)
- **Total First Month**: **$99**
- **Monthly After**: **$5/month** (Railway)

---

## 🎉 Ready?

1. **Right now**: Sign up for Apple Developer & Railway
2. **Tomorrow**: Run `.\setup-deployment.ps1`
3. **2 days later**: Apple approves → Build iOS app
4. **3 days later**: Client testing your app!

---

**Any questions? Check the detailed guides or just run the script - it will guide you!**

**Let's deploy! 🚀**
