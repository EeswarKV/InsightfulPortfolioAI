# iOS TestFlight Deployment Guide - PortfolioAI v1.0

## 🎯 Goal
Deploy PortfolioAI mobile app to Apple TestFlight for client feedback before full App Store release.

---

## ✅ Prerequisites

### 1. Apple Developer Account
- **Cost**: $99/year
- **Sign up**: https://developer.apple.com/programs/
- **Required**: Apple ID (your email)
- **Timeline**: Account approval takes 24-48 hours

### 2. Expo Account (Free)
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create account if needed)
eas login
```

### 3. Required Information
- App name: **PortfolioAI**
- Bundle ID: `com.portfolioai.app` (already configured)
- Version: 1.0.0
- Privacy Policy URL (required by Apple)

---

## 📋 Step-by-Step Deployment

### Step 1: Initialize EAS Project

```bash
cd apps/mobile

# Initialize EAS (this creates project on Expo servers)
eas init

# This will:
# - Create project on Expo
# - Add projectId to app.json
# - Link your local project to Expo account
```

**Output**: Copy the `projectId` and update `app.json` → `extra.eas.projectId`

### Step 2: Configure iOS Build

The `eas.json` and `app.json` are already configured. Update these values:

**In `app.json`**:
```json
"owner": "your-expo-username"  // Your Expo account username
```

**In `eas.json`**:
```json
"appleId": "your-apple-id@email.com",  // Apple Developer account email
```

### Step 3: Build for TestFlight (Production Build)

```bash
# Build iOS app (this happens on Expo's servers)
eas build --platform ios --profile production

# This will:
# 1. Ask for Apple ID credentials
# 2. Create iOS certificate & provisioning profile automatically
# 3. Build the .ipa file (takes ~15-20 minutes)
# 4. Upload to Expo servers
```

**Important**: During first build, EAS will:
- Ask for your Apple ID password
- Ask for 2FA code
- Create iOS distribution certificate
- Create provisioning profile
- All stored securely on Expo servers (reused for future builds)

### Step 4: Submit to App Store Connect

Once build completes:

```bash
# Submit directly to TestFlight
eas submit --platform ios --latest

# OR manually download .ipa and upload via Transporter app
```

**This will**:
- Upload .ipa to App Store Connect
- Automatically process for TestFlight
- Take 10-30 minutes to process

---

## 📱 Setting Up TestFlight

### Option A: Internal Testing (No Review - Fastest)

**Use this for quick client feedback!**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: **My Apps** → **PortfolioAI** → **TestFlight** → **Internal Testing**
3. Click **+** to add testers
4. Enter client's email (they need an Apple ID)
5. Client receives invite email instantly
6. They download TestFlight app from App Store
7. Open invite → Install PortfolioAI

**Limits**:
- Up to 100 internal testers
- No Apple review required
- Instant access after build processes

### Option B: External Testing (For Beta Review)

**Use this if you want broader testing later**

1. Go to **External Testing** tab
2. Create a test group
3. Add testers (up to 10,000)
4. Submit for Beta Review (1-2 days)
5. Once approved, testers can install

---

## 🚀 Quick Command Reference

### First-Time Setup
```bash
# In apps/mobile directory
npm install -g eas-cli
eas login
eas init
```

### Building
```bash
# Production build for TestFlight
eas build --platform ios --profile production

# Check build status
eas build:list

# View build details
eas build:view <build-id>
```

### Submitting
```bash
# Auto-submit latest build
eas submit --platform ios --latest

# Submit specific build
eas submit --platform ios --id <build-id>
```

### Managing
```bash
# View all builds
eas build:list

# View project info
eas project:info

