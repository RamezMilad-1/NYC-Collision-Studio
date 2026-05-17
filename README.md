# NYC Collision Studio

Interactive exploration of 15 years of NYC motor vehicle crashes — from a multi-million-row Open Data pipeline to a single-page React dashboard with a downloadable PDF report.

**Live demo →** https://nyc-collision-studio.vercel.app

---

## At a glance

| | |
|---|---|
| **Dataset** | 2M+ records · NYC Open Data, 2012 – present |
| **Sources** | Motor Vehicle Collisions · Crashes + Persons |
| **Pipeline** | Python (pandas, scikit-learn) Jupyter notebooks |
| **Frontend** | React 19 · TypeScript · Vite 7 · Recharts |
| **Output** | Interactive SPA + downloadable, vector-clean PDF report |
| **Deploy** | Vercel |

---

## What it is

An end-to-end data project. The upstream notebooks ingest two NYC Open Data sources (Crashes + Persons), reconcile them on `COLLISION_ID`, clean and impute geographic/contextual fields, and emit a fully-integrated dataset together with pre-computed aggregations and a multi-dimensional lookup index. The frontend is a glass-morphism React 19 dashboard that consumes those artefacts to deliver instant filtering across boroughs, years, contributing factors and vehicle types, plus a one-click full-dataset PDF report.

---

## Features

- **Two independent filter scopes** — chart filters and table filters are tracked separately and URL-synced, so a view is shareable.
- **Pre-computed index, instant queries** — single- and two-dimensional filter combinations resolve in O(1) against a pre-built JSON index instead of scanning rows.
- **Sample-to-full scaling** — when a filter combination falls outside the index, the loaded sample is aggregated and scaled to honest full-dataset magnitudes.
- **Search mode** — free-text queries (e.g. *"Brooklyn 2022 pedestrian"*) filter the record explorer in real time.
- **Downloadable PDF** — full-dataset report rasterized at high DPI with print-tuned typography, colors, and chart styling.
- **Light + dark themes** — soft-glass design system driven by CSS custom properties; both modes share one set of components.
- **Accessible UI** — focus-trapped modals, keyboard-only navigation, reduced-motion support, ARIA live regions for async state.
- **Resilient loading** — lazy-loaded modals, code-split routes, sample preview streams while the full index loads.

---

## Architecture

```
NYC-Collision-Studio/
├── *.ipynb                 ← data engineering: clean, integrate, post-process
├── frontend/
│   ├── public/data/        ← pre-computed JSON index + metadata + record preview
│   ├── scripts/            ← Node scripts that emit the data artefacts
│   └── src/
│       ├── components/     ← KPI tiles, charts, controls, modals, table
│       ├── hooks/          ← data, filters, pagination, theme, focus-trap, URL sync
│       ├── utils/          ← aggregations, filter logic, formatters, PDF export
│       └── App.css         ← single design system (theme tokens + components)
```

### Data engineering pipeline

1. **Clean** — independently clean Crashes and Persons datasets: drop columns >80 % missing, impute the rest, standardize dates/strings/categories.
2. **Geographic imputation** — fill missing boroughs and street names via mode-based rules, nearest-neighbor inference, and KNN over coordinates.
3. **Integrate** — merge on `COLLISION_ID` and run a post-merge cleaning pass to resolve newly-introduced inconsistencies.
4. **Emit artefacts** — `build_website_data.ipynb` reads `df_clean_integrated.csv` (dedupe on `COLLISION_ID`) and writes a single `frontend/public/data/nyc_data.json`. That file contains the full-NYC summary, every pre-aggregated 1- and 2-dimensional filter slice, filter dropdown values, and a 10 000-row sample for the record-level explorer. The website reads only this one file.

### Frontend highlights

- **Indexed lookups** — `lookupIndexed()` in `App.tsx` resolves any 0-, 1- or 2-dimensional filter combination against `byBorough`, `byYear`, `byFactor`, `byVehicleType`, `byOnStreet` and seven pairwise joins, returning exact full-dataset summaries without touching the sample rows.
- **Severity reprojection** — when `Fatalities only` or `Injuries only` is on, `severityIndexSummary()` reads `totalKilled` / `totalInjured` straight from the matching index cell, so the chart numbers are exact per year / per borough instead of scaled approximations.
- **Glass-morphism design system** — every surface (cards, toolbars, modals, KPI tiles) shares one rule built from CSS custom properties and `backdrop-filter`, so theming and dark-mode require no per-component code.
- **PDF clarity pipeline** — the export forces light theme on the html2canvas document clone, strips backdrop/blur/shadow effects, raises capture scale to `min(devicePixelRatio×2, 3.5)`, disables jsPDF compression, and applies a dedicated `.pdf-export-capture` stylesheet for high-contrast print typography.

---

## Tech stack

**Frontend** React 19, TypeScript 5.6, Vite 7, Recharts 3, html2pdf.js + html2canvas, papaparse
**Data** Python 3, pandas, NumPy, scikit-learn (KNNImputer), Jupyter
**Tooling** ESLint 9, typescript-eslint, react-compiler, rollup-plugin-visualizer
**Deploy** Vercel

---

## Running locally

```bash
git clone https://github.com/<your-fork>/NYC-Collision-Studio.git
cd NYC-Collision-Studio/frontend
npm install
npm run dev            # vite dev server
```

Other scripts:

```bash
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run precompute     # regenerate aggregations from raw dataset
npm run build-index    # regenerate the dataset index
```

The Python notebooks at the repo root are runnable in any standard Jupyter environment (`pandas`, `scikit-learn`).

---

## Data sources

- **Motor Vehicle Collisions · Crashes** — https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95
- **Motor Vehicle Collisions · Persons** — https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Person/f55k-p6yu

---

## Contributors

**Ramez**
Designed and built the React frontend end-to-end — interactive charts, dual-scope filters, search mode, PDF report pipeline, glass-morphism design system. Contributed to the Crashes-dataset cleaning, including borough/street imputation via mode-based rules, nearest-neighbor inference, and KNN.

**Ali**
Cleaned the Crashes and Persons datasets, contributed to data integration and post-integration cleaning, fixed filter logic in the frontend, added the heatmap visualization in the report feature.

**Omar**
Contributed to data integration and the extraction of the final fully-cleaned dataset ready for analysis and visualization.

---

## License

Available for review and academic use. Contact the contributors before redistribution.
