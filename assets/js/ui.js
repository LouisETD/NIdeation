// assets/js/ui.js
//
// FieldShift — Interactive prototype UI.
//
// This file ONLY renders and wires controls. It never scores anything itself
// — every number shown comes from window.FS.engine (computeFieldState,
// listScenarios, computeEconomics, computeConfidence, buildPayload) or is a
// plain template of data already returned by the engine/data layer. See
// assets/js/engine.js for the actual decision logic and assets/js/data.js
// for the demo/live data + provenance layer.
//
// Vanilla ES2015+ browser JS, no build step, no modules — must work when
// this page is opened directly via file://.
(function () {
  'use strict';

  if (!window.FS || !window.FS.engine || !window.FS.data) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.insertAdjacentHTML(
        'afterbegin',
        '<div class="callout danger page" style="margin:20px auto">' +
          '<strong>FieldShift could not start.</strong> The data or engine scripts failed to load — check the ' +
          'browser console and the &lt;script&gt; order in app.html.' +
        '</div>'
      );
    });
    return;
  }

  var engine = window.FS.engine;
  var dataApi = window.FS.data;

  // =========================================================================
  // FORMAT HELPERS
  // =========================================================================

  function fmtIdr(n) {
    if (n === undefined || n === null || isNaN(n)) return '—';
    var sign = n < 0 ? '-' : '';
    return sign + 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
  }

  function fmtNum(n) {
    if (n === undefined || n === null || isNaN(n)) return '—';
    return Math.round(n).toLocaleString('en-US');
  }

  function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var PRIORITIES_LIST = ['Save Water', 'Maximize Yield', 'Reduce Climate Risk', 'Improve Soil Health', 'Low Capital'];

  var SCORE_CATEGORIES_ORDER = ['water_demand_suitability', 'soil_health_impact', 'climate_resilience', 'farmer_priority_alignment'];
  var SCORE_LABELS = {
    water_demand_suitability: 'Water demand suitability',
    soil_health_impact: 'Soil health impact',
    climate_resilience: 'Climate resilience',
    farmer_priority_alignment: 'Farmer priority alignment'
  };

  var VERDICT_CLASS = {
    'Highly Recommended': 'rec-high',
    'Viable Alternative': 'rec-mid',
    'Marginal': 'rec-mid',
    'Not Recommended': 'rec-low',
    'Not Feasible': 'rec-low',
    'Risk-adjusted leader': 'rec-high',
    'Feasible alternative': 'rec-mid'
  };

  var TAB_IDS = ['setup', 'state', 'scenarios', 'plan', 'iot', 'stress'];

  var PHASE_COLOR = {
    'Planting-Early Veg': '#d9a441',
    'Vegetative-Repro': '#397a50',
    'Ripening-Harvest': '#235c3a',
    'Harvest': '#76550f',
    'Out of Season': '#eef4e9'
  };

  var FIELD_POLYGON_COORDS = [
    [-7.7466, 112.5965],
    [-7.7462, 112.6032],
    [-7.7508, 112.6041],
    [-7.7531, 112.5998],
    [-7.7515, 112.5958]
  ];

  // =========================================================================
  // STATE
  // =========================================================================

  var defaultFarmer = (window.FS_DATA && window.FS_DATA.field_state && window.FS_DATA.field_state.farmer_input) || {};

  var state = {
    inputs: {
      previous_crop: defaultFarmer.previous_crop || 'Rice',
      irrigation_type: defaultFarmer.irrigation_type || 'Rainfed',
      priorities: (defaultFarmer.priorities || ['Save Water', 'Reduce Climate Risk']).slice(),
      area_ha: defaultFarmer.area_ha || 1,
      capital_available_idr_per_ha: defaultFarmer.capital_available_idr_per_ha || 15000000,
      water_budget_mm: defaultFarmer.water_budget_mm === undefined ? 0 : defaultFarmer.water_budget_mm
    },
    stress: {
      preset: 'normal', rainfall_pct: 100, irrigation_pct: 100, temperature_c: 0,
      price_change_pct: 0, yield_change_pct: 0, week: 7, overlay: 'condition',
      adapted_crop_key: null, playback: false
    },
    telemetryMode: 'realtime',
    _lastFieldState: null,
    _lastScenarios: null,
    _cycleRunning: false
  };

  var els = {};
  var charts = {};
  var leafletMap = null;
  var stressPlaybackTimer = null;

  // =========================================================================
  // SOURCE-CHIP HELPERS
  // =========================================================================

  function chipHtml(source, isNasa, note) {
    return '<span class="source-chip' + (isNasa ? '' : ' non-nasa') + '"' +
      (note ? ' title="' + escapeHtml(note) + '"' : '') + '>' + escapeHtml(source) + '</span>';
  }

  function provenanceChipHtml(key, extraNote) {
    var p = dataApi.provenance(key);
    var note = 'Provider: ' + p.provider + '. Resolution: ' + p.resolution + '. Updated: ' + p.updated + '.' +
      (extraNote ? ' ' + extraNote : '');
    return chipHtml(p.source, p.is_nasa, note);
  }

  // =========================================================================
  // DOM CACHE
  // =========================================================================

  function cacheEls() {
    els.topbar = document.querySelector('.topbar');
    els.appStatusBar = document.getElementById('app-status-bar');
    els.modeToggle = document.getElementById('mode-toggle');
    els.modeToggleLabel = document.getElementById('mode-toggle-label');
    els.confidenceBadge = document.getElementById('confidence-badge');
    els.liveStatusNote = document.getElementById('live-status-note');
    els.fallbackNotice = document.getElementById('fallback-notice');

    els.inputArea = document.getElementById('input-area');
    els.inputPrevCrop = document.getElementById('input-prev-crop');
    els.inputIrrigation = document.getElementById('input-irrigation');
    els.inputCapital = document.getElementById('input-capital');
    els.inputWaterBudget = document.getElementById('input-water-budget');
    els.priorityCheckboxes = document.getElementById('priority-checkboxes');
    els.fieldSummaryLine = document.getElementById('field-summary-line');

    els.cardVegetation = document.getElementById('card-vegetation');
    els.cardClimate = document.getElementById('card-climate');
    els.cardGeoglamBanner = document.getElementById('card-geoglam-banner');
    els.cardSoil = document.getElementById('card-soil');
    els.chartHistoricEl = document.getElementById('chart-historic-condition');
    els.chipGeoglamChart = document.getElementById('chip-geoglam-chart');
    els.cardCalendar = document.getElementById('card-calendar');

    els.scenarioGrid = document.getElementById('scenario-grid');
    els.btnViewPayload = document.getElementById('btn-view-payload');

    els.planContent = document.getElementById('plan-content');

    els.telemetrySourceNote = document.getElementById('telemetry-source-note');
    els.stressSummary = document.getElementById('stress-summary');

    els.payloadModal = document.getElementById('payload-modal');
    els.payloadJson = document.getElementById('payload-json');
    els.btnCopyPayload = document.getElementById('btn-copy-payload');
    els.btnClosePayload = document.getElementById('btn-close-payload');
  }

  function positionAppBar() {
    if (els.topbar && els.appStatusBar) {
      els.appStatusBar.style.top = els.topbar.offsetHeight + 'px';
    }
  }

  // =========================================================================
  // TAB STRIP (accessible: role=tablist, aria-selected, arrow-key nav)
  // =========================================================================

  function wireTabs() {
    var btns = TAB_IDS.map(function (id) { return document.getElementById('tab-btn-' + id); });
    btns.forEach(function (btn, i) {
      btn.addEventListener('click', function () { selectTab(TAB_IDS[i]); });
      btn.addEventListener('keydown', function (e) {
        var newIndex = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') newIndex = (i + 1) % btns.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') newIndex = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') newIndex = 0;
        else if (e.key === 'End') newIndex = btns.length - 1;
        if (newIndex !== null) {
          e.preventDefault();
          selectTab(TAB_IDS[newIndex]);
          btns[newIndex].focus();
        }
      });
    });
  }

  function selectTab(id) {
    if (id !== 'stress') stopStressPlayback();
    TAB_IDS.forEach(function (t) {
      var btn = document.getElementById('tab-btn-' + t);
      var panel = document.getElementById('tab-panel-' + t);
      var selected = t === id;
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
    });
    if (leafletMap) {
      setTimeout(function () { leafletMap.invalidateSize(); }, 60);
    }
    if (id === 'stress' && window.FS.stressView) {
      setTimeout(function () { window.FS.stressView.resize(); }, 60);
    }
  }

  // =========================================================================
  // FIELD SETUP TAB
  // =========================================================================

  function buildFieldSetupControls() {
    els.inputArea.value = state.inputs.area_ha;
    els.inputCapital.value = state.inputs.capital_available_idr_per_ha;
    els.inputWaterBudget.value = state.inputs.water_budget_mm;
    els.inputIrrigation.value = state.inputs.irrigation_type;

    var cropsObj = (window.FS_DATA.crops && window.FS_DATA.crops.crops) || {};
    var names = Object.keys(cropsObj).map(function (k) { return cropsObj[k].name; });
    els.inputPrevCrop.innerHTML = names.map(function (n) {
      return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
    }).join('');
    els.inputPrevCrop.value = state.inputs.previous_crop;

    els.priorityCheckboxes.innerHTML = PRIORITIES_LIST.map(function (p, i) {
      var id = 'priority-' + i;
      var checked = state.inputs.priorities.indexOf(p) !== -1;
      return '<label class="priority-check" for="' + id + '">' +
        '<input type="checkbox" id="' + id + '" value="' + escapeHtml(p) + '"' + (checked ? ' checked' : '') + ' /> ' +
        escapeHtml(p) + '</label>';
    }).join('');
  }

  function wireControls() {
    els.inputArea.addEventListener('input', function () {
      var v = parseFloat(els.inputArea.value);
      state.inputs.area_ha = isNaN(v) || v <= 0 ? state.inputs.area_ha : v;
      renderAll();
    });
    els.inputPrevCrop.addEventListener('change', function () {
      state.inputs.previous_crop = els.inputPrevCrop.value;
      renderAll();
    });
    els.inputIrrigation.addEventListener('change', function () {
      state.inputs.irrigation_type = els.inputIrrigation.value;
      renderAll();
    });
    els.inputCapital.addEventListener('input', function () {
      var v = parseFloat(els.inputCapital.value);
      state.inputs.capital_available_idr_per_ha = isNaN(v) || v < 0 ? 0 : v;
      renderAll();
    });
    els.inputWaterBudget.addEventListener('input', function () {
      var v = parseFloat(els.inputWaterBudget.value);
      state.inputs.water_budget_mm = isNaN(v) || v < 0 ? 0 : Math.min(1600, v);
      renderAll();
    });
    els.priorityCheckboxes.addEventListener('change', function () {
      var checked = Array.prototype.slice.call(els.priorityCheckboxes.querySelectorAll('input[type="checkbox"]:checked'));
      state.inputs.priorities = checked.map(function (c) { return c.value; });
      renderAll();
    });
  }

  function renderFieldSummary(fieldState) {
    var f = fieldState.farmer_input;
    els.fieldSummaryLine.textContent = 'Previous crop: ' + f.previous_crop + ' · Irrigation: ' + f.irrigation_type +
      ' · Area: ' + f.area_ha + ' ha · Capital: ' + fmtIdr(f.capital_available_idr_per_ha) + '/ha · Irrigation budget: ' + fmtNum(f.water_budget_mm) + ' mm · Priorities: ' +
      (f.priorities && f.priorities.length ? f.priorities.join(', ') : 'none selected');
  }

  // --- Leaflet map, with graceful offline/tile-failure fallback -----------

  function initMap() {
    var mapEl = document.getElementById('field-map');
    if (!mapEl) return;
    var centroid = (window.FS_DATA.field_state.request_metadata || {}).centroid || { lat: -7.75, lon: 112.6 };

    if (typeof L === 'undefined') {
      renderMapFallback(mapEl, centroid,
        'The Leaflet mapping library could not be loaded from the CDN (offline, or opened via file:// without ' +
        'network access). Showing the field boundary as a static diagram instead.');
      return;
    }

    try {
      leafletMap = L.map(mapEl, { scrollWheelZoom: false }).setView([centroid.lat, centroid.lon], 15);
      var tileFailCount = 0;
      var tileNoteShown = false;
      var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      });
      tiles.on('tileerror', function () {
        tileFailCount++;
        if (tileFailCount >= 4 && !tileNoteShown) {
          tileNoteShown = true;
          mapEl.style.background = 'linear-gradient(160deg, #dfe9da, #cfe0cc)';
          var note = document.getElementById('map-note');
          if (note) {
            note.textContent = 'Map tiles could not be loaded (offline, or the tile CDN is blocked) — showing ' +
              'the field boundary over a plain background instead of satellite/street imagery.';
          }
        }
      });
      tiles.addTo(leafletMap);

      var poly = L.polygon(FIELD_POLYGON_COORDS, { color: '#235c3a', weight: 2, fillColor: '#397a50', fillOpacity: 0.35 }).addTo(leafletMap);
      poly.bindPopup('Field poly_idn_jt_001<br>Illustrative boundary — exact survey geometry is not part of the published dataset.');
      leafletMap.fitBounds(poly.getBounds(), { padding: [40, 40] });
    } catch (e) {
      renderMapFallback(mapEl, centroid,
        'The map could not be initialised (' + (e && e.message ? e.message : 'unknown error') +
        '). Showing the field boundary as a static diagram instead.');
    }
  }

  function renderMapFallback(mapEl, centroid, note) {
    mapEl.outerHTML =
      '<div class="map-fallback" id="field-map">' +
        '<svg viewBox="0 0 200 140" width="180" height="126" role="img" aria-label="Illustrative field boundary">' +
          '<polygon points="40,20 160,30 150,100 60,110 30,60" fill="#397a50" fill-opacity="0.45" stroke="#235c3a" stroke-width="3" />' +
        '</svg>' +
        '<strong>poly_idn_jt_001</strong>' +
        '<span class="muted" style="font-size:13px">Centroid: ' + centroid.lat + ', ' + centroid.lon + ' — Jawa Timur, Indonesia</span>' +
      '</div>';
    var mapNote = document.getElementById('map-note');
    if (mapNote) mapNote.textContent = note;
  }

  // =========================================================================
  // MODE TOGGLE + STATUS BAR (confidence badge, fallback notice)
  // =========================================================================

  function wireModeToggle() {
    var mode = dataApi.getMode();
    els.modeToggle.checked = mode === 'live';
    els.modeToggleLabel.textContent = mode === 'live' ? 'Live data' : 'Demo data';
    els.modeToggle.addEventListener('change', function () {
      var next = els.modeToggle.checked ? 'live' : 'demo';
      dataApi.setMode(next);
      els.modeToggleLabel.textContent = next === 'live' ? 'Live data' : 'Demo data';
      els.liveStatusNote.textContent = next === 'live' ? 'Fetching NASA POWER…' : '';
    });
  }

  function onDataChange() {
    els.liveStatusNote.textContent = '';
    renderAll();
  }

  function renderStatusBar(confidence) {
    var label = confidence.label;
    var cls = label === 'High' ? 'badge-ok' : (label === 'Medium' ? 'badge-warn' : 'badge-bad');
    els.confidenceBadge.className = 'badge ' + cls;
    els.confidenceBadge.textContent = 'Confidence: ' + label + ' (' + Math.round(confidence.score * 100) + '%)';
    els.confidenceBadge.title = confidence.reasons.join(' ');

    var mode = dataApi.getMode();
    var reason = dataApi.lastFallbackReason;
    if (mode === 'live' && reason) {
      els.fallbackNotice.hidden = false;
      els.fallbackNotice.innerHTML = '<strong>Live data unavailable:</strong> ' + escapeHtml(reason);
    } else {
      els.fallbackNotice.hidden = true;
    }
  }

  // =========================================================================
  // FIELD STATE TAB
  // =========================================================================

  function gaugeHtml(frac, rawLabel, unitLabel) {
    return '<div class="gauge-item"><div class="gauge" style="--gauge-value:' + frac + '">' +
      '<div class="gauge-label">' + escapeHtml(rawLabel) + '<span>' + escapeHtml(unitLabel) + '</span></div>' +
      '</div></div>';
  }

  function renderVegetationCard(fieldState) {
    var lo = fieldState.live_observation;
    var ndviFrac = clamp01((lo.ndvi_current + 1) / 2);
    var ndwiFrac = clamp01((lo.ndwi_current + 1) / 2);
    els.cardVegetation.innerHTML =
      '<div class="fs-card-head"><h3 style="margin:0">Vegetation (optical satellite)</h3></div>' +
      '<div class="gauge-row">' +
        gaugeHtml(ndviFrac, lo.ndvi_current.toFixed(2), 'NDVI') +
        gaugeHtml(ndwiFrac, lo.ndwi_current.toFixed(2), 'NDWI') +
        '<div><div class="vegetation-status">' + escapeHtml(lo.vegetation_status) + '</div>' +
        '<div class="muted" style="font-size:12px">Current live-observation trend</div></div>' +
      '</div>' +
      '<div class="resolution-note">' +
        chipHtml(lo.source, false,
          'Copernicus Sentinel-2 is an ESA/Copernicus program, not a NASA source. Optical imagery is a periodic ' +
          'revisit snapshot, not continuous in-field monitoring.') +
        '<br>Field-level optical snapshot at the field centroid — not a continuous or ground-truthed measurement.' +
      '</div>';
  }

  function renderClimateCard(fieldState) {
    var am = fieldState.agrometeorological_context;
    var liveBits = '';
    if (am.live_avg_precip_mm_day !== undefined) {
      liveBits = '<p class="muted" style="font-size:12px">Live 14-day average: ' + am.live_avg_precip_mm_day +
        ' mm/day precipitation, ' + am.live_avg_temp_c + '&deg;C. Fetched ' + escapeHtml(am.fetched_at || '') + '.</p>';
    }
    els.cardClimate.innerHTML =
      '<div class="fs-card-head"><h3 style="margin:0">Climate outlook</h3></div>' +
      '<table class="econ-table"><tbody>' +
        '<tr><td>Precipitation outlook</td><td>' + escapeHtml(am.precipitation_outlook) + '</td></tr>' +
        '<tr><td>Temperature outlook</td><td>' + escapeHtml(am.temperature_outlook) + '</td></tr>' +
        '<tr><td>Season / calendar phase</td><td>' + escapeHtml(am.current_season_calendar) + '</td></tr>' +
      '</tbody></table>' +
      liveBits +
      '<div class="resolution-note">' +
        provenanceChipHtml('agromet', 'A country/regional outlook — not an in-field weather station reading.') +
      '</div>';
  }

  function renderGeoglamBanner(data) {
    var g = data.geoglam;
    var crops = g.early_warning.crops;
    var tagsHtml = Object.keys(crops).map(function (k) {
      var c = crops[k];
      var warn = !/favourable/i.test(c.status);
      return '<span class="tag' + (warn ? ' warn' : '') + '">' + escapeHtml(k) + ': ' + escapeHtml(c.status) + '</span>';
    }).join(' ');
    els.cardGeoglamBanner.innerHTML =
      '<strong>' + escapeHtml(g.early_warning.bulletin) + ' (' + escapeHtml(g.early_warning.date) + ')</strong> — ' +
      escapeHtml(g.outlook.warning_text) +
      '<div style="margin-top:8px">' + tagsHtml + '</div>' +
      '<div class="resolution-note">' +
        provenanceChipHtml('geoglam', 'Country-level composite signal — local field conditions may differ.') +
      '</div>';
  }

  function renderSoilCard(fieldState, data) {
    var sc = fieldState.soil_chemistry;
    var soil = data.soil;
    els.cardSoil.innerHTML =
      '<div class="fs-card-head"><h3 style="margin:0">Soil chemistry</h3></div>' +
      '<table class="econ-table"><tbody>' +
        '<tr><td>pH</td><td>' + sc.pH + ' — ' + escapeHtml(soil.properties.ph.label) + '</td></tr>' +
        '<tr><td>Organic carbon</td><td>' + sc.organic_carbon_pct + '% — ' + escapeHtml(soil.properties.organic_carbon.label) + '</td></tr>' +
        '<tr><td>Water retention</td><td>' + escapeHtml(sc.water_retention) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="resolution-note">' +
        provenanceChipHtml('soil') + '<br>' + escapeHtml(soil.resolution_note) +
      '</div>';
  }

  function currentCalendarIndex(calendar) {
    var now = new Date();
    var idx = now.getMonth() * 2 + (now.getDate() >= 15 ? 1 : 0);
    return Math.max(0, Math.min(calendar.rows.length - 1, idx));
  }

  function renderCalendarCard(data) {
    var cal = data.calendar;
    var curIdx = currentCalendarIndex(cal);
    var trackLabels = {
      rice_wet_season: 'Rice (wet season)',
      rice_dry_season: 'Rice (dry season)',
      maize_rainy_season: 'Maize (rainy season)',
      maize_dry_season: 'Maize (dry season)'
    };

    var header = '<div class="calendar-header-row"><div></div>' +
      cal.rows.map(function (r, i) {
        return '<div class="calendar-header-cell">' + (i % 2 === 0 ? escapeHtml(r.period.split(' ')[0]) : '') + '</div>';
      }).join('') +
    '</div>';

    var body = cal.tracks.map(function (track) {
      var cells = cal.rows.map(function (row, i) {
        var phase = row[track];
        return '<div class="calendar-cell' + (i === curIdx ? ' is-current' : '') + '" data-phase="' +
          escapeHtml(phase) + '" title="' + escapeHtml(row.period) + ': ' + escapeHtml(phase) + '"></div>';
      }).join('');
      return '<div class="calendar-track-row"><div class="calendar-track-label">' +
        escapeHtml(trackLabels[track] || track) + '</div>' + cells + '</div>';
    }).join('');

    var legend = Object.keys(PHASE_COLOR).map(function (p) {
      return '<span><i style="width:12px;height:12px;border-radius:3px;display:inline-block;background:' +
        PHASE_COLOR[p] + '"></i>' + escapeHtml(p) + '</span>';
    }).join('');

    els.cardCalendar.innerHTML =
      '<div class="fs-card-head"><h3 style="margin:0">Crop calendar (24 half-months)</h3>' +
      '<span class="muted" style="font-size:12px">Highlighted column = current half-month (' +
      escapeHtml(cal.rows[curIdx].period) + ')</span></div>' +
      '<div class="calendar-strip-wrap">' + header + body + '</div>' +
      '<div class="calendar-legend">' + legend + '</div>' +
      '<div class="resolution-note">' +
        provenanceChipHtml('calendar', 'National-level calendar — exact local planting dates vary by micro-climate and variety.') +
      '</div>';
  }

  function historicTableFallback(rows) {
    return '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Failure%</th><th>Poor%</th><th>Watch%</th>' +
      '<th>Favourable%</th><th>Exceptional%</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + r.date + '</td><td>' + r.failure + '</td><td>' + r.poor + '</td><td>' + r.watch +
          '</td><td>' + r.favourable + '</td><td>' + r.exceptional + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderHistoricChart(data) {
    els.chipGeoglamChart.innerHTML = provenanceChipHtml('geoglam');
    if (typeof Chart === 'undefined') {
      els.chartHistoricEl.parentElement.innerHTML =
        '<p class="muted">Chart.js failed to load from the CDN — showing the historic condition table instead.</p>' +
        historicTableFallback(data.geoglam.historic_condition);
      return;
    }
    var rows = data.geoglam.historic_condition.slice().reverse();
    var labels = rows.map(function (r) { return r.date; });
    function ds(key, color, label) {
      return { label: label, data: rows.map(function (r) { return r[key]; }), backgroundColor: color, stack: 's' };
    }
    charts.historic = new Chart(els.chartHistoricEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          ds('failure', '#9d3f35', 'Failure'),
          ds('poor', '#d9a441', 'Poor'),
          ds('watch', '#f3cc79', 'Watch'),
          ds('favourable', '#397a50', 'Favourable'),
          ds('exceptional', '#235c3a', 'Exceptional')
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { maxRotation: 60, minRotation: 60, font: { size: 10 } } },
          y: { stacked: true, max: 100 }
        },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  function renderFieldState(fieldState, data) {
    renderVegetationCard(fieldState);
    renderClimateCard(fieldState);
    renderGeoglamBanner(data);
    renderSoilCard(fieldState, data);
    renderCalendarCard(data);
  }

  // =========================================================================
  // SCENARIOS TAB
  // =========================================================================

  function renderScenarioCard(s, cropsObj) {
    var key = engine._internal.cropKeyForName(cropsObj, s.rotation_plan[1]);
    var cropDef = key ? cropsObj[key] : null;
    var verdictClass = VERDICT_CLASS[s.verdict] || 'rec-mid';

    var head =
      '<div class="scenario-head">' +
        '<div><div class="scenario-id">Scenario ' + escapeHtml(s.scenario_id) + '</div>' +
        '<div class="scenario-rotation">' + escapeHtml(s.rotation_plan[0]) + ' &rarr; ' + escapeHtml(s.rotation_plan[1]) + '</div></div>' +
        '<span class="verdict-pill ' + verdictClass + '">' + escapeHtml(s.verdict) + '</span>' +
      '</div>';

    if (!s.feasible) {
      return '<div class="card scenario-card is-infeasible">' + head +
        '<p class="trade-off"><strong>Not feasible under the current inputs:</strong></p>' +
        '<ul class="gate-list">' + s.gate_failures.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    }

    var scoreBars = SCORE_CATEGORIES_ORDER.map(function (cat) {
      var v = s.scores[cat];
      return '<div class="score-bar-row">' +
        '<div class="score-bar-label"><span>' + SCORE_LABELS[cat] + '</span><span>' + v + '</span></div>' +
        '<div class="gauge bar" style="--gauge-value:' + (v / 100) + '"><span></span></div>' +
      '</div>';
    }).join('');

    var econ = s.economics;
    var econRows =
      '<tr><td>Predicted yield</td><td>' + econ.predicted_yield_t_ha + ' t/ha</td></tr>' +
      (cropDef ? '<tr><td>Farm-gate price</td><td>' + fmtIdr(cropDef.farm_gate_price_idr_per_kg) + '/kg</td></tr>' +
        '<tr><td>Variable cost</td><td>' + fmtIdr(cropDef.variable_cost_idr_per_ha) + '/ha</td></tr>' : '') +
      '<tr><td>Break-even price</td><td>' + fmtIdr(econ.break_even_price_idr_per_kg) + '/kg</td></tr>';

    var id = s.scenario_id;

    return '<div class="card scenario-card" data-scenario-id="' + escapeHtml(id) + '">' + head +
      '<div class="score-bars">' + scoreBars + '</div>' +
      '<div class="scenario-total">Risk-adjusted margin: ' + fmtIdr(s.economics.risk_adjusted_margin_idr_per_ha) + '/ha · Agronomic fit: ' + s.total + '/100</div>' +
      '<p class="trade-off">' + escapeHtml(s.trade_off_analysis) + '</p>' +
      '<table class="econ-table"><tbody>' + econRows + '</tbody></table>' +
      '<div class="margin-range">' +
        '<span>Downside case: ' + fmtIdr(econ.downside_margin_idr_per_ha) + '</span>' +
        '<span>Expected: ' + fmtIdr(econ.expected_net_margin_idr_per_ha.expected) + '</span>' +
        '<span>Risk reserve: ' + fmtIdr(econ.risk_reserve_idr_per_ha) + '</span>' +
      '</div>' +
      '<div class="price-slider-row">' +
        '<label for="price-slider-' + escapeHtml(id) + '">Price sensitivity: <span class="price-slider-readout" id="price-out-' + escapeHtml(id) + '-delta">0%</span></label>' +
        '<input type="range" id="price-slider-' + escapeHtml(id) + '" min="-30" max="30" step="1" value="0" data-scenario-id="' + escapeHtml(id) + '" aria-label="Price sensitivity for scenario ' + escapeHtml(id) + '" />' +
        '<div class="price-slider-readout" id="price-out-' + escapeHtml(id) + '">Net margin at 0% price change: ' + fmtIdr(econ.expected_net_margin_idr_per_ha.expected) + '/ha</div>' +
      '</div>' +
    '</div>';
  }

  function renderScenarios(scenarios, data) {
    var cropsObj = data.crops.crops;
    els.scenarioGrid.innerHTML = scenarios.map(function (s) { return renderScenarioCard(s, cropsObj); }).join('');
  }

  function cropKeyForDisplayName(crops, name) {
    return Object.keys(crops).find(function (key) { return crops[key].name === name; }) || null;
  }

  function cropLabel(crop) {
    return crop ? crop.name : 'Crop unavailable';
  }

  function renderStressResult(label, crop, result) {
    var riskClass = result.risk_index >= 55 ? 'high' : result.risk_index >= 25 ? 'moderate' : 'low';
    return '<article class="card stress-result-card">' +
      '<div class="stress-result-top"><div><div class="section-kicker">' + escapeHtml(label) + '</div><h3>' + escapeHtml(cropLabel(crop)) + '</h3></div>' +
      '<span class="stress-risk-pill risk-' + riskClass + '">' + escapeHtml(result.risk_label) + ' stress</span></div>' +
      '<dl class="stress-result-metrics">' +
      '<div><dt>Plant condition index</dt><dd>' + result.plant_condition_index + '<small> / 100</small></dd></div>' +
      '<div><dt>Water stress</dt><dd>' + result.water_stress_pct + '<small> / 100</small></dd></div>' +
      '<div><dt>Heat stress</dt><dd>' + result.heat_stress_pct + '<small> / 100</small></dd></div>' +
      '<div><dt>Leading pressure</dt><dd>' + escapeHtml(result.leading_driver) + '</dd></div>' +
      '</dl></article>';
  }

  function renderStressLab(data) {
    var crops = data.crops.crops;
    var scenarios = state._lastScenarios || engine.listScenarios(state.inputs, data);
    var baselineScenario = scenarios.find(function (scenario) { return scenario.feasible; }) || scenarios[0];
    var hasFeasibleBaseline = !!(baselineScenario && baselineScenario.feasible);
    var baselineKey = baselineScenario ? cropKeyForDisplayName(crops, baselineScenario.rotation_plan[1]) : null;
    if (!baselineKey) baselineKey = cropKeyForDisplayName(crops, state.inputs.previous_crop) || Object.keys(crops)[0];

    var alternativeSelect = document.getElementById('stress-adapted-crop');
    var baselineCrop = crops[baselineKey];
    var alternateKeys = Object.keys(crops).filter(function (key) { return key !== baselineKey; });
    var bestAlternative = scenarios.find(function (scenario) {
      return scenario.feasible && scenario.rotation_plan[1] !== baselineCrop.name;
    });
    var suggestedKey = bestAlternative ? cropKeyForDisplayName(crops, bestAlternative.rotation_plan[1]) : null;
    if (!suggestedKey || suggestedKey === baselineKey) {
      suggestedKey = alternateKeys.slice().sort(function (a, b) {
        return crops[a].water_requirement_mm - crops[b].water_requirement_mm;
      })[0];
    }
    if (alternateKeys.indexOf(state.stress.adapted_crop_key) === -1) state.stress.adapted_crop_key = suggestedKey;
    alternativeSelect.innerHTML = alternateKeys.map(function (key) {
      return '<option value="' + escapeHtml(key) + '">' + escapeHtml(crops[key].name) + '</option>';
    }).join('');
    alternativeSelect.value = state.stress.adapted_crop_key;
    var adaptedCrop = crops[state.stress.adapted_crop_key] || crops[suggestedKey];

    var preset = engine.stressLabPresets[state.stress.preset] || { label: 'Custom case' };
    document.querySelectorAll('[data-stress]').forEach(function (button) {
      var active = button.getAttribute('data-stress') === state.stress.preset;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    ['rainfall_pct', 'irrigation_pct', 'temperature_c', 'price_change_pct', 'yield_change_pct'].forEach(function (key) {
      var input = document.querySelector('[data-stress-input="' + key + '"]');
      input.value = state.stress[key];
    });
    document.getElementById('stress-rainfall-value').textContent = state.stress.rainfall_pct + '%';
    document.getElementById('stress-irrigation-value').textContent = state.stress.irrigation_pct + '%';
    document.getElementById('stress-temperature-value').textContent = '+' + Number(state.stress.temperature_c).toFixed(1).replace('.0', '') + '°C';
    document.getElementById('stress-price-value').textContent = (state.stress.price_change_pct > 0 ? '+' : '') + state.stress.price_change_pct + '%';
    document.getElementById('stress-yield-value').textContent = (state.stress.yield_change_pct > 0 ? '+' : '') + state.stress.yield_change_pct + '%';
    document.getElementById('stress-week').value = state.stress.week;
    document.getElementById('stress-week-label').textContent = 'Week ' + state.stress.week + ' · ' + (state.stress.week <= 3 ? 'establishment' : state.stress.week <= 6 ? 'canopy growth' : state.stress.week <= 9 ? 'reproductive stage' : 'grain fill and harvest');
    var playButton = document.getElementById('stress-play');
    playButton.textContent = state.stress.playback ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', state.stress.playback ? 'Pause season replay' : 'Play season replay');
    document.querySelectorAll('[data-stress-overlay]').forEach(function (button) {
      var active = button.getAttribute('data-stress-overlay') === state.stress.overlay;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    var config = Object.assign({}, state.stress, { week: state.stress.week });
    var baseline = engine.simulatePlantStress(baselineCrop, config);
    var adapted = engine.simulatePlantStress(adaptedCrop, config);
    var baselineLabel = hasFeasibleBaseline ? 'Plan baseline' : 'Candidate · no feasible plan';
    document.getElementById('stress-scene-title').textContent = hasFeasibleBaseline ? 'Plan baseline vs one crop change' : 'Candidate crop stress comparison';
    document.getElementById('stress-baseline-label').textContent = baselineLabel + ' · ' + baselineCrop.name;
    document.getElementById('stress-adapted-label').textContent = 'One-crop change · ' + adaptedCrop.name;
    var caseLabel = preset.label === 'Custom case' ? preset.label : preset.label + ' case';
    els.stressSummary.textContent = (hasFeasibleBaseline ? '' : 'No crop currently clears plan gates; models below are candidates only. ') +
      caseLabel + ' · rainfall ' + state.stress.rainfall_pct + '% · irrigation ' +
      state.stress.irrigation_pct + '% · +' + state.stress.temperature_c + '°C · week ' + state.stress.week +
      '. Plant indices and risk bands are illustrative, not local measurements or a yield forecast.';

    var reserveIndex = Math.min(baseline.water_reserve_index, adapted.water_reserve_index);
    var reserveLabel = reserveIndex >= 85 ? 'Buffered' : reserveIndex >= 65 ? 'Tight' : 'Low';
    var marketLabel = state.stress.price_change_pct <= -20 ? 'Price headwind' : state.stress.price_change_pct < 0 ? 'Softer price assumption' : state.stress.price_change_pct > 0 ? 'Price tailwind' : 'Price unchanged';
    var harvestLabel = state.stress.yield_change_pct <= -10 ? 'Lower harvest assumption' : state.stress.yield_change_pct >= 10 ? 'Higher harvest assumption' : 'Harvest near baseline';
    document.getElementById('stress-results').innerHTML =
      renderStressResult(baselineLabel, baselineCrop, baseline) + renderStressResult('One-crop change', adaptedCrop, adapted) +
      '<article class="card stress-context-card"><div><span>Water reserve</span><b>' + reserveLabel + ' · ' + reserveIndex + '/100</b><small>Illustrative field-resource index</small></div>' +
      '<div><span>Profitability context</span><b>' + marketLabel + '</b><small>Price assumption only; no revenue or margin calculated</small></div>' +
      '<div><span>Harvest scenario</span><b>' + harvestLabel + ' · ' + (state.stress.yield_change_pct > 0 ? '+' : '') + state.stress.yield_change_pct + '%</b><small>Explicit user assumption; climate does not set harvest</small></div></article>';

    if (window.FS.stressView) {
      window.FS.stressView.update({
        baselineKey: baselineKey,
        adaptedKey: state.stress.adapted_crop_key,
        baselineName: baselineCrop.name,
        adaptedName: adaptedCrop.name,
        baseline: baseline,
        adapted: adapted,
        overlay: state.stress.overlay,
        harvestChangePct: state.stress.yield_change_pct
      });
    }
  }

  function stopStressPlayback() {
    if (stressPlaybackTimer) window.clearInterval(stressPlaybackTimer);
    stressPlaybackTimer = null;
    state.stress.playback = false;
    var button = document.getElementById('stress-play');
    if (button) {
      button.textContent = 'Play';
      button.setAttribute('aria-label', 'Play season replay');
    }
  }

  function wireStressLab() {
    document.querySelectorAll('[data-stress]').forEach(function (button) {
      button.addEventListener('click', function () {
        stopStressPlayback();
        var presetKey = button.getAttribute('data-stress');
        state.stress.preset = presetKey;
        Object.assign(state.stress, engine.stressLabPresets[presetKey]);
        renderAll();
      });
    });
    document.querySelectorAll('[data-stress-input]').forEach(function (input) {
      input.addEventListener('input', function () {
        stopStressPlayback();
        state.stress[input.getAttribute('data-stress-input')] = Number(input.value);
        state.stress.preset = 'custom';
        renderAll();
      });
    });
    document.getElementById('stress-adapted-crop').addEventListener('change', function (event) {
      stopStressPlayback();
      state.stress.adapted_crop_key = event.target.value;
      renderAll();
    });
    document.getElementById('stress-week').addEventListener('input', function (event) {
      stopStressPlayback();
      state.stress.week = Number(event.target.value);
      renderAll();
    });
    document.getElementById('stress-play').addEventListener('click', function () {
      if (stressPlaybackTimer) {
        stopStressPlayback();
        renderStressLab(dataApi.getAll());
        return;
      }
      if (state.stress.week >= 12) state.stress.week = 1;
      state.stress.playback = true;
      renderStressLab(dataApi.getAll());
      stressPlaybackTimer = window.setInterval(function () {
        state.stress.week += 1;
        if (state.stress.week >= 12) stopStressPlayback();
        renderStressLab(dataApi.getAll());
      }, 800);
    });
    document.querySelectorAll('[data-stress-overlay]').forEach(function (button) {
      button.addEventListener('click', function () {
        stopStressPlayback();
        state.stress.overlay = button.getAttribute('data-stress-overlay');
        renderAll();
      });
    });
    document.querySelectorAll('[data-telemetry-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.telemetryMode = button.getAttribute('data-telemetry-mode');
        renderTelemetryCharts();
      });
    });
  }

  function wireScenarioSliderDelegation() {
    els.scenarioGrid.addEventListener('input', function (e) {
      var target = e.target;
      if (target && target.matches && target.matches('input[type="range"][data-scenario-id]')) {
        var id = target.getAttribute('data-scenario-id');
        var delta = parseInt(target.value, 10);
        var scenario = (state._lastScenarios || []).find(function (s) { return s.scenario_id === id; });
        if (!scenario || !scenario.feasible || !scenario.economics) return;
        var margin = scenario.economics.priceSensitivity(delta);
        var deltaEl = document.getElementById('price-out-' + id + '-delta');
        var outEl = document.getElementById('price-out-' + id);
        var sign = delta > 0 ? '+' : '';
        if (deltaEl) deltaEl.textContent = sign + delta + '%';
        if (outEl) outEl.textContent = 'Net margin at ' + sign + delta + '% price change: ' + fmtIdr(margin) + '/ha';
      }
    });
  }

  // --- Payload modal --------------------------------------------------------

  function wirePayloadModal() {
    els.btnViewPayload.addEventListener('click', function () {
      var payload = engine.buildPayload(state.inputs, dataApi.getAll());
      els.payloadJson.textContent = JSON.stringify(payload, null, 2);
      els.payloadModal.hidden = false;
      els.btnClosePayload.focus();
    });
    els.btnClosePayload.addEventListener('click', closePayloadModal);
    els.payloadModal.addEventListener('click', function (e) {
      if (e.target === els.payloadModal) closePayloadModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.payloadModal.hidden) closePayloadModal();
    });
    els.btnCopyPayload.addEventListener('click', function () {
      var text = els.payloadJson.textContent;
      function done() {
        els.btnCopyPayload.textContent = 'Copied!';
        els.btnCopyPayload.classList.add('copied');
        setTimeout(function () {
          els.btnCopyPayload.textContent = 'Copy JSON';
          els.btnCopyPayload.classList.remove('copied');
        }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function closePayloadModal() {
    els.payloadModal.hidden = true;
    els.btnViewPayload.focus();
  }

  // =========================================================================
  // ACTION PLAN TAB
  // =========================================================================

  function renderActionPlan(scenarios, fieldState, data) {
    var feasible = scenarios.filter(function (s) { return s.feasible; });
    if (!feasible.length) {
      els.planContent.innerHTML =
        '<div class="card no-winner"><p>No feasible scenario under the current inputs — every rotation option is ' +
        'gated out. Adjust irrigation type, capital, or area on the Field Setup tab.</p></div>';
      return;
    }
    var winner = feasible.slice().sort(function (a, b) { return b.total - a.total; })[0];
    var cropsObj = data.crops.crops;
    var key = engine._internal.cropKeyForName(cropsObj, winner.rotation_plan[1]);
    var cropDef = Object.assign({ key: key }, cropsObj[key]);
    var irrigation = fieldState.farmer_input.irrigation_type;
    var irr = engine._internal.IRRIGATION[irrigation] || engine._internal.IRRIGATION.Rainfed;

    var plantingRows = [];
    cropDef.calendar_track.forEach(function (track) {
      data.calendar.rows.forEach(function (row) {
        if (row[track] === 'Planting-Early Veg') plantingRows.push(row.period);
      });
    });
    var uniquePlanting = plantingRows.filter(function (p, i) { return plantingRows.indexOf(p) === i; });

    var phases = [
      { name: 'Establishment', shareWater: 0.30, moistureTarget: '25–30% VWC at 15cm' },
      { name: 'Vegetative / Reproductive', shareWater: 0.50, moistureTarget: '20–25% VWC at 15cm; check local calibration' },
      { name: 'Ripening', shareWater: 0.20, moistureTarget: '15–20% VWC, allow gradual dry-down' }
    ];
    var phaseRows = phases.map(function (p) {
      var capMm = Math.round(cropDef.water_requirement_mm * p.shareWater);
      var capLitersHa = capMm * 10000; // 1mm over 1ha = 10,000 L
      return '<tr><td>' + p.name + '</td><td>' + p.moistureTarget + '</td>' +
        '<td>&le; ' + capMm + ' mm (&asymp; ' + fmtNum(capLitersHa) + ' L/ha) via ' + escapeHtml(irrigation) + '</td></tr>';
    }).join('');

    var cycleDays = cropDef.cycle_days;
    var milestones = [
      { day: 0, label: 'Planting' },
      { day: Math.round(cycleDays * 0.25), label: 'Early vegetative check — confirm emergence and soil moisture' },
      { day: Math.round(cycleDays * 0.5), label: 'Flowering / reproductive stage check — highest water sensitivity' },
      { day: Math.round(cycleDays * 0.85), label: 'Pre-harvest check — begin dry-down' },
      { day: cycleDays, label: 'Harvest window' }
    ];

    var precip = fieldState.agrometeorological_context.precipitation_outlook;
    var temp = fieldState.agrometeorological_context.temperature_outlook;
    var riskAlerts = [];
    if (precip === 'Below-average') {
      riskAlerts.push('Early dry-spell risk: GEOGLAM projects below-average rainfall this season. Prioritise the ' +
        'Establishment-phase moisture target above — a dry start is the single biggest threat to ' +
        cropDef.name.toLowerCase() + ' under ' + irrigation + ' irrigation.');
    }
    if (temp === 'Above-average') {
      riskAlerts.push('Heat stress risk: an above-average temperature outlook can accelerate crop water demand and ' +
        'evapotranspiration — check soil moisture more frequently during hot spells.');
    }

    var supportGaps = [
      'Seed access: confirm a reliable local supply of certified ' + cropDef.name.toLowerCase() + ' seed for the recommended planting window.',
      'Soil test: the pH/organic-carbon figures used here are a ~250m regional SoilGrids estimate, not a plot-level test — a physical soil test for this specific field would sharpen the recommendation.',
      'Sensor loan: the field shows a declining/drying vegetation trend with no in-field moisture sensor yet deployed — a loaner soil-moisture node would let this plan be verified against real conditions.',
      cropDef.name + ' carries a market price volatility of ' + Math.round(cropDef.market_price_volatility * 100) +
        '% — a pre-arranged buyer or off-take link would reduce the farmer\'s exposure to price swings.'
    ];

    els.planContent.innerHTML =
      '<div class="card" style="margin-bottom:18px">' +
        '<div class="fs-card-head"><h3 style="margin:0">Winning scenario: ' + escapeHtml(winner.rotation_plan[0]) +
        ' &rarr; ' + escapeHtml(winner.rotation_plan[1]) + '</h3>' +
        '<span class="verdict-pill ' + (VERDICT_CLASS[winner.verdict] || 'rec-mid') + '">' + escapeHtml(winner.verdict) + '</span></div>' +
        '<p class="muted">Weighted total ' + winner.total + '/100. Planting window: ' +
        (uniquePlanting.length ? escapeHtml(uniquePlanting.join(', ')) : 'not found in the sourced calendar') + '.</p>' +
      '</div>' +
      '<div class="card" style="margin-bottom:18px">' +
        '<h3 style="margin-top:0">Phase-by-phase soil-moisture targets &amp; irrigation caps</h3>' +
        '<div class="table-wrap"><table class="plan-phase-table"><thead><tr><th>Phase</th><th>Soil-moisture target</th>' +
        '<th>Irrigation volume cap</th></tr></thead><tbody>' + phaseRows + '</tbody></table></div>' +
        '<p class="muted" style="font-size:12px;margin-top:8px">Illustrative operational guidance derived from ' +
        cropDef.name + '\'s documented seasonal water requirement (' + cropDef.water_requirement_mm +
        'mm) split across three growth phases — not independently agronomically validated.</p>' +
      '</div>' +
      '<div class="grid-2" style="margin-bottom:18px">' +
        '<div class="card"><h3 style="margin-top:0">Inspection milestones</h3><ul class="milestone-list">' +
          milestones.map(function (m) { return '<li><strong>Day ' + m.day + ':</strong> ' + escapeHtml(m.label) + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="card"><h3 style="margin-top:0">Risk alerts</h3>' +
          (riskAlerts.length
            ? riskAlerts.map(function (r) { return '<div class="callout danger" style="margin-top:0;margin-bottom:10px">' + escapeHtml(r) + '</div>'; }).join('')
            : '<p class="muted">No elevated climate risk flagged for this outlook.</p>') +
        '</div>' +
      '</div>' +
      '<div class="card"><h3 style="margin-top:0">Support gaps identified</h3><p class="muted" style="font-size:12px;margin-top:-4px">' +
        'These are needs identified by comparing the plan against the field\'s current data gaps — not commitments this system makes on anyone\'s behalf.</p>' +
        '<ul class="support-gap-list">' + supportGaps.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>' +
      '</div>';
  }

  // =========================================================================
  // READ-ONLY IOT GROUND TRUTH
  // =========================================================================

  function renderTelemetryCharts() {
    var t = window.FS_DATA.telemetry;
    ['moistureFlow', 'microclimate'].forEach(function (key) {
      if (charts[key]) charts[key].destroy();
      charts[key] = null;
    });
    var mode = state.telemetryMode;
    var modeConfig = t.delivery_modes[mode];
    els.telemetrySourceNote.textContent = t.source + ' — synthetic demonstration data; readings are not live.';
    document.querySelectorAll('[data-telemetry-mode]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-telemetry-mode') === mode);
      button.setAttribute('aria-pressed', button.getAttribute('data-telemetry-mode') === mode ? 'true' : 'false');
    });
    document.getElementById('telemetry-mode-note').textContent = mode === 'realtime'
      ? 'Pilot target: sensor sample every ' + modeConfig.sensor_interval_seconds + ' s; surface image every ' + modeConfig.surface_photo_interval_seconds / 60 + ' min. Demo chart remains historical 30-minute data.'
      : 'Pilot target: sensor sample every ' + modeConfig.sensor_interval_seconds / 60 + ' min; ' + modeConfig.surface_photos_per_day + ' surface photos daily; queue until connected. Demo chart remains historical 30-minute data.';
    var labels = t.readings.map(function (r) { return r.timestamp.slice(5, 16).replace('T', ' '); });
    var latest = t.readings[t.readings.length - 1];
    var stale = Date.now() - Date.parse(latest.timestamp) > modeConfig.sensor_interval_seconds * 2000;
    var sensorQuality = latest.sensor_fault_flag ? 'Flagged' : (stale ? 'Stale historical sample' : 'Synthetic demo sample');
    var moistureLabel = stale ? 'Last recorded soil-probe reading' : 'Soil probe';
    var moistureValue = fmtNum(latest.soil_moisture_15cm_pct_vwc) + '% VWC' + (stale ? ' · stale' : '');
    var camera = t.camera_observation;
    document.getElementById('telemetry-status').innerHTML =
      '<div class="telemetry-status-row"><span>' + moistureLabel + '</span><strong>' + moistureValue + '</strong></div>' +
      '<div class="telemetry-status-row"><span>Sensor source</span><strong>' + escapeHtml(t.source) + '</strong></div>' +
      '<div class="telemetry-status-row"><span>Sensor observed at</span><strong>' + escapeHtml(latest.timestamp.replace('T', ' ').replace('Z', ' UTC')) + '</strong></div>' +
      '<div class="telemetry-status-row"><span>Sensor quality</span><strong>' + sensorQuality + ' · not live</strong></div>' +
      '<div class="telemetry-status-row"><span>Sensor upload time</span><strong>Not recorded in demo</strong></div>' +
      '<div class="telemetry-status-row"><span>Pump status</span><strong>' + (latest.pump_state ? 'On' : 'Off') + (stale ? ' · stale' : '') + ' · read-only synthetic sample</strong></div>' +
      '<div class="telemetry-status-row"><span>Camera source</span><strong>' + escapeHtml(camera.source) + '</strong></div>' +
      '<div class="telemetry-status-row"><span>Camera observation</span><strong>' + escapeHtml(camera.quality.status) + ' · no capture time</strong></div>';

    if (typeof Chart === 'undefined') {
      document.getElementById('chart-moisture-flow').parentElement.innerHTML =
        '<p class="muted">Chart.js failed to load from the CDN — telemetry chart unavailable offline.</p>';
      document.getElementById('chart-microclimate').parentElement.innerHTML =
        '<p class="muted">Chart.js failed to load from the CDN — telemetry chart unavailable offline.</p>';
      return;
    }

    charts.moistureFlow = new Chart(document.getElementById('chart-moisture-flow').getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Root-zone moisture (% VWC)', data: t.readings.map(function (r) { return r.soil_moisture_15cm_pct_vwc; }), borderColor: '#235c3a', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 0, tension: 0.15, borderWidth: 2 },
          { label: 'Flow (L/min)', data: t.readings.map(function (r) { return r.flow_lpm; }), borderColor: '#315b78', backgroundColor: 'rgba(49,91,120,0.12)', yAxisID: 'y1', pointRadius: 0, fill: true, tension: 0.1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } },
          y: { position: 'left', title: { display: true, text: 'VWC %' } },
          y1: { position: 'right', title: { display: true, text: 'L/min' }, grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });

    charts.microclimate = new Chart(document.getElementById('chart-microclimate').getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Air temp (°C)', data: t.readings.map(function (r) { return r.air_temp_c; }), borderColor: '#d9a441', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 0, tension: 0.15, borderWidth: 2 },
          { label: 'Humidity (%)', data: t.readings.map(function (r) { return r.air_humidity_pct; }), borderColor: '#315b78', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 0, tension: 0.15, borderDash: [4, 3] },
          { label: 'Pump state (0/1)', data: t.readings.map(function (r) { return r.pump_state; }), borderColor: '#9d3f35', backgroundColor: 'transparent', yAxisID: 'y1', pointRadius: 0, tension: 0.1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } },
          y: { position: 'left', title: { display: true, text: '°C / %' } },
          y1: { position: 'right', title: { display: true, text: 'Pump state' }, grid: { drawOnChartArea: false }, min: 0, max: 1 }
        },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  function resetCharts() {
    Object.keys(charts).forEach(function (key) { if (charts[key]) charts[key].destroy(); });
    charts = {};
  }

  // =========================================================================
  // RENDER ALL (called on every farmer-input change + data-mode change)
  // =========================================================================

  function renderAll() {
    var data = dataApi.getAll();
    var fieldState = engine.computeFieldState(state.inputs, data);
    var scenarios = engine.listScenarios(state.inputs, data);
    var confidence = engine.computeConfidence(fieldState, fieldState.farmer_input, data);

    state._lastFieldState = fieldState;
    state._lastScenarios = scenarios;

    renderStatusBar(confidence);
    renderFieldSummary(fieldState);
    renderFieldState(fieldState, data);
    renderScenarios(scenarios, data);
    renderStressLab(data);
    renderActionPlan(scenarios, fieldState, data);
  }

  // =========================================================================
  // INIT
  // =========================================================================

  function init() {
    cacheEls();
    positionAppBar();
    window.addEventListener('resize', positionAppBar);

    buildFieldSetupControls();
    wireControls();
    wireModeToggle();
    wireTabs();
    wirePayloadModal();
    wireScenarioSliderDelegation();
    initMap();
    wireStressLab();
    resetCharts();
    renderTelemetryCharts();

    window.addEventListener('fs:datachange', onDataChange);

    renderAll();
    renderHistoricChart(dataApi.getAll());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
