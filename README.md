# CHRONOS ATLAS v2.0

**Navigate 5,000 years of human civilization on a dynamic world map.**

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build for Production

```bash
npm run build
npm run preview
```

---

## Features

| Feature | Description |
|---|---|
| 🗺️ **Dynamic Map** | Dark cinematic world map with CartoDB tiles |
| ⏳ **Inertia Timeline** | Physics-based drag/scroll timeline engine |
| 🏛️ **Historical Boundaries** | 15+ empire and nation overlays across 5,000 years |
| 📍 **130 Real Events** | Curated events from -3100 BCE to 2024 CE |
| 🔍 **Full-Text Search** | Instant search across all events, countries, tags |
| 🎯 **Discovery Feed** | Scroll-triggered progressive event reveal |
| 🔥 **Heatmaps** | War / Science / Disaster / Pandemic density layers |
| 🎛️ **Category Filters** | Filter by War, Science, Disaster, Politics, and more |
| 💥 **Event Popups** | Click any pin → rich animated detail card |
| ⌨️ **Keyboard Nav** | Arrow keys, Page Up/Down to navigate time |

---

## Controls

| Control | Action |
|---|---|
| **Drag timeline** | Navigate through time with inertia |
| **Scroll wheel** | Move forward/backward in time |
| **← → Arrow keys** | Step ±10 years |
| **Page Up/Down** | Jump ±100 years |
| **Click decade dot** | Jump to major historical era |
| **Click map pin** | View event details |
| **Click cluster** | Zoom into area |
| **⌘K / Search btn** | Open search |

---

## Tech Stack

- **React 18** + **Vite** — fast, modern frontend
- **Leaflet / CartoDB** — no-API-key dark map tiles
- **D3.js** — event density sparkline visualization
- **Framer Motion** — spring-physics animations
- **Zustand** — lightweight global state
- **Custom InertiaEngine** — pure JS physics timeline

---

## Project Structure

```
src/
├── components/
│   ├── map/          # MapEngine, EventPopup
│   ├── timeline/     # TimelineTrack, DensityBar, YearBadge
│   ├── ui/           # FilterPanel, SearchModal, DiscoveryFeed
│   ├── heatmap/      # HeatmapControls
│   └── layout/       # Header
├── data/
│   ├── historicalEvents.js     # 130 real historical events
│   └── historicalBoundaries.js # 15 empire/nation boundaries
├── lib/
│   ├── InertiaEngine.js  # Physics scroll engine
│   ├── discoveryEngine.js # Progressive reveal system
│   └── dateUtils.js       # BCE/CE formatting
├── store/
│   ├── timelineStore.js  # Current year state
│   └── filterStore.js    # Category filters, panels
└── styles/
    └── globals.css       # Complete dark cinematic UI
```

---

## Data

All data is embedded — **no API keys required**, **no backend needed**.

- 130 historically accurate events from -3100 BCE to 2024 CE
- 15 major political entity boundaries with year ranges
- Covers: Ancient Egypt, Roman Empire, Mongol Empire, Ottoman Empire,
  British Empire, Soviet Union, and more

---

*CHRONOS ATLAS — Navigate Human Civilization*
