# ⚔️ DynastySlayer

**Dynasty Fantasy Football Intelligence** – powered by Sleeper API + KTC + Dynasty Daddy

---

## Features

- 📊 **Dashboard** – Roster grade, total value, age curve, position breakdown, quick insights
- 👥 **Roster View** – All players sorted by KTC/DD value with Pro Football Reference links
- 🔁 **Trade Proposals** – Smart AI-generated trade suggestions with value gain/loss
- 🧮 **Trade Calculator** – Manual player/pick comparison tool
- 📋 **Draft Board** – 2025 Rookie rankings with position recommendations
- 🏆 **League** – Power rankings, playoff probabilities, standings

---

## How to Deploy on GitHub Pages

### 1. Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `dynastyslayer` (or anything you like)
3. Set it to **Private** if you want only yourself to access it
4. Click **Create repository**

### 2. Upload the files

Option A – **GitHub Web UI** (easiest):
1. Drag and drop all files into the repository
2. Make sure the folder structure is preserved (`.github/workflows/deploy.yml`)

Option B – **Git CLI**:
```bash
git init
git add .
git commit -m "Initial DynastySlayer deploy"
git remote add origin https://github.com/YOUR_USERNAME/dynastyslayer.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will run automatically on every push

### 4. Access your app

After the workflow completes (~1-2 minutes), your app will be live at:
```
https://YOUR_USERNAME.github.io/dynastyslayer/
```

---

## How to Find Your Sleeper League ID

1. Open [sleeper.com](https://sleeper.com) in a browser
2. Navigate to your league
3. Look at the URL: `https://sleeper.com/leagues/XXXXXXXXXXXXXXXXX`
4. The long number is your **League ID**

Alternatively, open the Sleeper app → League → Settings → scroll down to find the League ID.

---

## Tech Stack

- Pure HTML/CSS/JavaScript – zero dependencies, zero build step
- Sleeper API (public, no auth required)
- KeepTradeCut + Dynasty Daddy values (static baseline + live fetch attempt)
- GitHub Pages for hosting

---

## Value Sources

| Source | Scale | Notes |
|--------|-------|-------|
| KeepTradeCut (KTC) | 0–10,000 | Dynasty standard, most widely used |
| Dynasty Daddy (DD) | 0–10,000 | Strong consensus model |
| **Average** | 0–10,000 | Displayed as primary value |

Static values are updated periodically. The app attempts to fetch live values from both sources on load.

---

## File Structure

```
dynastyslayer/
├── index.html          # Main HTML shell
├── styles.css          # Dark mode styling
├── api.js              # Sleeper API wrapper + PlayerDB cache
├── values.js           # KTC + Dynasty Daddy value engine
├── trades.js           # Trade proposal generator
├── draft.js            # Rookie draft board
├── league.js           # Power rankings + predictions
├── app.js              # Main controller
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml  # Auto-deploy to GitHub Pages
```
