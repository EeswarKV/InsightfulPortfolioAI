# 🚀 Deploy PortfolioAI to App Store - Action Plan

## Phase 1: TestFlight Beta (For Client Feedback) - THIS WEEK

### Day 1: Setup (30 minutes)
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo (create free account)
eas login

# 3. Initialize project
cd apps/mobile
eas init

# Copy the projectId and update app.json
```

### Day 2: Deploy Backend (1 hour)

**Option A: Railway (Recommended - Fastest)**
1. Sign up at [railway.app](https://railway.app) with GitHub
2. New Project → Deploy from GitHub → Select your repo
3. Choose `apps/api` directory
4. Add environment variables (Supabase keys, etc.)
5. Deploy → Get URL: `https://yourapp.up.railway.app`

**Option B: Render**
1. Sign up at [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. Settings: Root = `apps/api`, Start = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add env variables
5. Deploy → Get URL

**Update mobile app** (`apps/mobile/lib/constants.ts`):
```typescript
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "https://yourapp.up.railway.app";  // Your Railway/Render URL
```

### Day 3: Apple Developer Setup (1-2 days wait time)
1. Sign up for [Apple Developer Program](https://developer.apple.com/programs/) - $99/year
2. Wait for approval email (usually 24-48 hours)
3. Login to [App Store Connect](https://appstoreconnect.apple.com)

### Day 4: Build & Submit to TestFlight (1 hour)
```bash
cd apps/mobile

# Build for iOS (takes 15-20 minutes)
eas build --platform ios --profile production

# During build, EAS will ask for:
# - Your Apple ID
# - 2FA code
# - App Store Connect password
# → It saves these for future builds

# Submit to TestFlight
eas submit --platform ios --latest
```

### Day 5: Invite Your Client (5 minutes)
1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → PortfolioAI → TestFlight
3. Internal Testing → Add testers
4. Enter client's email (must be Apple ID)
5. Client receives email → Installs TestFlight app → Installs PortfolioAI

**✅ Client can now test your app!**

---

## Phase 2: Full App Store Release (After Feedback) - NEXT MONTH

### Prerequisites for App Store
- [ ] Privacy Policy URL (host on GitHub Pages - free)
- [ ] App description written
- [ ] 6 screenshots (iPhone 6.7" - use simulator)
- [ ] App icon (1024x1024px)
- [ ] Support URL (can be email: mailto:your@email.com)
- [ ] Keywords (for search)
- [ ] Age rating (4+ - no objectionable content)

### Steps to Submit for Review
1. In App Store Connect:
   - App Information → Fill all required fields
   - Pricing → Free or Paid
   - App Privacy → Answer privacy questions
   - Version Information → Upload screenshots, description

2. Submit for Review
   - Review time: 1-3 days
   - Apple will test your app
   - If approved → Goes live automatically

3. Go Live!
   - App appears in App Store
   - Anyone can download

---

## 🔥 Quick Reference: Essential Commands

### Build & Deploy
```bash
# Build iOS
cd apps/mobile
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest

# Check build status
eas build:list

# View build logs
eas build:view <build-id>
```

### Update App (After Changes)
```bash
# 1. Update version in app.json
"version": "1.0.1",
"ios": { "buildNumber": "2" }

# 2. Rebuild
eas build --platform ios --profile production

# 3. Submit
eas submit --platform ios --latest

# TestFlight testers get notified automatically!
```

---

## 📋 Environment Variables Checklist

Make sure these are set in your backend (Railway/Render):

```env
# Required for app to work
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...
SECRET_KEY=your-jwt-secret-32-chars-min
ANTHROPIC_API_KEY=sk-ant-xxx...

# App config
ENVIRONMENT=production
ALLOWED_ORIGINS=https://portfolioai.app,capacitor://localhost,http://localhost:8081
```

---

## 🎯 What Your Client Will See

1. **Receives Email**: "You've been invited to test PortfolioAI"
2. **Downloads TestFlight**: From App Store (free Apple app)
3. **Installs PortfolioAI**: Taps "Install" in TestFlight
4. **Opens App**: Full-featured production app
5. **Provides Feedback**: Can send feedback directly in TestFlight

---

## 💡 Pro Tips

### Faster Iterations
- TestFlight has no review for internal testers
- Push updates anytime, client gets notified
- Perfect for rapid feedback cycles

### Testing on Multiple Devices
- Add yourself as tester too
- Install on iPhone and iPad
- Test on different iOS versions

### Collecting Feedback
- TestFlight has built-in feedback feature
- Client can screenshot → Send feedback directly
- You receive it in App Store Connect

---

## ⚠️ Common Issues & Solutions

### "Invalid Bundle Identifier"
→ Change `bundleIdentifier` in `app.json` to something unique like `com.yourname.portfolioai`

### "Build Failed - Missing Dependencies"
→ Run `npm install` in `apps/mobile` before building

### "API Not Responding"
→ Check backend is deployed and `API_URL` in constants.ts is correct
→ Test: `curl https://your-backend-url.up.railway.app/`

### "Client Can't Download"
→ Make sure client's email matches their Apple ID
→ Client must have TestFlight app installed first

---

## 📅 Realistic Timeline

| Milestone | Time | Status |
|-----------|------|--------|
| Setup EAS & Expo account | 30 min | ⏳ |
| Deploy backend to Railway | 1 hour | ⏳ |
| Apple Developer approval | 1-2 days | ⏳ |
| First iOS build | 20 min | ⏳ |
| TestFlight processing | 30 min | ⏳ |
| Invite client & install | 10 min | ⏳ |
| **Client testing v1.0** | **2-3 days** | **🎯** |
| Collect feedback | 1-2 weeks | ⏳ |
| Implement v2.0 features | TBD | ⏳ |
| Submit to App Store | 1 hour | ⏳ |
| Apple Review | 1-3 days | ⏳ |
| **Live on App Store** | **~3 weeks** | **🎉** |

---

## 🎉 Success Metrics

You'll know it's working when:
- ✅ Build completes without errors
- ✅ App appears in App Store Connect
- ✅ TestFlight shows "Ready to Test"
- ✅ Client receives invite email
- ✅ Client can open and use the app
- ✅ App connects to backend successfully
- ✅ Client can create portfolio, add holdings

---

## 🆘 Need Help?

- **EAS Build Issues**: https://docs.expo.dev/build-reference/troubleshooting/
- **App Store Connect**: https://developer.apple.com/support/
- **Railway/Render**: Check their docs or status pages
- **Expo Forums**: https://forums.expo.dev/

---

## ✨ Next Steps - RIGHT NOW

1. **Open Terminal**:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **While that's running**:
   - Sign up for Apple Developer ($99)
   - Sign up for Railway.app (free)

3. **Tomorrow**:
   - Deploy backend to Railway
   - Run `eas build` once Apple approves

4. **This Week**:
   - Client testing on TestFlight
   - Collecting feedback

---

**You're 3 days away from having your client test the app! Let's go! 🚀**
