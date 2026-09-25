# FieldShift

FieldShift is a NASA Space Apps Challenge 2026 concept (challenge: *Field Shift — Adapting Farms
with NASA Data*). It turns NASA Earth observations, local soil and market data, and field IoT
sensors into explainable crop choices and automated resource actions for smallholder farmers,
optimizing **risk-adjusted net margin per hectare** rather than raw yield.

This repository is a static, no-build multi-page site. There is no framework, no bundler, and no
server-side code — every page works by double-clicking the HTML file.

## File map

```
NASA/
├── index.html              Landing / hub page
├── problem.html             Problem definition, solution architecture, MVP plan
├── app.html                 Live prototype: decision engine (owned by another workstream)
├── iot-3d.html               IoT hardware in 3D (owned by another workstream)
├── specs.html                Technical specs: data contracts, formulas, hardware, guardrails (owned by another workstream)
├── assets/
│   ├── css/
│   │   └── fieldshift.css   Shared stylesheet (design tokens + components) used by every page
│   └── js/                  Shared/page scripts (owned by other workstreams)
├── data/                    Static data files consumed by the prototype/specs pages (see convention below)
└── README.md
```

`app.html`, `iot-3d.html`, `specs.html`, everything under `assets/js/`, and everything under
`data/` are owned by other agents working in parallel on this project. Until those land, the
corresponding nav links on `index.html` / `problem.html` will 404 — that's expected.

## How to open it

- **Simplest:** double-click `index.html` (or `problem.html`). Everything is plain HTML/CSS with
  relative paths, so it renders correctly straight from `file://` with no server.
- **Optional local server** (only needed if a later page uses `fetch()` against `data/*.json`):
  ```
  python -m http.server 8000
  ```
  then open `http://localhost:8000/`.

## Data-access convention

Pages must keep working from `file://`, where `fetch()` of local files is blocked by the browser.
The convention other agents are using for the `data/` folder:

- Each dataset ships as a plain script, e.g. `data/crops.js`, that assigns onto a shared global
  instead of exporting a module:
  ```js
  window.FS_DATA = window.FS_DATA || {};
  window.FS_DATA.crops = { /* ... */ };
  ```
- Pages load the datasets they need with plain `<script>` tags before their own logic:
  ```html
  <script src="data/crops.js"></script>
  <script src="assets/js/app.js"></script>
  ```
- A mirrored `data/*.json` file (e.g. `data/crops.json`) is also published alongside each `.js`
  file as the canonical data contract — useful for anyone consuming the data outside the browser,
  or once the site is served over HTTP and `fetch()` becomes viable.

This repo (the foundation slice) does not implement any `data/*.js` files itself — that's for the
prototype/specs workstreams — but `assets/css/fieldshift.css` and the shared topbar markup in
`index.html`/`problem.html` are the pattern the other pages should copy.

## CDN libraries

None. The foundation pages (`index.html`, `problem.html`, `assets/css/fieldshift.css`) use vanilla
HTML/CSS only, with system fonts (`Inter, ui-sans-serif, system-ui, ...`) and no external requests.
Other workstreams may add CDN-hosted libraries (e.g. a 3D or charting library) inside their own
files; document those additions in this section as they land.

## Credits & disclaimer

Concept artifact for discussion and validation as part of NASA Space Apps Challenge 2026.
Agronomic recommendations must be checked against local expertise, field measurements, and current
market data. Data sources referenced throughout the site: NASA HLS, GPM IMERG, SMAP, NASA POWER,
GEOGLAM Crop Monitor, and Sentinel-2 L2A (NASA/ESA), plus SoilGrids (ISRIC) which is explicitly
labeled as a non-NASA source wherever it is used.
