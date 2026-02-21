# Build PortfolioAI for Your Personal iPhone (No $99 Payment Needed)

Write-Host "📱 Build PortfolioAI for Your iPhone" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue
Write-Host ""

# Check if EAS CLI is installed
Write-Host "Checking EAS CLI..." -ForegroundColor Cyan
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-not $easInstalled) {
    Write-Host "Installing EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
    Write-Host "✓ EAS CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✓ EAS CLI already installed" -ForegroundColor Green
}
Write-Host ""

# Login to Expo
Write-Host "Logging in to Expo..." -ForegroundColor Cyan
Write-Host "If you don't have an account, create one (it's free)"
eas login
Write-Host "✓ Logged in!" -ForegroundColor Green
Write-Host ""

# Check if project is initialized
Write-Host "Checking project setup..." -ForegroundColor Cyan
$appJson = Get-Content "app.json" -Raw | ConvertFrom-Json

if ($appJson.expo.extra.eas.projectId -eq "your-project-id-will-be-here") {
    Write-Host "Need to initialize EAS project first..." -ForegroundColor Yellow
    eas init
    Write-Host ""
}
Write-Host "✓ Project configured" -ForegroundColor Green
Write-Host ""

# Device registration
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "IMPORTANT: Register Your iPhone First" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "On your iPhone:"
Write-Host "1. Open Safari"
Write-Host "2. Go to: https://expo.dev/register-device"
Write-Host "3. Tap 'Get Started'"
Write-Host "4. Follow instructions to install profile"
Write-Host "5. Come back here when done"
Write-Host ""
$deviceRegistered = Read-Host "Have you registered your device? (y/n)"

if ($deviceRegistered -ne "y") {
    Write-Host ""
    Write-Host "⚠️  Please register your device first!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick steps:"
    Write-Host "1. iPhone → Safari → https://expo.dev/register-device"
    Write-Host "2. Install the profile"
    Write-Host "3. Run this script again"
    Write-Host ""
    exit
}
Write-Host "✓ Device registered" -ForegroundColor Green
Write-Host ""

# Ask about backend
Write-Host "Backend Configuration" -ForegroundColor Cyan
Write-Host "Your app needs a backend API to work"
Write-Host ""
$hasBackend = Read-Host "Is your backend deployed to Railway/Render? (y/n)"

if ($hasBackend -eq "y") {
    $backendUrl = Read-Host "Enter your backend URL"

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
    Write-Host ""
    Write-Host "⚠️  You can use local backend with ngrok:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Deploy to Railway (Recommended):"
    Write-Host "  1. Go to https://railway.app"
    Write-Host "  2. New Project → Deploy from GitHub"
    Write-Host "  3. Select 'apps/api' folder"
    Write-Host "  4. Deploy → Copy URL"
    Write-Host ""
    Write-Host "Option 2 - Use ngrok (Local testing):"
    Write-Host "  1. npm install -g ngrok"
    Write-Host "  2. In backend: uvicorn app.main:app"
    Write-Host "  3. In another terminal: ngrok http 8000"
    Write-Host "  4. Copy the https URL"
    Write-Host ""
    $backendUrl = Read-Host "Enter backend URL (or press Enter to use localhost)"

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
        Write-Host "⚠️  Using localhost - app won't work on phone without ngrok" -ForegroundColor Yellow
    }
}
Write-Host ""

# Start build
Write-Host "======================================" -ForegroundColor Green
Write-Host "Starting Build for Your iPhone" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  • Ask for your Apple ID (free account is fine)"
Write-Host "  • Build the app on Expo servers (~15-20 minutes)"
Write-Host "  • Give you a QR code to install on your iPhone"
Write-Host ""
Write-Host "During the build, you'll be asked for:"
Write-Host "  • Your Apple ID email"
Write-Host "  • Apple ID password"
Write-Host "  • Possibly a 2FA code"
Write-Host ""
$ready = Read-Host "Ready to start? (y/n)"

if ($ready -eq "y") {
    Write-Host ""
    Write-Host "Building for iOS (Development)..." -ForegroundColor Cyan
    Write-Host "☕ This takes 15-20 minutes. Go grab a coffee!" -ForegroundColor Yellow
    Write-Host ""

    eas build --platform ios --profile development

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "✅ Build Complete!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Scan the QR code above with your iPhone Camera app"
    Write-Host "2. Tap the notification"
    Write-Host "3. Safari will open → Tap 'Install'"
    Write-Host "4. App will download to home screen"
    Write-Host "5. First time: Settings → General → VPN & Device Management"
    Write-Host "6. Tap your email → Trust"
    Write-Host "7. Open PortfolioAI app!"
    Write-Host ""
    Write-Host "⚠️  Note: Development builds expire after 7 days" -ForegroundColor Yellow
    Write-Host "   Just rebuild when it expires (run this script again)"
    Write-Host ""
    Write-Host "🎉 Enjoy testing PortfolioAI on your iPhone!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "No problem! When ready, run:" -ForegroundColor Cyan
    Write-Host "  eas build --platform ios --profile development" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Helpful Commands:" -ForegroundColor Cyan
Write-Host "  • View builds: eas build:list"
Write-Host "  • View device: eas device:list"
Write-Host "  • Rebuild: eas build --platform ios --profile development"
Write-Host ""
