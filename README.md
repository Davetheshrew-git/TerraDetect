# TerraDetect UK 🇬🇧🔍

> **The Intelligent Metal Detecting Field Companion & Archaeological Heritage Navigator for England & Wales.**

TerraDetect UK is a full-screen, mobile-first Progressive Web App (PWA) designed specifically for detectorists in the field. It combines live UK heritage GIS layers (Historic England & Cadw Scheduled Ancient Monuments), high-resolution UK LiDAR elevation relief in pasture green, full offline find logging with automatic cloud sync, and Google Gemini AI numismatic & artifact identification.

---

## 🌟 Key Features

### 1. 🛡️ Live Scheduled Ancient Monument Protection (England & Wales)
- **Live Bounding Queries**: Dynamically queries protected heritage boundaries from **Historic England (NHLE Layer 6)** and **Cadw (Welsh Government GeoServer WFS)**.
- **50m Proximity Audio & Visual Warnings**: Warns detectorists with flashing alert banners and boundary distance calculations to prevent accidental trespass on protected archaeological sites.
- **Section 42 & Treasure Act 1996 Compliance**: Built-in statutory guidance, 14-day legal notice alerts, and Finds Liaison Officer (FLO) reporting workflows.

### 2. 🟢 UK LiDAR Elevation Hillshade (Pasture Green Relief)
- **Anti-Glare Pasture Green Base**: Eliminates blinding bright white grayscale hillshades, presenting the terrain in natural British countryside meadow green.
- **Relief Contrast Slider**: Boosts subtle earthworks (ridge & furrow, Celtic field lynchets, barrow mounds, sunken Roman ditches) from 60% to 250% contrast.
- **Palette Switcher**: Choose between **Pasture Green (Default)**, **Topo Emerald**, **Archaeological Bronze/Sepia**, **Dark Slate**, and **Classic Monochrome**.

### 3. 📱 Mobile-First Android & iOS PWA
- **Edge-to-Edge Fullscreen Map**: Clean map interface with slide-in drawers and thumb-reachable action buttons.
- **GPS Auto-Centering**: Automatically prompts for GPS permissions on launch and tracks your position across open fields.
- **Native Installability**: Install directly from Chrome on Android or Safari on iOS without needing an app store download.

### 4. 🪙 Metallic Find Logging & Offline Caching
- **Precision Field Records**: Log find title, metal category (Gold, Silver, Bronze, Copper, Iron, Lead), target VDI, depth (inches/cm), soil condition, and field notes.
- **Direct Phone Camera Photos**: Attach high-res find photos straight from your smartphone camera or gallery.
- **Offline-First (IndexedDB)**: No cell signal in the woods or valleys? Finds are securely saved to local device storage and automatically synced to Firebase Firestore once an internet connection is re-established.

### 5. 🤖 Google Gemini AI Numismatic & Artifact Lens
- **Visual Artifact Valuation**: Powered by the modern `@google/genai` TypeScript SDK.
- **Historical Analysis**: Identifies period (Celtic, Roman, Anglo-Saxon, Viking, Medieval, Tudor, Stuart, Georgian, Victorian, Modern), condition grade, metal composition, and estimated market value range (£).
- **Search-Grounded References**: Integrates live web auction and museum database references with FLO compliance tags.

---

## 🚀 How to Send / Push this App to Your GitHub

### Option A: One-Click Export in Google AI Studio
1. Look at the **top-right toolbar** of your Google AI Studio workspace.
2. Click **Share** / **Export** and select **Export to GitHub**.
3. Authorize your GitHub account and choose either a new repository name (e.g. `terradetect-uk`) or an existing repository.
4. AI Studio will commit and push all files to your GitHub account automatically.

---

### Option B: Push via Git Command Line

If you have cloned or downloaded the project files locally:

```bash
# 1. Initialize git in the project root
git init -b main

# 2. Add all project files (node_modules and local secrets are ignored by .gitignore)
git add .

# 3. Create your initial commit
git commit -m "Initial commit: TerraDetect UK metal detecting field companion"

# 4. Create a new repository on https://github.com/new (e.g. terradetect-uk)

# 5. Link to your GitHub remote repository
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/terradetect-uk.git

# 6. Push to main
git push -u origin main
```

---

## 🛠️ Local Development & Build Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v9.x` or higher
- **Google Gemini API Key**: [Get a key from Google AI Studio](https://aistudio.google.com/app/apikey)
- **Google Maps API Key** *(Optional)*: If omitted, the app automatically runs on its built-in Leaflet Field GIS engine with full satellite and LiDAR capabilities.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/terradetect-uk.git
cd terradetect-uk
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and fill in your keys:
```env
# Required for Google Gemini AI artifact identification & valuation
GEMINI_API_KEY="AIzaSy..."

# Host URL (for local dev)
APP_URL="http://localhost:3000"

# Optional Google Maps JavaScript API key
VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."
VITE_GOOGLE_MAPS_MAP_ID="DEMO_MAP_ID"
```

### Step 4: Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.  
The Express backend proxy (with live Cadw SAM & Historic England ArcGIS feeds) and Vite client dev server run simultaneously on port 3000.

---

### Step 5: Production Build & Run
To create an optimized production bundle:
```bash
npm run build
```
This runs `vite build` for the React client and compiles `server.ts` into a lightweight, standalone `server.js` using `esbuild`.

To start the production server:
```bash
npm start
```

### Step 6: Code Quality & Linting
Run TypeScript type-checking:
```bash
npm run lint
```

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Backend & API Server** | Node.js, Express, `tsx`, `esbuild` |
| **Mapping Engines** | Leaflet 1.9 (Field GIS) & `@vis.gl/react-google-maps` (AdvancedMarkerElement) |
| **Geospatial Datasets** | Historic England NHLE ArcGIS FeatureServer, Cadw (Wales) GeoServer WFS, Esri World Hillshade (UK LiDAR composite) |
| **Artificial Intelligence** | `@google/genai` (Gemini 2.5 Flash / Flash Lite with search grounding) |
| **Cloud & Offline Sync** | Firebase Firestore 13 + IndexedDB local caching |
| **Mobile PWA** | `vite-plugin-pwa`, Service Workers, Web App Manifest |
| **Iconography** | `lucide-react` |

---

## ⚖️ UK Legal & Archaeological Compliance

Metal detecting in the United Kingdom is governed by strict statutory legal frameworks:
1. **Ancient Monuments and Archaeological Areas Act 1979 (Section 42)**: It is a strict criminal offence to use a metal detector on a **Scheduled Ancient Monument** without written consent from Historic England (England) or Cadw (Wales). TerraDetect UK provides live boundary checks and 50-metre proximity warnings to help you stay compliant.
2. **Treasure Act 1996**: Any potential find of Treasure (gold/silver objects over 300 years old, coin hoards, prehistoric base metal assemblages) must be reported to the local coroner or your regional **Finds Liaison Officer (FLO)** within **14 days**.
3. **Permission**: Always obtain landowner permission prior to entering any land or public rights of way.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
