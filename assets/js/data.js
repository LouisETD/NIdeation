// assets/js/data.js
//
// FieldShift — Data layer / provenance layer.
//
// Thin wrapper around window.FS_DATA (populated by data/*.js) that adds:
//   - a demo/live mode switch, persisted to localStorage
//   - a "live" mode that overlays fresh NASA POWER daily data onto the
//     agrometeorological_context portion of field_state
//   - graceful degradation: live mode NEVER throws, hangs, or blanks the
//     UI — any failure (offline, CORS, timeout, file://) falls back to the
//     bundled demo data silently, with the reason recorded for the UI to
//     show in a small "why am I seeing demo data" note if it wants to.
//   - provenance(key) -> {source, provider, is_nasa, resolution, updated}
//     for the source-attribution chips used across the UI.
//
// Vanilla browser JS. No modules, no build step. Must work from file://
// (where fetch() to an external host will simply fail fast and gracefully).
(function () {
  'use strict';

  window.FS = window.FS || {};

  const MODE_KEY = 'fieldshift.mode'; // localStorage key
  const LIVE_FETCH_TIMEOUT_MS = 6000;

  // NASA POWER daily point API — no API key required.
  // https://power.larc.nasa.gov/docs/services/api/temporal/daily/
  const POWER_BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
  const POWER_PARAMETERS = 'T2M,T2M_MAX,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN';
  const POWER_COMMUNITY = 'AG';
  const POWER_LOOKBACK_DAYS = 14; // pull a short recent window for the live overlay

  let mode = 'demo';
  try {
    const stored = window.localStorage && window.localStorage.getItem(MODE_KEY);
    if (stored === 'live' || stored === 'demo') mode = stored;
  } catch (e) {
    // localStorage unavailable (privacy mode, file://, etc.) -> stay demo
  }

  let lastFallbackReason = null;
  let liveOverlay = null; // { precipitation_outlook, temperature_outlook, ... } once fetched
  let livePending = false;

  function fireChangeEvent(detail) {
    try {
      window.dispatchEvent(new CustomEvent('fs:datachange', { detail: detail || {} }));
    } catch (e) {
      // CustomEvent should always exist in any modern browser target; ignore if not.
    }
  }

  function persistMode(m) {
    try {
      if (window.localStorage) window.localStorage.setItem(MODE_KEY, m);
    } catch (e) {
      // ignore — mode still works in-memory for this session
    }
  }

  function fmtDate(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return '' + y + m + day;
  }

  function buildPowerUrl(lat, lon) {
    const end = new Date();
    const start = new Date(end.getTime() - POWER_LOOKBACK_DAYS * 24 * 3600 * 1000);
    const params = new URLSearchParams({
      parameters: POWER_PARAMETERS,
      community: POWER_COMMUNITY,
      latitude: String(lat),
      longitude: String(lon),
      start: fmtDate(start),
      end: fmtDate(end),
      format: 'JSON'
    });
    return POWER_BASE_URL + '?' + params.toString();
  }

  // Turn a raw NASA POWER daily JSON payload into the same shape the engine
  // already expects on agrometeorological_context (precipitation_outlook /
  // temperature_outlook as qualitative labels), by comparing the recent
  // window's averages against illustrative regional norms. This keeps the
  // engine's contract identical between demo and live mode.
  function summarizePower(json, fallbackContext) {
    const props = json && json.properties && json.properties.parameter;
    if (!props) throw new Error('Unexpected NASA POWER response shape');

    const precipSeries = Object.values(props.PRECTOTCORR || {}).filter(function (v) { return typeof v === 'number' && v > -900; });
    const tempSeries = Object.values(props.T2M || {}).filter(function (v) { return typeof v === 'number' && v > -900; });

    if (!precipSeries.length || !tempSeries.length) throw new Error('NASA POWER response had no usable readings');

    const avg = function (arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; };
    const avgPrecipMmDay = avg(precipSeries);
    const avgTempC = avg(tempSeries);

    // Illustrative East-Java lowland reference norms for the "regional
    // baseline" comparison — NOT a rigorous climatology, just enough to
    // classify the live pull as Below/Average/Above so the qualitative
    // labels the rest of the app expects keep working in live mode.
    const PRECIP_NORM_MM_DAY = 4.5;
    const TEMP_NORM_C = 27.5;

    const precipOutlook = avgPrecipMmDay < PRECIP_NORM_MM_DAY * 0.75 ? 'Below-average'
      : (avgPrecipMmDay > PRECIP_NORM_MM_DAY * 1.25 ? 'Above-average' : 'Average');
    const tempOutlook = avgTempC > TEMP_NORM_C + 1 ? 'Above-average'
      : (avgTempC < TEMP_NORM_C - 1 ? 'Below-average' : 'Average');

    return Object.assign({}, fallbackContext, {
      source: 'NASA POWER (live)',
      precipitation_outlook: precipOutlook,
      temperature_outlook: tempOutlook,
      live_avg_precip_mm_day: Math.round(avgPrecipMmDay * 100) / 100,
      live_avg_temp_c: Math.round(avgTempC * 100) / 100,
      fetched_at: new Date().toISOString()
    });
  }

  function fetchWithTimeout(url, ms) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch() is not available in this environment'));
    const controller = (typeof AbortController === 'function') ? new AbortController() : null;
    const timer = setTimeout(function () { if (controller) controller.abort(); }, ms);
    return fetch(url, controller ? { signal: controller.signal } : {})
      .finally(function () { clearTimeout(timer); });
  }

  // Attempt a live NASA POWER pull. ALWAYS resolves (never rejects) — on any
  // failure it records lastFallbackReason and resolves with null, so callers
  // never need a catch block and the UI never blanks or hangs.
  function tryFetchLive() {
    const centroid = window.FS_DATA && window.FS_DATA.field_state &&
      window.FS_DATA.field_state.request_metadata && window.FS_DATA.field_state.request_metadata.centroid;
    if (!centroid) {
      lastFallbackReason = 'No field centroid available to query NASA POWER.';
      return Promise.resolve(null);
    }

    if (typeof window === 'undefined' || (window.location && window.location.protocol === 'file:')) {
      lastFallbackReason = 'Running from file:// — live NASA POWER fetches are blocked by the browser; using demo data.';
      return Promise.resolve(null);
    }

    const url = buildPowerUrl(centroid.lat, centroid.lon);

    return fetchWithTimeout(url, LIVE_FETCH_TIMEOUT_MS)
      .then(function (res) {
        if (!res || !res.ok) throw new Error('NASA POWER responded with HTTP ' + (res && res.status));
        return res.json();
      })
      .then(function (json) {
        const fallbackContext = window.FS_DATA.field_state.agrometeorological_context;
        const overlay = summarizePower(json, fallbackContext);
        lastFallbackReason = null;
        return overlay;
      })
      .catch(function (err) {
        const isAbort = err && (err.name === 'AbortError');
        lastFallbackReason = isAbort
          ? 'NASA POWER request timed out after ' + (LIVE_FETCH_TIMEOUT_MS / 1000) + 's — using demo data.'
          : 'NASA POWER request failed (' + (err && err.message ? err.message : 'unknown error') + ') — using demo data.';
        return null;
      });
  }

  function get(key) {
    const base = window.FS_DATA ? window.FS_DATA[key] : undefined;
    if (key === 'field_state' && mode === 'live' && liveOverlay && base) {
      return Object.assign({}, base, {
        agrometeorological_context: liveOverlay
      });
    }
    return base;
  }

  function getAll() {
    const data = window.FS_DATA || {};
    if (mode !== 'live' || !liveOverlay) return data;
    return Object.assign({}, data, {
      field_state: Object.assign({}, data.field_state, { agrometeorological_context: liveOverlay })
    });
  }

  function setMode(nextMode) {
    if (nextMode !== 'live' && nextMode !== 'demo') return;
    if (nextMode === mode) return;
    mode = nextMode;
    persistMode(mode);

    if (mode === 'live' && !liveOverlay && !livePending) {
      livePending = true;
      tryFetchLive().then(function (overlay) {
        livePending = false;
        if (overlay) liveOverlay = overlay;
        fireChangeEvent({ mode: mode, liveAvailable: !!overlay, fallbackReason: lastFallbackReason });
      });
    } else {
      fireChangeEvent({ mode: mode, liveAvailable: !!liveOverlay, fallbackReason: lastFallbackReason });
    }
  }

  function getMode() {
    return mode;
  }

  // Source-attribution metadata for the UI's "source chip" components.
  const PROVENANCE = {
    crops: { source: 'FieldShift MVP crop parameter table', provider: 'FieldShift (FAO/BPS/Kementan-anchored estimates)', is_nasa: false, resolution: 'n/a', updated: 'n/a' },
    // The agrometeorological slice of field_state only. Kept separate from
    // 'field_state' as a whole because that object ALSO carries
    // live_observation (Copernicus Sentinel-2, ESA — not NASA). Chipping the
    // whole object as NASA would be exactly the misattribution this project
    // forbids: regional/third-party data must never be presented as NASA's.
    agromet: function () {
      return mode === 'live' && liveOverlay
        ? { source: 'NASA POWER (live)', provider: 'NASA Langley Research Center (POWER)', is_nasa: true, resolution: 'point (daily)', updated: liveOverlay.fetched_at }
        : { source: 'NASA POWER & GEOGLAM (demo snapshot)', provider: 'NASA POWER / GEOGLAM', is_nasa: true, resolution: 'point / regional', updated: 'demo snapshot' };
    },
    // The optical-vegetation slice: ESA/Copernicus, explicitly NOT NASA.
    live_observation: { source: 'Copernicus Sentinel-2 L2A', provider: 'ESA / Copernicus', is_nasa: false, resolution: '10m, ~5-day revisit', updated: '2026-09-22' },
    // The aggregate object is mixed-provenance. It must not claim is_nasa.
    // Callers wanting an accurate chip should ask for the specific slice
    // ('agromet', 'live_observation', 'soil') rather than the container.
    field_state: { source: 'Mixed sources — see per-card attribution', provider: 'NASA POWER / GEOGLAM / Copernicus / ISRIC', is_nasa: false, resolution: 'mixed', updated: '2026-09-22' },
    soil: { source: 'SoilGrids (ISRIC) — NOT a NASA source', provider: 'ISRIC — World Soil Information', is_nasa: false, resolution: '250m (SoilGrids 250m v2.0)', updated: '2026-09-22' },
    geoglam: { source: 'GEOGLAM Crop Monitor', provider: 'Group on Earth Observations Global Agricultural Monitoring', is_nasa: false, resolution: 'regional/national', updated: '2026-09' },
    calendar: { source: 'NASA Harvest — Harvest2Market', provider: 'NASA Harvest', is_nasa: true, resolution: 'national, half-month', updated: 'n/a' },
    telemetry: { source: 'FieldShift synthetic IoT telemetry (illustrative)', provider: 'FieldShift', is_nasa: false, resolution: 'node, 30 min', updated: 'n/a' }
  };

  function provenance(key) {
    const entry = PROVENANCE[key];
    if (!entry) return { source: 'Unknown', provider: 'Unknown', is_nasa: false, resolution: 'n/a', updated: 'n/a' };
    return typeof entry === 'function' ? entry() : entry;
  }

  window.FS.data = {
    get: get,
    getAll: getAll,
    setMode: setMode,
    getMode: getMode,
    provenance: provenance,
    get mode() { return mode; },
    set mode(m) { setMode(m); },
    get lastFallbackReason() { return lastFallbackReason; }
  };

  // If starting in live mode (e.g. restored from localStorage), kick off the
  // fetch immediately so the UI doesn't need to toggle mode to trigger it.
  if (mode === 'live') {
    livePending = true;
    tryFetchLive().then(function (overlay) {
      livePending = false;
      if (overlay) liveOverlay = overlay;
      fireChangeEvent({ mode: mode, liveAvailable: !!overlay, fallbackReason: lastFallbackReason });
    });
  }
})();
