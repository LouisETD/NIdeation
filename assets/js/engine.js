// assets/js/engine.js
//
// FieldShift — Decision Engine.
//
// Pure, deterministic, synchronous scoring logic. NO DOM access, NO fetch,
// NO LLM calls anywhere in this file — that is a hard architectural rule for
// this project (see problem.html: "Don't feed raw data straight to an LLM to
// decide the crop"). Everything here is plain arithmetic over the data
// exposed on window.FS_DATA (see data/*.js) plus a runtime `inputs` object.
//
// Every tunable number below is a named constant with a comment explaining
// its agronomic/economic intent and, where relevant, how it was calibrated
// against the team's documented reference field (poly_idn_jt_001, Jawa
// Timur, analysis date 2026-09-22). These constants are deliberately exposed
// so a reviewer (and the public spec page) can sanity-check them; treat this
// as a transparent rules engine, not a black box.
//
// Public API: window.FS.engine = {
//   computeFieldState, listScenarios, scoreScenario,
//   computeEconomics, computeConfidence, buildPayload, selfCheck
// }
(function () {
  'use strict';

  window.FS = window.FS || {};

  // =========================================================================
  // 0. SMALL HELPERS
  // =========================================================================

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Min-max normalize `value` against the full spread found in `arr`.
  // Returns 0.5 (neutral) if every value in `arr` is identical, to avoid /0.
  function minMaxNorm(value, arr) {
    const min = Math.min.apply(null, arr);
    const max = Math.max.apply(null, arr);
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  function round(v) {
    return Math.round(v);
  }

  // =========================================================================
  // 1. FIELD STATE
  // =========================================================================

  // Merge runtime farmer inputs on top of the documented default field_state.
  // `inputs` may be partial (or {}) — any field left unset falls back to the
  // demo default from data/field_state.js. This is also the seam where
  // assets/js/data.js's "live" mode overlays fresh NASA POWER numbers onto
  // agrometeorological_context before the engine ever sees them (the engine
  // itself does not know or care whether data came from demo or live mode).
  function computeFieldState(inputs, data) {
    data = data || (window.FS.data ? window.FS.data.getAll() : window.FS_DATA);
    const fs = data.field_state;
    const farmerInput = Object.assign({}, fs.farmer_input, inputs || {});
    return {
      request_metadata: fs.request_metadata,
      farmer_input: farmerInput,
      soil_chemistry: fs.soil_chemistry,
      live_observation: fs.live_observation,
      agrometeorological_context: fs.agrometeorological_context
    };
  }

  // =========================================================================
  // 2. FEASIBILITY GATES (hard pass/fail, evaluated before any scoring)
  // =========================================================================

  // A crop has a usable planting window if any of its calendar tracks ever
  // shows "Planting-Early Veg" somewhere in the 24-row half-month calendar.
  function calendarHasPlantingWindow(cropDef, calendar) {
    return cropDef.calendar_track.some(function (track) {
      return calendar.rows.some(function (row) {
        return row[track] === 'Planting-Early Veg';
      });
    });
  }

  function checkGates(cropDef, farmer, fieldState, data) {
    const failures = [];

    // --- Gate 1: soil pH outside the crop's tolerable band ---------------
    const ph = fieldState.soil_chemistry.pH;
    if (ph < cropDef.ph_min || ph > cropDef.ph_max) {
      failures.push(
        'Soil pH ' + ph + ' falls outside ' + cropDef.name +
        "'s tolerable range (" + cropDef.ph_min + '–' + cropDef.ph_max + ').'
      );
    }

    // --- Gate 2: no planting window in the calendar for this crop --------
    if (!calendarHasPlantingWindow(cropDef, data.calendar)) {
      failures.push('No planting window exists for ' + cropDef.name + ' in the sourced crop calendar.');
    }

    // --- Gate 3: capital requirement x area exceeds declared capital -----
    const areaHa = farmer.area_ha || 1;
    const capitalNeeded = cropDef.capital_requirement_idr_per_ha * areaHa;
    const capitalAvailable = (farmer.capital_available_idr_per_ha || 0) * areaHa;
    if (capitalNeeded > capitalAvailable) {
      failures.push(
        'Capital required (IDR ' + Math.round(capitalNeeded).toLocaleString('id-ID') +
        ') exceeds declared capital (IDR ' + Math.round(capitalAvailable).toLocaleString('id-ID') + ').'
      );
    }

    // --- Gate 4: water requirement far exceeds irrigation capacity under -
    //             a below-average rainfall outlook. This is a HARD safety
    //             net, deliberately set loose (3x effective supply) so it
    //             only trips for genuinely impossible combinations — the
    //             ordinary "rice on rainfed under a dry outlook" case is
    //             still scoreable (and scores poorly) rather than gated out,
    //             matching the calibration target (scenario A is scored,
    //             not marked infeasible).
    const irr = IRRIGATION[farmer.irrigation_type] || IRRIGATION.Rainfed;
    if (fieldState.agrometeorological_context.precipitation_outlook === 'Below-average') {
      const hardCapacity = irr.capacity_mm * irr.efficiency * WATER_GATE_MULTIPLIER;
      if (cropDef.water_requirement_mm > hardCapacity) {
        failures.push(
          cropDef.name + "'s water requirement (" + cropDef.water_requirement_mm +
          'mm) far exceeds ' + farmer.irrigation_type + ' capacity under a below-average rainfall outlook.'
        );
      }
    }

    return failures;
  }
  const WATER_GATE_MULTIPLIER = 3; // loose hard-infeasibility safety net, see Gate 4 comment above

  // =========================================================================
  // 3. SUB-SCORE 1 — WATER DEMAND SUITABILITY
  // =========================================================================
  //
  // Model: each irrigation type has a seasonal "capacity" (mm-equivalent of
  // water it can plausibly deliver over one crop cycle) and an "efficiency"
  // (fraction of that water that actually reaches/benefits the crop root
  // zone; rainfed loses the most to runoff/evaporation, drip the least).
  // effective_supply = capacity * efficiency, then derated by the GEOGLAM
  // precipitation outlook (rainfed is far more exposed to a bad rainfall
  // outlook than drip/sprinkler, which draw from a stored or piped source)
  // and by the live Sentinel-2 NDWI reading (a currently-drying field, NDWI
  // < 0, further reduces usable water regardless of irrigation type).
  //
  // raw(irrigationType) = K * effective_supply(irrigationType) / crop.water_requirement_mm
  //
  // K (WATER_K) is an empirical scale constant calibrated so that Rice under
  // Rainfed + Below-average + NDWI -0.15 (the documented reference case)
  // lands at ~30/100, matching the team's calibration target.
  //
  // DEFECT 2 FIX — a purely capacity-driven score saturates: under Drip
  // (capacity 1600mm, efficiency 0.92) `raw()` comfortably exceeds 100 for
  // EVERY crop in the catalogue (rice included, at ~1200mm/cycle), so the
  // clamp made every crop read as a perfect 100 and the score lost all
  // ability to discriminate a thirsty crop from a frugal one the moment a
  // farmer picked good irrigation. Better plumbing improves delivery
  // *efficiency*; it cannot shrink how many millimetres of water rice
  // intrinsically needs, nor make a below-average rainfall outlook less
  // risky in absolute terms. The fix below blends two terms:
  //   1. `irrigationAdequacy` — how well the farmer's ACTUAL irrigation
  //      choice meets this crop's demand right now (the original formula),
  //      capped at 100 ("fully met") before blending so a high-capacity
  //      system can't numerically overrun the second term.
  //   2. `absoluteExposure` — the same formula but always evaluated against
  //      Rainfed (rain_sensitivity 1.0, the irrigation type most exposed to
  //      the natural precipitation outlook), REGARDLESS of what the farmer
  //      actually chose. This is the crop's irrigation-independent,
  //      intrinsic water-demand exposure to the weather.
  // See waterDemandSuitability() below for the blend and its weights.

  const IRRIGATION = {
    Rainfed:   { capacity_mm: 750,  efficiency: 0.55, rain_sensitivity: 1.00 },
    Furrow:    { capacity_mm: 1300, efficiency: 0.65, rain_sensitivity: 0.50 },
    Sprinkler: { capacity_mm: 1500, efficiency: 0.78, rain_sensitivity: 0.30 },
    Drip:      { capacity_mm: 1600, efficiency: 0.92, rain_sensitivity: 0.15 }
  };

  // How much the GEOGLAM precipitation outlook shifts effective supply,
  // scaled per irrigation type by rain_sensitivity above (rainfed feels the
  // full delta, drip only a fraction of it).
  const PRECIP_ADJ_DELTA = { 'Below-average': -0.15, 'Average': 0, 'Above-average': 0.10 };

  // Live NDWI (Normalized Difference Water Index) adjustment: only a
  // currently-drying trend (NDWI < 0) penalizes; a wet/stable reading does
  // not get an extra bonus here (NDVI/NDWI are a snapshot, not a forecast).
  const WATER_NDWI_WEIGHT = 0.30;

  // Calibration constant — see model comment above. Unchanged by the
  // defect-2 fix: it still governs both the irrigation-adequacy term and
  // the new absolute-exposure term (they share the same underlying formula,
  // just evaluated against a different irrigation type — see below).
  const WATER_K = 110;

  // Blend weights for the two terms described above; must sum to 1.
  // 0.6 on the farmer's actual irrigation choice keeps this a tool about
  // irrigation trade-offs (the choice the farmer can control still
  // dominates); 0.4 on the Rainfed-anchored absolute exposure is enough to
  // guarantee a >=15-point Rice-vs-Soybean gap under Drip + a below-average
  // outlook (the calibration requirement — see engine.test.js), without
  // being so large that it swamps the irrigation-adequacy signal. Because
  // the two terms are IDENTICAL whenever the farmer's chosen irrigation
  // actually is Rainfed, this blend is a no-op for every Rainfed-based
  // calibration target (A/B/C all default to Rainfed) — nothing there
  // needed re-tuning.
  const WATER_IRRIGATION_WEIGHT = 0.6;
  const WATER_ABSOLUTE_WEIGHT = 0.4;

  function rawWaterScore(cropDef, irrigationType, agromet, ndwiCurrent) {
    const irr = IRRIGATION[irrigationType] || IRRIGATION.Rainfed;
    const rawSupply = irr.capacity_mm * irr.efficiency;
    const precipDelta = PRECIP_ADJ_DELTA[agromet.precipitation_outlook];
    const precipFactor = 1 + (precipDelta === undefined ? 0 : precipDelta) * irr.rain_sensitivity;
    const ndwiFactor = 1 + Math.min(0, ndwiCurrent) * WATER_NDWI_WEIGHT;
    const effectiveSupply = rawSupply * precipFactor * ndwiFactor;
    return WATER_K * effectiveSupply / cropDef.water_requirement_mm;
  }

  function waterDemandSuitability(cropDef, irrigationType, agromet, ndwiCurrent) {
    const irrigationAdequacy = clamp(rawWaterScore(cropDef, irrigationType, agromet, ndwiCurrent), 0, 100);
    const absoluteExposure = clamp(rawWaterScore(cropDef, 'Rainfed', agromet, ndwiCurrent), 0, 100);
    const score = WATER_IRRIGATION_WEIGHT * irrigationAdequacy + WATER_ABSOLUTE_WEIGHT * absoluteExposure;
    return clamp(round(score), 0, 100);
  }

  // =========================================================================
  // 4. SUB-SCORE 2 — SOIL HEALTH IMPACT
  // =========================================================================
  //
  // Rewards rotation diversity away from the previous crop, penalizes
  // repeating the same crop (monoculture depletes soil & compounds
  // pest/disease pressure), gives legumes a nitrogen-fixation bonus when
  // they follow a non-legume, and scales a base "soil organic carbon fit"
  // bonus by how much the candidate crop benefits from high SOC.

  const SOIL_BASE = 40;                 // neutral starting point
  const SOIL_SOC_MAX_BONUS = 30;        // max bonus when SOC level AND crop's soc_preference are both "high"
  const SOIL_ROTATION_BONUS = 10;       // reward for breaking the previous crop's cycle
  const SOIL_MONOCULTURE_PENALTY = 13;  // penalty for repeating the same crop back-to-back
  const SOIL_NITROGEN_FIX_BONUS = 22;   // legume following a non-legume enriches soil N for the next season

  const SOC_LEVEL_NUM = { low: 0.3, medium: 0.6, high: 1.0 };
  const SOC_PREF_NUM = { low: 0.3, medium: 0.6, high: 1.0 };

  function soilHealthImpact(cropDef, previousCropKey, soilChemistry) {
    const socLevel = SOC_LEVEL_NUM[soilChemistry.soc_level] !== undefined ? SOC_LEVEL_NUM[soilChemistry.soc_level] : 0.6;
    const socPref = SOC_PREF_NUM[cropDef.soc_preference] !== undefined ? SOC_PREF_NUM[cropDef.soc_preference] : 0.6;
    const isMonoculture = cropDef.key === previousCropKey;

    let score = SOIL_BASE + socLevel * socPref * SOIL_SOC_MAX_BONUS;
    score += isMonoculture ? -SOIL_MONOCULTURE_PENALTY : SOIL_ROTATION_BONUS;
    if (cropDef.nitrogen_fixing && !isMonoculture) score += SOIL_NITROGEN_FIX_BONUS;

    return clamp(round(score), 0, 100);
  }

  // =========================================================================
  // 5. SUB-SCORE 3 — CLIMATE RESILIENCE
  // =========================================================================
  //
  // Starts from a full-marks baseline and subtracts a drought penalty
  // (scaled by the crop's own drought_sensitivity and how strongly the
  // GEOGLAM precipitation outlook signals risk) and a heat penalty (scaled
  // by 1-heat_tolerance and the temperature outlook). Short-cycle crops
  // (<90 days) get a small resilience bonus for escaping more of the
  // forecast window before a late-season dry spell can hit them. The
  // GEOGLAM Early Warning regional crop-condition status (rice/maize are
  // explicitly tracked) nudges the score up or down as a secondary,
  // regional-scale signal.

  const CLIMATE_BASE = 100;
  const CLIMATE_DROUGHT_WEIGHT = 60;   // max points lost to drought sensitivity under a fully "Below-average" outlook
  const CLIMATE_HEAT_WEIGHT = 25;      // max points lost to poor heat tolerance under a fully "Above-average" outlook
  const CLIMATE_SHORT_CYCLE_DAYS = 90; // crops shorter than this partially escape a late-season dry/heat spell
  const CLIMATE_SHORT_CYCLE_BONUS = 12;
  const CLIMATE_GEOGLAM_FAVOURABLE_BONUS = 3;
  const CLIMATE_GEOGLAM_POOR_PENALTY = -8;
  const CLIMATE_GEOGLAM_FAILURE_PENALTY = -15;

  const PRECIP_RISK = { 'Below-average': 1, 'Average': 0.5, 'Above-average': 0.2 };
  const TEMP_RISK = { 'Above-average': 1, 'Average': 0.5, 'Below-average': 0.2 };

  function climateResilience(cropDef, agromet, geoglam) {
    const precipRisk = PRECIP_RISK[agromet.precipitation_outlook] !== undefined ? PRECIP_RISK[agromet.precipitation_outlook] : 0.5;
    const tempRisk = TEMP_RISK[agromet.temperature_outlook] !== undefined ? TEMP_RISK[agromet.temperature_outlook] : 0.5;

    let score = CLIMATE_BASE
      - CLIMATE_DROUGHT_WEIGHT * cropDef.drought_sensitivity * precipRisk
      - CLIMATE_HEAT_WEIGHT * (1 - cropDef.heat_tolerance) * tempRisk;

    if (cropDef.cycle_days < CLIMATE_SHORT_CYCLE_DAYS) score += CLIMATE_SHORT_CYCLE_BONUS;

    const ew = geoglam && geoglam.early_warning && geoglam.early_warning.crops
      ? geoglam.early_warning.crops[cropDef.key]
      : null;
    if (ew && ew.status) {
      if (/favourable/i.test(ew.status)) score += CLIMATE_GEOGLAM_FAVOURABLE_BONUS;
      else if (/poor/i.test(ew.status)) score += CLIMATE_GEOGLAM_POOR_PENALTY;
      else if (/failure/i.test(ew.status)) score += CLIMATE_GEOGLAM_FAILURE_PENALTY;
    }

    return clamp(round(score), 0, 100);
  }

  // =========================================================================
  // 6. SUB-SCORE 4 — FARMER PRIORITY ALIGNMENT
  // =========================================================================
  //
  // Each farmer priority maps to a "fit" function that min-max normalizes a
  // relevant crop attribute across the FULL crop catalog (not just the
  // scenarios being compared this run), so a crop's fit doesn't shift
  // depending on which other rotation options happen to be listed.
  //
  // farmer_priority_alignment = FLOOR + (mean of active-priority fits) * SCALE
  //
  // DEFECT 1 FIX — this used to divide the sum of active-priority fits by a
  // HARDCODED constant (PRIORITY_NORMALIZATION_N = 2) instead of the actual
  // number of active priorities. That made the score scale with how many
  // priorities the farmer happened to tick, not with how well the crop
  // matches them: selecting only "Save Water" (a single, very strong fit for
  // Soybean) produced a LOWER score than selecting two priorities, because
  // the single fit was still being divided by 2. A true mean over the
  // ACTIVE priorities only — i.e. divide by priorities.length, not a fixed
  // N — fixes the direction: a farmer who cares about exactly one thing and
  // gets a crop that's a near-perfect fit for that one thing should score
  // high, not penalized for not having listed a second priority. FLOOR/SCALE
  // did not need re-tuning: the documented default scenario selects exactly
  // two priorities, so old (sum/2) and new (sum/count) are numerically
  // identical there — every existing A/B/C calibration target is unaffected.
  //
  // (The old comment here also claimed a fixed denominator was needed to
  // keep "deselecting Save Water narrows B's lead over C" pointing the right
  // way. That behavioural check was actually the symptom, not a real
  // requirement — see the rewritten version of it in engine.test.js for why.)

  const PRIORITY_ALIGNMENT_FLOOR = 25;
  const PRIORITY_ALIGNMENT_SCALE = 87;

  const PRIORITY_FIT_FN = {
    'Save Water': function (crop, all) {
      return 1 - minMaxNorm(crop.water_requirement_mm, all.map(function (c) { return c.water_requirement_mm; }));
    },
    'Maximize Yield': function (crop, all) {
      return minMaxNorm(crop.base_yield_t_ha, all.map(function (c) { return c.base_yield_t_ha; }));
    },
    'Reduce Climate Risk': function (crop, all) {
      const raw = function (c) { return (1 - c.drought_sensitivity) + c.heat_tolerance; };
      return minMaxNorm(raw(crop), all.map(raw));
    },
    'Improve Soil Health': function (crop, all) {
      const raw = function (c) { return (c.nitrogen_fixing ? 1 : 0) + (SOC_PREF_NUM[c.soc_preference] !== undefined ? SOC_PREF_NUM[c.soc_preference] : 0.6); };
      return minMaxNorm(raw(crop), all.map(raw));
    },
    'Low Capital': function (crop, all) {
      return 1 - minMaxNorm(crop.capital_requirement_idr_per_ha, all.map(function (c) { return c.capital_requirement_idr_per_ha; }));
    }
  };

  function farmerPriorityAlignment(cropDef, priorities, allCropDefs) {
    if (!priorities || !priorities.length) return 50; // no stated preference -> neutral
    const fits = priorities.map(function (p) {
      const fn = PRIORITY_FIT_FN[p];
      return fn ? fn(cropDef, allCropDefs) : 0.5;
    });
    const sumFit = fits.reduce(function (a, b) { return a + b; }, 0);
    const avg = sumFit / priorities.length; // mean over ACTIVE priorities only — see DEFECT 1 FIX comment above
    return clamp(round(PRIORITY_ALIGNMENT_FLOOR + avg * PRIORITY_ALIGNMENT_SCALE), 0, 100);
  }

  // =========================================================================
  // 7. WEIGHTED TOTAL + VERDICT
  // =========================================================================
  //
  // Base weights are equal (0.25 each). Each active farmer priority adds a
  // fixed boost to its mapped category's weight; the total boost pool is
  // then subtracted back out evenly across all four categories so the
  // weights always sum to exactly 1, regardless of how many priorities are
  // active. This "spread the cost evenly" approach (rather than plain
  // re-normalization) is unrelated to, and unaffected by, the DEFECT 1 fix
  // in farmerPriorityAlignment above — it is simply how the four category
  // weights stay a valid partition of 1.0 as the active priority count
  // varies. (An earlier version of this comment also credited this
  // mechanism with keeping a "deselecting Save Water narrows B's lead over
  // C" check pointing the right way; that check has since been shown to
  // rest on an incorrect assumption and was rewritten — see engine.test.js.)

  const CATEGORY_WEIGHT_BOOST = 0.05;
  const SCORE_CATEGORIES = ['water_demand_suitability', 'soil_health_impact', 'climate_resilience', 'farmer_priority_alignment'];
  const PRIORITY_CATEGORY_MAP = {
    'Save Water': 'water_demand_suitability',
    'Reduce Climate Risk': 'climate_resilience',
    'Improve Soil Health': 'soil_health_impact',
    'Maximize Yield': 'farmer_priority_alignment',
    'Low Capital': 'farmer_priority_alignment'
  };

  function computeWeights(priorities) {
    const boost = {};
    SCORE_CATEGORIES.forEach(function (c) { boost[c] = 0; });
    (priorities || []).forEach(function (p) {
      const cat = PRIORITY_CATEGORY_MAP[p];
      if (cat) boost[cat] += CATEGORY_WEIGHT_BOOST;
    });
    const totalBoost = SCORE_CATEGORIES.reduce(function (s, c) { return s + boost[c]; }, 0);
    const adj = totalBoost / SCORE_CATEGORIES.length;
    const weights = {};
    SCORE_CATEGORIES.forEach(function (c) { weights[c] = 0.25 + boost[c] - adj; });
    return weights;
  }

  function verdictFromTotal(total) {
    if (total >= 80) return 'Highly Recommended';
    if (total >= 60) return 'Viable Alternative';
    if (total >= 40) return 'Marginal';
    return 'Not Recommended';
  }

  // =========================================================================
  // 8. ECONOMICS
  // =========================================================================
  //
  // expected_net_margin = predicted_yield x farm_gate_price - total_variable_cost
  // (per hectare). predicted_yield is the crop's reference yield adjusted
  // down slightly when climate_resilience is poor (a stressed crop under-
  // performs its reference yield). The low/high range applies downside
  // (drought risk + price volatility + data uncertainty) and upside
  // (mostly price-volatility-driven) percentage adjustments around the
  // expected figure.

  const YIELD_CLIMATE_FLOOR = 0.70; // worst-case yield realization fraction at climate_resilience = 0
  const YIELD_CLIMATE_SPAN = 0.30;  // additional fraction unlocked at climate_resilience = 100

  const RISK_DROUGHT_DOWNSIDE_MAX = 0.25;      // max downside fraction from drought sensitivity
  const RISK_PRICE_VOL_MAX = 0.20;             // max swing fraction from market price volatility
  const RISK_DATA_UNCERTAINTY_MAX = 0.15;      // max additional downside fraction from low data confidence
  const RISK_PRICE_VOL_UPSIDE_SHARE = 0.60;    // share of the price-volatility swing that can also go up
  const RISK_DATA_UNCERTAINTY_UPSIDE_SHARE = 0.30;

  function computeEconomics(cropDef, farmer, climateResilienceScore, confidenceScore) {
    const yieldAdj = YIELD_CLIMATE_FLOOR + YIELD_CLIMATE_SPAN * (climateResilienceScore / 100);
    const predictedYield = cropDef.base_yield_t_ha * yieldAdj; // t/ha
    const revenue = predictedYield * 1000 * cropDef.farm_gate_price_idr_per_kg; // IDR/ha
    const cost = cropDef.variable_cost_idr_per_ha;
    const expected = revenue - cost;

    const droughtDownside = cropDef.drought_sensitivity * RISK_DROUGHT_DOWNSIDE_MAX;
    const priceVol = cropDef.market_price_volatility * RISK_PRICE_VOL_MAX;
    const dataUncertainty = (1 - confidenceScore) * RISK_DATA_UNCERTAINTY_MAX;

    const downsidePct = droughtDownside + priceVol + dataUncertainty;
    const upsidePct = priceVol * RISK_PRICE_VOL_UPSIDE_SHARE + dataUncertainty * RISK_DATA_UNCERTAINTY_UPSIDE_SHARE;

    const low = expected * (1 - downsidePct);
    const high = expected * (1 + upsidePct);
    const breakEvenPrice = cost / (predictedYield * 1000);

    function priceSensitivity(deltaPct) {
      const adjPrice = cropDef.farm_gate_price_idr_per_kg * (1 + deltaPct / 100);
      const rev2 = predictedYield * 1000 * adjPrice;
      return Math.round(rev2 - cost);
    }

    return {
      predicted_yield_t_ha: Math.round(predictedYield * 100) / 100,
      expected_net_margin_idr_per_ha: {
        low: Math.round(low),
        expected: Math.round(expected),
        high: Math.round(high)
      },
      break_even_price_idr_per_kg: Math.round(breakEvenPrice),
      priceSensitivity: priceSensitivity
    };
  }

  // =========================================================================
  // 9. CONFIDENCE
  // =========================================================================

  function computeConfidence(fieldState, farmer, data) {
    const reasons = [];
    let score = 1.0;

    const soil = data.soil || {};
    // Static soil extraction (not a live sensor feed) — small fixed hit.
    if (soil.extraction_date) {
      score -= 0.05;
      reasons.push('Soil chemistry is a static point extraction (SoilGrids), not a live in-field measurement.');
    }

    // Source resolution vs field size: SoilGrids ships at 250m (~6.25 ha/px).
    const resM = soil.resolution_m || 250;
    const cellHa = (resM * resM) / 10000;
    const areaHa = farmer.area_ha || 1;
    if (cellHa > areaHa * 2) {
      score -= 0.15;
      reasons.push('Soil raster resolution (~' + cellHa.toFixed(1) + ' ha/pixel) is coarse relative to the field size (' + areaHa + ' ha).');
    }

    // Missing/defaulted farmer inputs.
    let missing = 0;
    ['previous_crop', 'irrigation_type', 'priorities', 'area_ha', 'capital_available_idr_per_ha'].forEach(function (k) {
      const v = farmer[k];
      if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) missing++;
    });
    if (missing > 0) {
      score -= missing * 0.10;
      reasons.push(missing + ' farmer input field(s) are missing and fell back to defaults.');
    }

    reasons.push('GEOGLAM outlook is a regional (country-level) signal; local field conditions may vary.');

    score = clamp(score, 0, 1);
    const label = score >= 0.75 ? 'High' : (score >= 0.5 ? 'Medium' : 'Low');
    return { score: Math.round(score * 100) / 100, label: label, reasons: reasons };
  }

  // =========================================================================
  // 10. TRADE-OFF PROSE (templated, NOT LLM-generated)
  // =========================================================================

  function tradeOffAnalysis(cropDef, previousCropKey, farmer, fieldState) {
    const isMonoculture = cropDef.key === previousCropKey;
    const precip = fieldState.agrometeorological_context.precipitation_outlook;
    const prevName = farmer.previous_crop;

    if (isMonoculture) {
      return 'Planting ' + cropDef.name.toLowerCase() + ' again next season carries a relatively high crop-failure risk. ' +
        'The irrigation system depends on rainfall (' + farmer.irrigation_type + ') while the forecast indicates ' +
        precip.toLowerCase() + ' precipitation.';
    }

    if (cropDef.nitrogen_fixing) {
      return cropDef.name + " is a secondary (palawija) crop requiring less water, aligning with the 'Save Water' priority. " +
        'As a legume it also has the potential to support soil fertility through nitrogen fixation following ' +
        prevName.toLowerCase() + '.';
    }

    if (cropDef.soc_preference === 'high') {
      const socPct = fieldState.soil_chemistry.organic_carbon_pct;
      const socLabel = socPct !== undefined ? socPct : '?';
      return 'The high soil organic carbon content (' + socLabel + '%) supports ' + cropDef.name.toLowerCase() +
        ' growth, which needs good nutrient availability. However, ' + cropDef.name.toLowerCase() +
        ' still carries drought risk during the early vegetative phase under the currently projected climate.';
    }

    // Generic fallback for any other rotation crop (mung bean, peanut, ...).
    return cropDef.name + ' offers a rotation away from ' + prevName + ', with a water requirement of ' +
      cropDef.water_requirement_mm + 'mm/cycle versus ' + prevName + "'s profile. Its soil-fit and climate-fit " +
      'scores reflect its ' + cropDef.soc_preference + ' organic-carbon preference and drought sensitivity of ' +
      cropDef.drought_sensitivity + '.';
  }

  // =========================================================================
  // 11. SCENARIO ENGINE
  // =========================================================================

  function cropKeyForName(cropsObj, name) {
    return Object.keys(cropsObj).find(function (k) { return cropsObj[k].name === name; }) || null;
  }

  function allCropDefsFrom(cropsObj) {
    return Object.keys(cropsObj).map(function (k) { return Object.assign({ key: k }, cropsObj[k]); });
  }

  function scoreScenario(cropDef, previousCropKey, fieldState, data, allCropDefs) {
    const farmer = fieldState.farmer_input;
    const gateFailures = checkGates(cropDef, farmer, fieldState, data);

    if (gateFailures.length) {
      return {
        feasible: false,
        gate_failures: gateFailures,
        scores: null,
        total: 0,
        verdict: 'Not Feasible',
        trade_off_analysis: gateFailures.join(' ')
      };
    }

    const water = waterDemandSuitability(cropDef, farmer.irrigation_type, fieldState.agrometeorological_context, fieldState.live_observation.ndwi_current);
    const soil = soilHealthImpact(cropDef, previousCropKey, fieldState.soil_chemistry);
    const climate = climateResilience(cropDef, fieldState.agrometeorological_context, data.geoglam);
    const priority = farmerPriorityAlignment(cropDef, farmer.priorities, allCropDefs);

    const scores = {
      water_demand_suitability: water,
      soil_health_impact: soil,
      climate_resilience: climate,
      farmer_priority_alignment: priority
    };

    const weights = computeWeights(farmer.priorities);
    const total = water * weights.water_demand_suitability +
      soil * weights.soil_health_impact +
      climate * weights.climate_resilience +
      priority * weights.farmer_priority_alignment;

    const verdict = verdictFromTotal(total);
    const confidence = computeConfidence(fieldState, farmer, data);
    const economics = computeEconomics(cropDef, farmer, climate, confidence.score);
    const tradeOff = tradeOffAnalysis(cropDef, previousCropKey, farmer, fieldState);

    return {
      feasible: true,
      gate_failures: [],
      scores: scores,
      total: Math.round(total * 10) / 10,
      verdict: verdict,
      economics: economics,
      confidence: confidence,
      trade_off_analysis: tradeOff
    };
  }

  // Scenario ordering: scenario A is ALWAYS "repeat the previous crop"
  // (the farmer's do-nothing baseline). Every other candidate crop is then
  // scored and sorted by descending weighted total, and assigned B, C, D...
  // in that rank order. This is what reproduces the documented calibration
  // IDs (A = Rice-Rice baseline, B = Soybean as the top-ranked rotation,
  // C = Maize as the second-ranked rotation) without hardcoding crop names.
  //
  // The candidate pool itself is deliberately restricted to
  // MVP_SCENARIO_CROP_KEYS rather than the full crop catalog: problem.html's
  // MVP plan explicitly scopes the decision engine to "three realistic
  // options — rice, corn, and soybean" for this hackathon build. Mung bean
  // and peanut remain in data/crops.js (and are still used as part of the
  // FULL catalog for farmer-priority min-max normalization, so their
  // presence there still meaningfully affects e.g. the "Save Water" fit
  // curve) but are not offered as rotation scenarios by default. Bump this
  // list to widen the scenario set without touching any scoring logic.
  const SCENARIO_IDS = 'ABCDEFGHIJ';
  const MVP_SCENARIO_CROP_KEYS = ['rice', 'maize', 'soybean'];

  function listScenarios(inputs, data) {
    data = data || (window.FS.data ? window.FS.data.getAll() : window.FS_DATA);
    const fieldState = computeFieldState(inputs, data);
    const farmer = fieldState.farmer_input;
    const cropsObj = data.crops.crops;
    const allCropDefs = allCropDefsFrom(cropsObj);
    const previousCropKey = cropKeyForName(cropsObj, farmer.previous_crop);

    const candidates = allCropDefs.filter(function (c) {
      return c.key !== previousCropKey && MVP_SCENARIO_CROP_KEYS.indexOf(c.key) !== -1;
    });
    const scored = candidates.map(function (c) {
      return { crop: c, result: scoreScenario(c, previousCropKey, fieldState, data, allCropDefs) };
    });
    scored.sort(function (a, b) { return b.result.total - a.result.total; });

    const orderedKeys = [];
    if (previousCropKey) orderedKeys.push(previousCropKey);
    scored.forEach(function (s) { orderedKeys.push(s.crop.key); });

    return orderedKeys.map(function (key, i) {
      const cropDef = Object.assign({ key: key }, cropsObj[key]);
      const result = scoreScenario(cropDef, previousCropKey, fieldState, data, allCropDefs);
      return Object.assign(
        { scenario_id: SCENARIO_IDS[i] || String(i + 1), rotation_plan: [farmer.previous_crop, cropDef.name] },
        result
      );
    });
  }

  // =========================================================================
  // 12. PAYLOAD
  // =========================================================================

  function buildPayload(inputs, data) {
    data = data || (window.FS.data ? window.FS.data.getAll() : window.FS_DATA);
    const fieldState = computeFieldState(inputs, data);
    const scenarios = listScenarios(inputs, data);
    const farmer = fieldState.farmer_input;

    return {
      status: 'success',
      request_metadata: {
        field_id: fieldState.request_metadata.field_id,
        location: fieldState.request_metadata.location,
        analysis_date: fieldState.request_metadata.analysis_date
      },
      inputs_and_context: {
        farmer_input: {
          previous_crop: farmer.previous_crop,
          irrigation_type: farmer.irrigation_type,
          priorities: farmer.priorities
        },
        soil_chemistry: {
          source: fieldState.soil_chemistry.source,
          pH: fieldState.soil_chemistry.pH,
          organic_carbon: fieldState.soil_chemistry.organic_carbon,
          water_retention: fieldState.soil_chemistry.water_retention
        },
        live_observation: {
          source: fieldState.live_observation.source,
          ndvi_current: fieldState.live_observation.ndvi_current,
          ndwi_current: fieldState.live_observation.ndwi_current,
          vegetation_status: fieldState.live_observation.vegetation_status
        },
        agrometeorological_context: {
          source: fieldState.agrometeorological_context.source,
          precipitation_outlook: fieldState.agrometeorological_context.precipitation_outlook,
          temperature_outlook: fieldState.agrometeorological_context.temperature_outlook,
          current_season_calendar: fieldState.agrometeorological_context.current_season_calendar
        }
      },
      scenario_engine_results: scenarios
    };
  }

  // =========================================================================
  // 13. BASIC INTERNAL SELF-CHECK
  // =========================================================================
  //
  // A lightweight structural sanity check (weights sum to 1, payload has the
  // right shape, etc). The FULL calibration assertion suite (sub-scores
  // within tolerance of the documented targets, verdict strings, ranking,
  // behavioural invariants) lives in engine.test.js, which overwrites
  // FS.engine.selfCheck with the richer runner once it loads.

  function selfCheck() {
    const results = [];
    function check(name, cond) { results.push({ name: name, pass: !!cond }); }

    try {
      const data = window.FS_DATA;
      check('FS_DATA is present', !!data && !!data.crops && !!data.field_state && !!data.soil && !!data.geoglam && !!data.calendar);

      const w = computeWeights(['Save Water', 'Reduce Climate Risk']);
      const sum = SCORE_CATEGORIES.reduce(function (s, c) { return s + w[c]; }, 0);
      check('category weights sum to 1', Math.abs(sum - 1) < 1e-9);

      const payload = buildPayload({}, data);
      check('buildPayload status is success', payload.status === 'success');
      check('scenario_engine_results is a non-empty array', Array.isArray(payload.scenario_engine_results) && payload.scenario_engine_results.length > 0);
    } catch (e) {
      results.push({ name: 'selfCheck threw an exception', pass: false, error: String(e && e.stack || e) });
    }

    return { pass: results.every(function (r) { return r.pass; }), results: results };
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  window.FS.engine = {
    computeFieldState: computeFieldState,
    listScenarios: listScenarios,
    scoreScenario: scoreScenario,
    computeEconomics: computeEconomics,
    computeConfidence: computeConfidence,
    buildPayload: buildPayload,
    selfCheck: selfCheck,
    // Exposed for engine.test.js and for the spec-writing agent to inspect
    // individual sub-score formulas / constants without re-deriving them.
    _internal: {
      clamp: clamp,
      minMaxNorm: minMaxNorm,
      IRRIGATION: IRRIGATION,
      waterDemandSuitability: waterDemandSuitability,
      soilHealthImpact: soilHealthImpact,
      climateResilience: climateResilience,
      farmerPriorityAlignment: farmerPriorityAlignment,
      computeWeights: computeWeights,
      verdictFromTotal: verdictFromTotal,
      cropKeyForName: cropKeyForName,
      allCropDefsFrom: allCropDefsFrom
    }
  };
})();
