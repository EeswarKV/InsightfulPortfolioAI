# PortfolioAI - Automated Deployment Setup Script (Windows PowerShell)
# This script guides you through deploying to iOS App Store

Write-Host "🚀 PortfolioAI - iOS Deployment Setup" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue
Write-Host ""

# Step 1: Check if EAS CLI is installed
Write-Host "Step 1: Checking EAS CLI..." -ForegroundColor Cyan
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-not $easInstalled) {
    Write-Host "EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
    Write-Host "✓ EAS CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✓ EAS CLI already installed" -ForegroundColor Green
}
Write-Host ""

# Step 2: Login to Expo
Write-Host "Step 2: Expo Account Setup" -ForegroundColor Cyan
Write-Host "Opening Expo login..."
Write-Host "If you don't have an account, create one (it's free)"
pause
eas login
Write-Host "✓ Logged in to Expo" -ForegroundColor Green
Write-Host ""

# Step 3: Initialize EAS project
Write-Host "Step 3: Initializing EAS Project" -ForegroundColor Cyan
Write-Host "Press Enter to initialize (this creates your project on Expo)..."
pause
eas init
Write-Host "✓ EAS project initialized" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Copy the 'projectId' from the output above" -ForegroundColor Yellow
$projectId = Read-Host "Paste your Project ID here"

# Update app.json with project ID
$appJsonPath = "app.json"
$appJson = Get-Content $appJsonPath -Raw
$appJson = $appJson -replace '"projectId": "your-project-id-will-be-here"', "`"projectId`": `"$projectId`""
Set-Content $appJsonPath $appJson
Write-Host "✓ Project ID updated in app.json" -ForegroundColor Green
Write-Host ""

# Step 4: Get Expo username
Write-Host "Step 4: Setting Expo Username" -ForegroundColor Cyan
$expoUsername = Read-Host "Enter your Expo username"

$appJson = Get-Content $appJsonPath -Raw
$appJson = $appJson -replace '"owner": "your-expo-username"', "`"owner`": `"$expoUsername`""
Set-Content $appJsonPath $appJson
Write-Host "✓ Expo username set" -ForegroundColor Green
Write-Host ""

# Step 5: Check Apple Developer Account
Write-Host "Step 5: Apple Developer Account" -ForegroundColor Cyan
Write-Host "You need an Apple Developer account to continue"
Write-Host "Cost: `$99/year"
Write-Host "Sign up: https://developer.apple.com/programs/"
Write-Host ""
$hasApple = Read-Host "Do you have an active Apple Developer account? (y/n)"

if ($hasApple -ne "y") {
    Write-Host "⚠️  Please sign up for Apple Developer first" -ForegroundColor Yellow
    Write-Host "1. Go to: https://developer.apple.com/programs/"
    Write-Host "2. Sign up (takes 24-48 hours for approval)"
    Write-Host "3. Come back and run this script again"
    exit
}
Write-Host ""

# Step 6: Get Apple ID for eas.json
Write-Host "Step 6: Configure Apple ID" -ForegroundColor Cyan
$appleId = Read-Host "Enter your Apple ID (email)"

$easJsonPath = "eas.json"
$easJson = Get-Content $easJsonPath -Raw
$easJson = $easJson -replace '"appleId": "your-apple-id@email.com"', "`"appleId`": `"$appleId`""
Set-Content $easJsonPath $easJson
Write-Host "✓ Apple ID configured" -ForegroundColor Green
Write-Host ""

# Step 7: Check backend deployment
Write-Host "Step 7: Backend API" -ForegroundColor Cyan
Write-Host "Your mobile app needs a backend API"
Write-Host ""
$hasBackend = Read-Host "Have you deployed the backend to Railway/Render? (y/n)"

if ($hasBackend -eq "y") {
    $backendUrl = Read-Host "Enter your backend URL (e.g., https://yourapp.up.railway.app)"

    # Update constants.ts
    $constantsContent = @"
// API Configuration
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "$backendUrl";

// Supabase is configured in lib/supabase.ts
"@
    Set-Content "lib\constants.ts" $constantsContent
    Write-Host "✓ Backend URL configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend not deployed yet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick backend deployment:"
    Write-Host "1. Sign up at https://railway.app (free)"
    Write-Host "2. New Project → Deploy from GitHub"
    Write-Host "3. Select this repository → Choose 'apps/api' folder"
    Write-Host "4. Add environment variables (see DEPLOYMENT_GUIDE_BACKEND.md)"
    Write-Host "5. Deploy → Copy the URL"
    Write-Host ""
    $backendUrl = Read-Host "Enter backend URL (or press Enter to skip for now)"

    if ($backendUrl) {
        $constantsContent = @"
// API Configuration
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "$backendUrl";
"@
        Set-Content "lib\constants.ts" $constantsContent
        Write-Host "✓ Backend URL configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipped - you'll need to configure this before building" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 8: Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Build your iOS app:"
Write-Host "   eas build --platform ios --profile production" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. This will take 15-20 minutes and will ask for:"
Write-Host "   - Your Apple ID password"
Write-Host "   - 2FA code"
Write-Host "   - Confirmation to create certificates"
Write-Host ""
Write-Host "3. After build completes, submit to TestFlight:"
Write-Host "   eas submit --platform ios --latest" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Invite testers in App Store Connect:"
Write-Host "   https://appstoreconnect.apple.com"
Write-Host ""
Write-Host "📱 Your app will be ready for testing!" -ForegroundColor Cyan
Write-Host ""
$startBuild = Read-Host "Want to start building now? (y/n)"

if ($startBuild -eq "y") {
    Write-Host ""
    Write-Host "Starting iOS build..." -ForegroundColor Cyan
    Write-Host "This will take 15-20 minutes. Grab a coffee! ☕"
    Write-Host ""
    eas build --platform ios --profile production

    Write-Host ""
    Write-Host "Build submitted!" -ForegroundColor Green
    Write-Host "Check status: eas build:list"
} else {
    Write-Host ""
    Write-Host "No problem! When ready, run:" -ForegroundColor Cyan
    Write-Host "eas build --platform ios --profile production" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 All done! Good luck with your deployment!" -ForegroundColor Green
