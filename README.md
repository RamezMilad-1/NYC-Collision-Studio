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

A full data project, taken from raw city records all the way to a polished web dashboard.

The Python notebooks pull two NYC Open Data files (Crashes and Persons), match them up by their shared `COLLISION_ID`, fill in missing values for fields like borough and street, and produce one clean combined dataset along with fast-lookup summary files.

The frontend is a modern, glass-style React 19 dashboard that reads those files and lets anyone filter crashes by borough, year, contributing factor or vehicle type in real time — and download the results as a clean PDF report with one click.

---

## Features

- **Two separate filter sets** — chart filters and table filters are tracked independently, and both are saved into the URL so any view can be shared by copying the link.
- **Pre-built index for instant results** — common filter combinations are looked up directly in a prepared index instead of scanning through millions of rows, so every chart updates immediately.
- **Smart scaling for rare filters** — when a filter combination isn't in the index, results from a representative sample are scaled up to reflect the true size of the full dataset.
- **Search mode** — free-text queries (e.g. *"Brooklyn 2022 pedestrian"*) filter the record explorer in real time.
- **Downloadable PDF** — a high-resolution report of the entire dataset, with print-friendly fonts, colors and chart styling.
- **Light and dark modes** — built on a single soft-glass design system, so both themes share the same components and look consistent.
- **Accessible interface** — full keyboard navigation, popups that trap focus for screen-reader users, respect for reduced-motion settings, and live announcements while data is loading.
- **Fast initial load** — heavier parts of the app load on demand, and a quick sample appears first while the full dataset loads in the background.

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

1. **Clean** — each dataset (Crashes and Persons) is cleaned on its own: columns that are mostly empty are dropped, the rest are filled in, and dates, text and categories are standardized.
2. **Fill in missing locations** — missing boroughs and street names are recovered using simple rules, lookups from nearby records, and a K-Nearest-Neighbors model over the latitude/longitude coordinates.
3. **Combine** — the two cleaned datasets are merged on the shared `COLLISION_ID`, then cleaned again to fix any new inconsistencies introduced by the merge.
4. **Build the website's data file** — `build_website_data.ipynb` takes the merged dataset and produces a single `frontend/public/data/nyc_data.json`. That one file holds the citywide summary, every pre-calculated filter result, the dropdown options, and a 10,000-row sample for the record explorer. The whole website reads from just this file.

### Frontend highlights

- **Instant lookups** — `lookupIndexed()` in `App.tsx` answers any filter combination (one or two filters at a time) by reading directly from the pre-built index, returning exact citywide numbers without ever scanning raw rows.
- **Exact fatality and injury counts** — when "Fatalities only" or "Injuries only" is selected, `severityIndexSummary()` pulls `totalKilled` / `totalInjured` straight from the matching index cell, so each chart shows true per-year and per-borough totals instead of estimates.
- **One design system, two themes** — every surface (cards, toolbars, popups, KPI tiles) follows one shared style rule based on CSS variables and a frosted-glass effect, so switching to dark mode needs no per-component code.
- **Sharp PDF export** — the export forces light mode on the rendering snapshot, removes blur and shadow effects, captures at high resolution, turns off PDF compression, and applies a dedicated print stylesheet for crisp text and colors.

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
