# TerraDetect UK 🇬🇧⛏️

> **The Metal Detecting Field Companion, Dynamic LiDAR Terrain Analyser & Scheduled Monument Navigator for England & Wales.**

TerraDetect UK is a privacy-first, mobile-ready metal detecting and archaeological field application designed for detectorists across Britain. It opens directly onto high-resolution **Satellite** imagery centered at your live GPS coordinates, overlays statutory **Scheduled Ancient Monument** boundaries from **Historic England** and **Cadw (Wales)** with automatic 50-metre proximity alerts, features a custom **Dark & Gold Live LiDAR & SLRM Micro-Relief Engine**, and stores 100% of your logged finds privately on your own device via its **On-Device Local Vault**.

---

## 🌟 Core Features

### 1. 🛰️ High-Resolution Satellite & Live GPS Auto-Centering
- **Satellite Default on Startup**: Launches straight into high-resolution aerial satellite imagery so you can inspect field boundaries,ゲートways, footpaths, and cropmarks immediately.
- **Instant Live Geolocation**: Automatically acquires your device's GPS coordinates on startup and centers both the viewport and the draggable target pin at your exact field position.
- **Multi-Layer Switching**: Switch effortlessly between **Satellite**, **Live LiDAR**, **UK Topo Contours**, and **Field Tracks / Footpaths**.

### 2. ☀️ Custom Live LiDAR Engine (Sun Azimuth, Altitude, SLRM & Dark/Gold Tones)
- **Dynamic Solar Illumination Controls**:
  - **Sun Direction (Azimuth 0° – 360°)**: Rotate directional illumination across 360° with 8 quick compass presets (`NW 315°`, `N 0°`, `NE 45°`, `E 90°`, `SE 135°`, `S 180°`, `SW 225°`, `W 270°`) to reveal earthworks running at any orientation.
  - **Sun Height (Altitude 5° – 85°)**: Adjust solar elevation from low grazing light (`15°` — casts long shadows across faint 5cm ploughed furrows and Celtic lynchets) to standard (`35°`) or overhead (`60°` — illuminates deep holloways and quarry pits).
- **Simple Local Relief Model (SLRM) Micro-Relief Shader**:
  - Hardware-accelerated dual-pass SVG terrain shader (`#terradetect-relief-engine`) that subtracts regional hillside gradients to isolate local micro-topography (ploughed-out barrows, Roman agger banks, medieval ridge-and-furrow, and enclosure ditches).
  - Adjustable **SLRM Opacity (0% – 100%)** and **Feature Scope** (`2px Subtle`, `4px Standard`, `8px Deep`).
- **Bespoke Archaeological Terrain Palettes**:
  - **Dark & Gold (Obsidian & Antique Gold — Default)**: Ditches and depressions sink into deep obsidian (`#121214`) while ridges, banks, and barrow crowns gleam in antique gold (`#f59e0b`).
  - Additional palettes: **Sunburst Gold**, **SLRM Amber & Midnight**, **Archaeological Bronze**, **Pasture Green**, **Thermal Radar**, **Dark Slate**, and **Classic B&W**, plus **Ground Exposure**, **Contrast**, **Reverse Lighting**, and **Satellite Aerial Blend** sliders.
- **Complete England & Wales LiDAR Coverage**:
  - **All-UK Auto Composite**: Seamlessly combines **DataMapWales 2m DTM** across Wales with **Defra Environment Agency 1m DTM** across England.
  - Dedicated source selectors for **Wales 2m National DTM (100% Wales coverage)**, **Wales 1m High-Res DTM (with automatic 2m rural fallback)**, **Wales 2m DSM (Walls & Dykes)**, **EA 1m DTM**, **EA 2m DTM**, **EA 1m DSM**, **EA 1m Elevation Color Ramp**, and **UK Multi-Angle Relief**.

### 3. 🛡️ Live Scheduled Ancient Monument Protection (Historic England & Cadw)
- **Real-Time Statutory Polygons**: Queries **Historic England (NHLE Layer 6)** and **Cadw (Welsh Government GeoServer WFS)** concurrently for the active map viewport and renders protected boundaries in semi-transparent crimson.
- **50-Metre Buffer & Boundary Intrusion Alerts**: Continuously calculates planar geodesic clearance from your target pin to every polygon edge. Triggers an immediate visual warning banner if your pin enters a Scheduled Monument or falls within the 50m buffer zone.
- **Treasure Act 1996 & Section 42 Reference**: Built-in legal compliance guide covering the 14-day statutory reporting window, precious metal & hoard definitions (including the 2023 significance amendment), and direct links to Portable Antiquities Scheme (PAS) Finds Liaison Officers (FLOs).

### 4. 🔒 100% On-Device Private Local Vault (Zero Cloud Dependency)
- **Complete Data Ownership**: All logged finds, high-resolution photographs, VDI readings, depths, field notes, and exact GPS coordinates are stored exclusively on your phone or PC inside the **TerraDetect Local Vault** (`IndexedDB`).
- **Portable `.JSON` Vault Backups & Restore**: Export your entire vault (including embedded photos and coordinates) as a single `.json` backup file at any time, or restore/merge a backup onto a new device.
- **FLO / PAS `.CSV` Export**: One-click `.csv` spreadsheet export formatted for submitting field records to your local Finds Liaison Officer.

### 5. 📱 Mobile-First PWA for Android & iOS
- **Thumb-Friendly Field HUD**: Full-screen map layout with slide-up drawers and right-hand floating action buttons designed for one-handed use in the field.
- **Installable Standalone App**: Includes a Web App Manifest and mobile QR launcher so you can install TerraDetect UK directly to your Android or iPhone home screen.

---

## 🛠️ Local Development & Build Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v9.x` or higher

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/terradetect-uk.git
cd terradetect-uk
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
TerraDetect UK works out-of-the-box using its built-in Field GIS engine, UK Scheduled Monument proxy, and DataMapWales / Environment Agency LiDAR streams without requiring any external API keys.

### 4. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Production Build & Start
```bash
npm run build
npm start
```
`npm run build` bundles the React frontend via Vite and compiles `server.ts` into `server.js` via `esbuild`.

### 6. TypeScript Verification
```bash
npm run lint
```

---

## 🏗️ Architecture & Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 8, Tailwind CSS v4, `lucide-react` |
| **GIS & Mapping Engine** | Leaflet 1.9 (`FieldGisMap`) + Custom SVG Terrain Relief Shader (`#terradetect-relief-engine`) |
| **Backend Proxy Server** | Node.js, Express (`server.ts`) with in-memory spatial BBOX caching |
| **Heritage & LiDAR Data** | Historic England NHLE FeatureServer, Cadw SAM WFS, Defra EA 1m/2m WMS, DataMapWales 1m/2m DTM & DSM |
| **On-Device Storage** | Private Browser `IndexedDB` (`TerraDetect_LocalVault`) with `.JSON` & `.CSV` import/export |

---

## ⚖️ UK Legal & Archaeological Disclaimers

1. **Ancient Monuments and Archaeological Areas Act 1979 (Section 42)**: Using a metal detector on a Scheduled Monument without prior written consent from Historic England or Cadw is a criminal offence. Always verify boundaries and maintain a safe buffer margin.
2. **Treasure Act 1996**: Qualifying Treasure discoveries in England, Wales, and Northern Ireland must be reported to the local Coroner or Finds Liaison Officer (FLO) within **14 days**.
3. **Landowner Permission**: Always obtain explicit permission from the landowner before metal detecting on any land.

---

## 📄 License
Licensed under the [Apache-2.0 / MIT License](LICENSE).
