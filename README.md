# Home Tracker

A tiny, battery-friendly web app that notifies you when you arrive home. Runs entirely in your browser — no backend, no data leaves your device (location is stored only in `localStorage`).

## Features
- Set "home" using your current location or by searching an address
- Adjustable arrival radius (30–500m)
- Browser notification when you enter the radius
- Low battery impact: uses `enableHighAccuracy: false` and a 60s position cache instead of constant high-precision GPS polling

## Limitations (read this)
This is a **web app**, not a native Android app. Browsers can only track location while:
- The tab is open and in the foreground, or
- The tab is in the background (works on most desktop browsers; mobile background support varies by OS/browser and may pause after a while)

It **cannot** wake up from a fully closed app or do true OS-level background geofencing like a native app can. If you need guaranteed background tracking even when the browser is closed, that requires a native Android app (happy to help with that too).

## Run locally
Just open `index.html` in a browser. Location and notifications require either `localhost` or HTTPS.

## Host on GitHub Pages
1. Create a new GitHub repo (e.g. `home-tracker`)
2. Push these three files (`index.html`, `style.css`, `script.js`) to the repo
3. Go to the repo's **Settings → Pages**
4. Under "Source", choose the `main` branch and `/ (root)` folder, then save
5. GitHub will give you a URL like `https://yourusername.github.io/home-tracker/`
6. Open that URL on your phone, allow location + notification permissions when prompted

### Command line push
```bash
cd home-tracker
git init
git add .
git commit -m "Home tracker app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/home-tracker.git
git push -u origin main
```
Then enable Pages as described above.

## Optional: install as an app (PWA-lite)
On mobile Chrome/Safari, use "Add to Home Screen" from the browser menu after opening the hosted URL — this gives it an app-like icon and window, though background limitations above still apply.

## Building a desktop executable (.exe)

Plain HTML/CSS/JS can't run standalone as an .exe on its own — it needs a wrapper that bundles a browser engine. This project uses **Electron** for that.

### Setup
```bash
cd home-tracker
npm install
```

### Run it as a desktop app (no packaging, for testing)
```bash
npm start
```

### Build the actual .exe (Windows)
```bash
npm run build:win
```
This produces an installer in the `dist/` folder (e.g. `Home Tracker Setup 1.0.0.exe`). Running that installer sets up the app on Windows with a normal Start Menu shortcut.

You can also build for other platforms:
```bash
npm run build:mac    # produces a .dmg
npm run build:linux  # produces an AppImage
```

**Note:** electron-builder can normally cross-compile Windows builds from macOS/Linux, but for the smoothest results (especially code signing later), build the Windows `.exe` on an actual Windows machine or CI runner (e.g. GitHub Actions with a `windows-latest` runner).

### Icon
Add your own `icon.png` (256x256 recommended) to the project root before building, or remove the `icon` fields from `package.json` to use Electron's default icon.

## Getting the .exe automatically via GitHub (no local build needed)

This repo includes a GitHub Actions workflow (`.github/workflows/build.yml`) that builds the Windows `.exe` for you on GitHub's own servers every time you push to `main`. You don't need Node, npm, or Windows on your own machine at all.

### Steps
1. Push this whole folder (including the `.github` folder) to your GitHub repo:
   ```bash
   cd home-tracker
   git init
   git add .
   git commit -m "Home tracker app with auto-build"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/home-tracker.git
   git push -u origin main
   ```
2. On GitHub, go to your repo's **Actions** tab. You'll see a "Build Windows EXE" workflow run automatically.
3. Wait for it to finish (usually 2–4 minutes) — a green checkmark means success.
4. Click into that workflow run, scroll to **Artifacts**, and download `home-tracker-windows` — it's a zip containing the `.exe` installer.
5. Unzip it and run the `.exe` on any Windows machine.

### Re-running the build manually
If you want to trigger a build without pushing new code, go to **Actions → Build Windows EXE → Run workflow** (this works because of the `workflow_dispatch` trigger in the workflow file).

### Turning it into a proper GitHub Release (optional)
If you'd rather have a permanent download link instead of digging through Actions artifacts each time, you can extend the workflow to attach the `.exe` to a GitHub Release automatically. Let me know if you want that added — it just needs a few more lines using the `softprops/action-gh-release` action.

### Notes on the desktop version
- Desktop Chromium (via Electron) supports background execution better than mobile browsers, so this fixes the "must keep the tab open" limitation from the web version
- Location permission still needs to be granted the first time the app requests it
- Notifications use the OS-native notification system (Windows notification center, etc.)
