# 📱 Install PortfolioAI on Your iPhone (Without App Store)

## 🎯 Goal
Install the app on your iPhone for testing while waiting for Apple Developer account approval.

---

## ✅ Option 1: Development Build (RECOMMENDED)

This creates a full-featured version you can install on your iPhone.

### Requirements:
- ✅ Free Apple ID (the one you use on your iPhone)
- ✅ Your iPhone connected to computer OR available for testing
- ✅ EAS CLI installed
- ✅ Internet connection

### Step 1: Setup (One-time)

```powershell
# In apps/mobile directory
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo (free account)
eas login
```

### Step 2: Register Your iPhone

You need your iPhone's UDID (Unique Device Identifier)

**Method A: Using Expo** (Easiest)
1. Open browser on iPhone: https://expo.dev/register-device
2. Follow instructions to install profile
3. Your device is registered!

**Method B: Using iTunes**
1. Connect iPhone to computer
2. Open iTunes
3. Click device → Summary
4. Click "Serial Number" to show UDID
5. Copy the UDID

### Step 3: Build Development Version

```powershell
# Create development build
eas build --platform ios --profile development

# This will:
# 1. Ask for your Apple ID (free one is fine)
# 2. Register your device automatically
# 3. Build the app (takes 15-20 minutes)
# 4. Give you a QR code to scan with your iPhone
```

### Step 4: Install on Your iPhone

Once build completes:

**Method A: QR Code (Easiest)**
1. EAS will show a QR code in terminal
2. Open Camera app on iPhone
3. Scan the QR code
4. Tap the notification
5. Follow prompts to install
6. Done! App is on your home screen!

**Method B: Download Link**
1. EAS will give you a URL like: `https://expo.dev/artifacts/eas/...`
2. Open that URL on your iPhone
3. Tap "Install"
4. App appears on home screen

### Step 5: Trust Developer Certificate

First time installing:
1. Settings → General → VPN & Device Management
2. Tap your Apple ID email
3. Tap "Trust"
4. Now you can open the app!

---

## ✅ Option 2: Expo Go (LIMITED - Missing Features)

**⚠️ WARNING**: This won't include expo-secure-store, so authentication might not work properly.

### Quick Install (5 minutes)

```powershell
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# Start development server
npm start
```

Then on your iPhone:
1. Download "Expo Go" app from App Store (free)
2. Scan the QR code from terminal
3. App opens in Expo Go

**Limitations**:
- ❌ No expo-secure-store (auth might fail)
- ❌ Some features won't work
- ✅ Good for UI testing only

---

## ✅ Option 3: Web Version (Browser)

If you have a web build:

```powershell
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# Start web version
npm run web
```

Then:
1. Get your computer's IP address: `ipconfig` (look for IPv4)
2. On iPhone Safari: Open `http://YOUR-IP:8081`
3. App runs in browser

**Limitations**:
- Some mobile features won't work
- Different UI from native app
- Good for basic testing

---

## 🚀 Quick Start: Development Build (Copy-Paste Ready)

```powershell
# 1. Navigate to mobile folder
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# 2. Login to Expo
eas login

# 3. Register your device (open this on iPhone)
# https://expo.dev/register-device

# 4. Build for your device
eas build --platform ios --profile development

# 5. When build finishes, scan QR code with iPhone Camera app

# 6. Install and trust certificate
# Settings → General → VPN & Device Management → Trust
```

---

## 📋 Development vs Production Build

| Feature | Development Build | Production Build |
|---------|------------------|------------------|
| **Cost** | FREE Apple ID | $99/year Apple Developer |
| **Install On** | Only YOUR devices | Anyone via TestFlight/App Store |
| **Build Time** | 15-20 min | 15-20 min |
| **Features** | All features work ✅ | All features work ✅ |
| **Expires** | 7 days (rebuild weekly) | 1 year |
| **Best For** | Personal testing | Client testing |

---

## 🔄 Updating the App

When you make code changes:

```powershell
# Rebuild development version
eas build --platform ios --profile development

# Wait 15-20 min → Scan new QR code → Install update
```

---

## 💡 Pro Tips

### Make Backend Accessible from Phone

Your iPhone needs to reach your backend. Options:

**Option A: Deploy Backend First** (Recommended)
- Deploy to Railway as explained in guides
- Update `lib/constants.ts` with Railway URL
- Rebuild app

**Option B: Use ngrok** (For local backend)
```powershell
# Install ngrok
npm install -g ngrok

# In backend terminal (apps/api)
ngrok http 8000

# Copy the https URL
# Update lib/constants.ts:
# API_URL = "https://abc123.ngrok.io"

# Rebuild app
```

### Install on Multiple Devices

You can register up to **100 devices** with free Apple ID:
1. Each person opens: https://expo.dev/register-device
2. Rebuild after adding devices
3. Everyone can install!

### Development Build Expires After 7 Days

Free Apple Developer certificates expire weekly:
- Just rebuild: `eas build --platform ios --profile development`
- Takes 15-20 min
- Install new version

---

## 🐛 Troubleshooting

### "Unable to Install App"
**Solution**: Trust the developer certificate
1. Settings → General → VPN & Device Management
2. Tap your email → Trust

### "App Crashes on Launch"
**Check**:
1. Backend is running/deployed
2. API_URL in constants.ts is correct
3. Supabase keys are valid

### "Build Fails - No Devices Registered"
**Solution**: Register device first
1. iPhone: Open https://expo.dev/register-device
2. Install profile
3. Try build again

### "Certificate Expired"
**Solution**: Rebuild weekly
```powershell
eas build --platform ios --profile development
```

---

## 📊 Comparison: All Options

| Method | Setup Time | Works Fully? | Cost | Best For |
|--------|-----------|-------------|------|----------|
| **Development Build** | 30 min | ✅ Yes | FREE | **Testing all features** |
| Expo Go | 5 min | ❌ Limited | FREE | Quick UI checks |
| Web Browser | 2 min | ❌ Limited | FREE | Very basic testing |
| TestFlight | 2-3 days | ✅ Yes | $99 | **Client testing** |
| App Store | 1-2 weeks | ✅ Yes | $99 | **Public release** |

---

## ✅ Recommended Flow

**For You (Developer)**:
1. **Now**: Build development version (FREE)
2. Test all features on your iPhone
3. Make improvements

**For Client Testing**:
1. **Later**: Get Apple Developer ($99)
2. Build production version
3. Submit to TestFlight
4. Invite client

---

## 🎯 Let's Do It Now!

**Copy-paste these commands:**

```powershell
# 1. Go to mobile folder
cd C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\mobile

# 2. Install/Login to EAS
npm install -g eas-cli
eas login

# 3. Initialize project (if not done)
eas init

# 4. Build for your iPhone
eas build --platform ios --profile development

# When prompted:
# - Enter your Apple ID (free one)
# - Confirm device registration
# - Wait 15-20 minutes

# 5. Scan QR code with iPhone Camera
# 6. Install from Safari
# 7. Trust certificate in Settings
# 8. Open app!
```

---

## 🎉 Result

You'll have PortfolioAI installed on your iPhone:
- ✅ Full features working
- ✅ Test with real data
- ✅ Show to others on your phone
- ✅ No $99 payment needed yet
- ✅ Can update anytime

**Rebuild weekly** (free Apple Developer certs expire after 7 days)

---

**Ready? Run the commands above and you'll have the app on your phone in 30 minutes!** 🚀