# Configure credentials
eas credentials
```

---

## 📝 Required App Store Information

Before submitting, prepare these (you'll need them for App Store Connect):

### App Information
- **App Name**: PortfolioAI
- **Subtitle**: AI-Powered Investment Portfolio Manager
- **Category**: Finance
- **Age Rating**: 4+ (No objectionable content)

### Privacy Policy
You'll need a privacy policy URL. Quick options:
1. Create at [PrivacyPolicyGenerator.info](https://www.privacypolicygenerator.info/)
2. Host on your GoDaddy site
3. Use GitHub Pages (free)

**Required sections**:
- Data we collect (email, portfolio data)
- How we use it (portfolio management)
- Data storage (Supabase)
- Third-party services (none/Anthropic AI)
- User rights (delete account, export data)

### App Description (for later full release)
```
PortfolioAI helps you manage investment portfolios with AI-powered insights.

Features:
• Track stocks, mutual funds, bonds, and crypto
• Real-time portfolio performance
• AI-powered stock analysis
• Secure client-manager collaboration
• Historical performance tracking
• Transaction management

Perfect for financial advisors managing multiple client portfolios.
```

### Screenshots (Required for TestFlight External Testing)
Take 6.7" iPhone screenshots:
1. Portfolio dashboard
2. Holdings view with performance
3. AI stock analysis
4. Charts and analytics
5. Client management

**Tool**: Use iOS Simulator or your iPhone

---

## ⏱️ Timeline Estimate

| Task | Time |
|------|------|
| Apple Developer Account approval | 24-48 hours |
| First EAS build | 15-20 minutes |
| App Store Connect processing | 10-30 minutes |
| Internal TestFlight setup | 5 minutes |
| Client receives invite | Instant |
| **Total (if account ready)** | **~1 hour** |
| **Total (with account setup)** | **1-2 days** |

---

## 🔧 Troubleshooting

### Build Fails: "Invalid Bundle Identifier"
```bash
# Make sure app.json has unique bundle ID
"bundleIdentifier": "com.portfolioai.app"

# Or use your domain
"bundleIdentifier": "com.yourdomain.portfolioai"
```

### Build Fails: "Missing Provisioning Profile"
```bash
# Reset credentials and try again
eas credentials

# Choose "Manage" → "Distribution certificate" → "Remove"
# Rebuild - EAS will create new ones
```

### Submit Fails: "Invalid Apple ID"
- Make sure you're using the Apple ID enrolled in Developer Program
- Check 2FA is enabled
- Use App-Specific Password if needed

### Client Can't Install
- Verify client's email matches their Apple ID
- Check they downloaded TestFlight app first
- Resend invite from App Store Connect

---

## 🎉 Success Checklist

- [ ] Apple Developer account active
- [ ] EAS CLI installed and logged in
- [ ] `eas init` completed successfully
- [ ] First production build completed
- [ ] App appears in App Store Connect
- [ ] TestFlight Internal Testing set up
- [ ] Client invited and received email
- [ ] Client installed via TestFlight
- [ ] Collecting feedback for v2.0

---

## 📊 After Client Feedback

### Update & Re-deploy
```bash
# 1. Make changes to code
# 2. Increment version in app.json
"version": "1.0.1",
"ios": { "buildNumber": "2" }

# 3. Build again
eas build --platform ios --profile production

# 4. Submit
eas submit --platform ios --latest
```

### TestFlight automatically notifies testers of new builds!

---

## 💰 Cost Breakdown

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| Expo EAS Build (Free tier) | $0 (up to 30 builds/month) |
| TestFlight | $0 (included) |
| **Total** | **$99/year** |

**Note**: If you need more than 30 builds/month, EAS paid plans start at $29/month.

---

## 🔗 Useful Links

- [App Store Connect](https://appstoreconnect.apple.com)
- [Expo EAS Documentation](https://docs.expo.dev/build/introduction/)
- [TestFlight Beta Testing Guide](https://developer.apple.com/testflight/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## 📧 Support

If you encounter issues:
1. Check [Expo Status](https://status.expo.dev/)
2. Review [EAS Build Logs](https://expo.dev/accounts/[your-username]/projects/portfolioai/builds)
3. Ask in [Expo Forums](https://forums.expo.dev/)

---

**Ready to deploy? Start with Step 1! 🚀**
