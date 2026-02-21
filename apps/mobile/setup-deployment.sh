#!/bin/bash

# PortfolioAI - Automated Deployment Setup Script
# This script guides you through deploying to iOS App Store

set -e

echo "🚀 PortfolioAI - iOS Deployment Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if EAS CLI is installed
echo -e "${BLUE}Step 1: Checking EAS CLI...${NC}"
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}EAS CLI not found. Installing...${NC}"
    npm install -g eas-cli
    echo -e "${GREEN}✓ EAS CLI installed!${NC}"
else
    echo -e "${GREEN}✓ EAS CLI already installed${NC}"
fi
echo ""

# Step 2: Login to Expo
echo -e "${BLUE}Step 2: Expo Account Setup${NC}"
echo "Opening Expo login..."
echo "If you don't have an account, create one (it's free)"
read -p "Press Enter to login to Expo..."
eas login
echo -e "${GREEN}✓ Logged in to Expo${NC}"
echo ""

# Step 3: Initialize EAS project
echo -e "${BLUE}Step 3: Initializing EAS Project${NC}"
read -p "Press Enter to initialize (this creates your project on Expo)..."
eas init
echo -e "${GREEN}✓ EAS project initialized${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Copy the 'projectId' from the output above${NC}"
read -p "Paste your Project ID here: " PROJECT_ID

# Update app.json with project ID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"projectId\": \"your-project-id-will-be-here\"/\"projectId\": \"$PROJECT_ID\"/" app.json
else
    # Windows/Linux
    sed -i "s/\"projectId\": \"your-project-id-will-be-here\"/\"projectId\": \"$PROJECT_ID\"/" app.json
fi
echo -e "${GREEN}✓ Project ID updated in app.json${NC}"
echo ""

# Step 4: Get Expo username
echo -e "${BLUE}Step 4: Setting Expo Username${NC}"
read -p "Enter your Expo username: " EXPO_USERNAME

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"owner\": \"your-expo-username\"/\"owner\": \"$EXPO_USERNAME\"/" app.json
else
    sed -i "s/\"owner\": \"your-expo-username\"/\"owner\": \"$EXPO_USERNAME\"/" app.json
fi
echo -e "${GREEN}✓ Expo username set${NC}"
echo ""

# Step 5: Check Apple Developer Account
echo -e "${BLUE}Step 5: Apple Developer Account${NC}"
echo "You need an Apple Developer account to continue"
echo "Cost: \$99/year"
echo "Sign up: https://developer.apple.com/programs/"
echo ""
read -p "Do you have an active Apple Developer account? (y/n): " HAS_APPLE

if [[ $HAS_APPLE != "y" ]]; then
    echo -e "${YELLOW}⚠️  Please sign up for Apple Developer first${NC}"
    echo "1. Go to: https://developer.apple.com/programs/"
    echo "2. Sign up (takes 24-48 hours for approval)"
    echo "3. Come back and run this script again"
    exit 0
fi
echo ""

# Step 6: Get Apple ID for eas.json
echo -e "${BLUE}Step 6: Configure Apple ID${NC}"
read -p "Enter your Apple ID (email): " APPLE_ID

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"appleId\": \"your-apple-id@email.com\"/\"appleId\": \"$APPLE_ID\"/" eas.json
else
    sed -i "s/\"appleId\": \"your-apple-id@email.com\"/\"appleId\": \"$APPLE_ID\"/" eas.json
fi
echo -e "${GREEN}✓ Apple ID configured${NC}"
echo ""

# Step 7: Check backend deployment
echo -e "${BLUE}Step 7: Backend API${NC}"
echo "Your mobile app needs a backend API"
echo ""
read -p "Have you deployed the backend to Railway/Render? (y/n): " HAS_BACKEND

if [[ $HAS_BACKEND == "y" ]]; then
    read -p "Enter your backend URL (e.g., https://yourapp.up.railway.app): " BACKEND_URL

    # Update constants.ts
    cat > lib/constants.ts << EOF
// API Configuration
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "$BACKEND_URL";

// Supabase is configured in lib/supabase.ts
EOF

    echo -e "${GREEN}✓ Backend URL configured${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not deployed yet${NC}"
    echo ""
    echo "Quick backend deployment:"
    echo "1. Sign up at https://railway.app (free)"
    echo "2. New Project → Deploy from GitHub"
    echo "3. Select this repository → Choose 'apps/api' folder"
    echo "4. Add environment variables (see DEPLOYMENT_GUIDE_BACKEND.md)"
    echo "5. Deploy → Copy the URL"
    echo ""
    read -p "Enter backend URL (or press Enter to skip for now): " BACKEND_URL

    if [[ -n $BACKEND_URL ]]; then
        cat > lib/constants.ts << EOF
// API Configuration
export const API_URL = __DEV__
  ? "http://localhost:8000"
  : "$BACKEND_URL";
EOF
        echo -e "${GREEN}✓ Backend URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipped - you'll need to configure this before building${NC}"
    fi
fi
echo ""

# Step 8: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Build your iOS app:"
echo -e "   ${YELLOW}eas build --platform ios --profile production${NC}"
echo ""
echo "2. This will take 15-20 minutes and will ask for:"
echo "   - Your Apple ID password"
echo "   - 2FA code"
echo "   - Confirmation to create certificates"
echo ""
echo "3. After build completes, submit to TestFlight:"
echo -e "   ${YELLOW}eas submit --platform ios --latest${NC}"
echo ""
echo "4. Invite testers in App Store Connect:"
echo "   https://appstoreconnect.apple.com"
echo ""
echo -e "${BLUE}📱 Your app will be ready for testing!${NC}"
echo ""
echo -e "${YELLOW}Want to start building now? (y/n)${NC}"
read -p "> " START_BUILD

if [[ $START_BUILD == "y" ]]; then
    echo ""
    echo -e "${BLUE}Starting iOS build...${NC}"
    echo "This will take 15-20 minutes. Grab a coffee! ☕"
    echo ""
    eas build --platform ios --profile production

    echo ""
    echo -e "${GREEN}Build submitted!${NC}"
    echo "Check status: eas build:list"
else
    echo ""
    echo -e "${BLUE}No problem! When ready, run:${NC}"
    echo -e "${YELLOW}eas build --platform ios --profile production${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All done! Good luck with your deployment!${NC}"
