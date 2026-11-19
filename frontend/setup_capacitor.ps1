# KrishiMart Nepal — 1-Click Capacitor Native App Setup (Android & iOS)
# Run inside: C:\Users\Lenovo\Desktop\krishimart\frontend

Write-Host "1. Installing Capacitor Core, CLI, Android & iOS platforms..." -ForegroundColor Green
npm install @capacitor/core @capacitor/android @capacitor/ios
npm install -D @capacitor/cli

Write-Host "2. Building production React bundle (dist/)..." -ForegroundColor Green
npm run build

Write-Host "3. Adding native Android and iOS projects..." -ForegroundColor Green
if (-not (Test-Path "android")) { npx cap add android }
if (-not (Test-Path "ios")) { npx cap add ios }

Write-Host "4. Syncing web assets to Android and iOS..." -ForegroundColor Green
npx cap sync

Write-Host "Done! Commit & push to GitHub to auto-build your free Android APK and iOS IPA in GitHub Actions, or run 'npx cap open android' in Android Studio." -ForegroundColor Yellow