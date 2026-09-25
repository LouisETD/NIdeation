// assets/js/engine.test.js
//
// FieldShift — dependency-free assertion runner for the decision engine.
//
// Load order: data/*.js, then assets/js/engine.js, then this file. On load
// it runs the full calibration + behavioural-invariant suite, logs a
// pass/fail table to the console, and overwrites window.FS.engine.selfCheck
// with a function that re-runs the same suite on demand and returns
// {pass, results[]}.
//
// No test framework, no assertions library — just plain functions and
// console.table/console.log so this can run unmodified in a plain browser
// <script> tag or in a bare `node` shim (see the project's verification
// harness, which does `global.window = globalThis` before loading the
// data/*.js + engine.js + this file in order).
(function () {
  'use strict';

  window.FS = window.FS || {};

  // Calibration targets from the FieldShift spec (field poly_idn_jt_001,
  // Jawa Timur, analysis date 2026-09-22, default farmer input).
  const TARGETS = {
    A: { rotation: ['Rice', 'Rice'], scores: { water_demand_suitability: 30, soil_health_impact: 45, climate_resilience: 40, farmer_priority_alignment: 25 }, verdict: 'Not Recommended' },
    B: { rotation: ['Rice', 'Soybean'], scores: { water_demand_suitability: 85, soil_health_impact: 90, climate_resilience: 80, farmer_priority_alignment: 95 }, verdict: 'Highly Recommended' },
    C: { rotation: ['Rice', 'Maize'], scores: { water_demand_suitability: 65, soil_health_impact: 80, climate_resilience: 60, farmer_priority_alignment: 70 }, verdict: 'Viable Alternative' }
  };
  const TOLERANCE = 5;

  function runSelfCheck() {
    const results = [];
    function record(name, pass, detail) {
      results.push({ name: name, pass: !!pass, detail: detail || '' });
    }

    let scenarios = [];
    try {
      scenarios = window.FS.engine.listScenarios({}, window.FS_DATA);
    } catch (e) {
      record('listScenarios() with default inputs did not throw', false, String(e && e.stack || e));
      return finish(results);
    }
    record('listScenarios() with default inputs did not throw', true);

    function findScenarioByRotation(rotation) {
      return scenarios.find(function (s) {
        return s.rotation_plan && s.rotation_plan[0] === rotation[0] && s.rotation_plan[1] === rotation[1];
      });
    }

    // --- Per-scenario sub-score, verdict checks -----------------------------
    const found = {};
    Object.keys(TARGETS).forEach(function (id) {
      const target = TARGETS[id];
      const scenario = findScenarioByRotation(target.rotation);
      found[id] = scenario;

      record('Scenario ' + id + ' (' + target.rotation.join('→') + ') exists in listScenarios()', !!scenario);
      if (!scenario) return;

      record('Scenario ' + id + ' is feasible (not gated out)', scenario.feasible === true, JSON.stringify(scenario.gate_failures));

      Object.keys(target.scores).forEach(function (key) {
        const expected = target.scores[key];
        const actual = scenario.scores ? scenario.scores[key] : undefined;
        const diff = (typeof actual === 'number') ? Math.abs(actual - expected) : Infinity;
        record(
          'Scenario ' + id + ' ' + key + ' within ±' + TOLERANCE + ' of ' + expected,
          diff <= TOLERANCE,
          'actual=' + actual + ' expected=' + expected + ' diff=' + diff
        );
      });

      record(
        'Scenario ' + id + ' verdict === "' + target.verdict + '"',
        scenario.verdict === target.verdict,
        'actual="' + scenario.verdict + '"'
      );
    });

    // --- Ranking order: B > C > A ------------------------------------------
    if (found.A && found.B && found.C) {
      record('Ranking order B > C > A (by weighted total)', found.B.total > found.C.total && found.C.total > found.A.total,
        'A=' + found.A.total + ' B=' + found.B.total + ' C=' + found.C.total);
    } else {
      record('Ranking order B > C > A (by weighted total)', false, 'one or more scenarios missing');
    }

    // --- Behavioural invariant 1: A never "Highly Recommended" under -------
    //     Rainfed + below-average rainfall, regardless of irrigation choice
    //     that keeps it rainfed.
    try {
      const scenariosRainfed = window.FS.engine.listScenarios({ irrigation_type: 'Rainfed' }, window.FS_DATA);
      const aRainfed = scenariosRainfed.find(function (s) { return s.rotation_plan[0] === 'Rice' && s.rotation_plan[1] === 'Rice'; });
      record(
        'Scenario A (Rice→Rice) is never "Highly Recommended" under Rainfed + below-average rainfall',
        !!aRainfed && aRainfed.verdict !== 'Highly Recommended',
        aRainfed ? ('verdict=' + aRainfed.verdict + ' total=' + aRainfed.total) : 'scenario not found'
      );
    } catch (e) {
      record('Scenario A is never "Highly Recommended" under Rainfed + below-average rainfall', false, String(e));
    }

    // --- Behavioural invariant 2: switching Rainfed -> Drip raises A's -----
    //     water_demand_suitability.
    try {
      const rainfedScenarios = window.FS.engine.listScenarios({ irrigation_type: 'Rainfed' }, window.FS_DATA);
      const dripScenarios = window.FS.engine.listScenarios({ irrigation_type: 'Drip' }, window.FS_DATA);
      const aRainfed = rainfedScenarios.find(function (s) { return s.rotation_plan[1] === 'Rice'; });
      const aDrip = dripScenarios.find(function (s) { return s.rotation_plan[1] === 'Rice'; });
      const waterRainfed = aRainfed && aRainfed.scores ? aRainfed.scores.water_demand_suitability : undefined;
      const waterDrip = aDrip && aDrip.scores ? aDrip.scores.water_demand_suitability : undefined;
      record(
        'Rainfed → Drip raises scenario A\'s water_demand_suitability',
        typeof waterRainfed === 'number' && typeof waterDrip === 'number' && waterDrip > waterRainfed,
        'rainfed=' + waterRainfed + ' drip=' + waterDrip
      );
    } catch (e) {
      record('Rainfed → Drip raises scenario A\'s water_demand_suitability', false, String(e));
    }

    // --- Behavioural invariant 3 (REWRITTEN — see note below): deselecting -
    //     "Save Water" still leaves B (Soybean) ranked ahead of C (Maize).
    //
    // This used to assert the OPPOSITE direction ("deselecting Save Water
    // NARROWS B's lead over C"). That assertion was written to match the
    // output of a hardcoded-denominator bug in farmerPriorityAlignment
    // (PRIORITY_NORMALIZATION_N = 2, see engine.js DEFECT 1 FIX comment) —
    // it tested the bug's symptom, not a real product requirement. Once
    // farmerPriorityAlignment correctly averages over only the ACTIVE
    // priorities, the numbers show the opposite happens here: Soybean's
    // edge over Maize on the "Reduce Climate Risk" fit (0.76 vs 0.47,
    // min-max normalized) is actually WIDER than its edge on the "Save
    // Water" fit (0.83 vs 0.67). So dropping "Save Water" and keeping only
    // "Reduce Climate Risk" active leaves Soybean's priority-alignment
    // sub-score comfortably ahead of Maize's (measured: 92 vs 66, a bigger
    // gap than the two-priority case's 95 vs 74) — i.e. B's total lead over
    // C actually WIDENS slightly here (measured ~18.8 -> ~19.9), it does not
    // narrow. There is no general agronomic law that removing one matched
    // priority must narrow a leading crop's advantage — it depends entirely
    // on how differentiated the crops are on the *remaining* active
    // priorities, which here happens to favor Soybean even more. The
    // durable, model-independent invariant is that B keeps outranking C
    // (the ranking does not flip) — that is what we assert below, plus the
    // now-corrected "Save Water alone" and priority-bounds checks further
    // down guard the actual Defect 1 behaviour directly.
    try {
      const withSaveWater = window.FS.engine.listScenarios({ priorities: ['Save Water', 'Reduce Climate Risk'] }, window.FS_DATA);
      const withoutSaveWater = window.FS.engine.listScenarios({ priorities: ['Reduce Climate Risk'] }, window.FS_DATA);

      const bWith = withSaveWater.find(function (s) { return s.rotation_plan[1] === 'Soybean'; });
      const cWith = withSaveWater.find(function (s) { return s.rotation_plan[1] === 'Maize'; });
      const bWithout = withoutSaveWater.find(function (s) { return s.rotation_plan[1] === 'Soybean'; });
      const cWithout = withoutSaveWater.find(function (s) { return s.rotation_plan[1] === 'Maize'; });

      const leadWith = bWith.total - cWith.total;
      const leadWithout = bWithout.total - cWithout.total;

      record(
        'B (Soybean) still outranks C (Maize) after deselecting "Save Water" (ranking does not flip)',
        leadWith > 0 && leadWithout > 0,
        'leadWith=' + leadWith.toFixed(2) + ' leadWithout=' + leadWithout.toFixed(2)
      );
    } catch (e) {
      record('B (Soybean) still outranks C (Maize) after deselecting "Save Water" (ranking does not flip)', false, String(e));
    }

    // --- Defect 1 regression: "Save Water" alone must give Soybean a HIGH --
    //     alignment score (>=90). Soybean is the clear water-saving choice
    //     in this catalogue (450mm vs Rice's 1200mm), so a farmer who cares
    //     ONLY about saving water should see a near-perfect match, not a
    //     score depressed by an unrelated fixed denominator (the old bug
    //     produced 61 here).
    try {
      const saveWaterOnly = window.FS.engine.listScenarios({ priorities: ['Save Water'] }, window.FS_DATA);
      const b = saveWaterOnly.find(function (s) { return s.rotation_plan[1] === 'Soybean'; });
      const score = b && b.scores ? b.scores.farmer_priority_alignment : undefined;
      record(
        '"Save Water" selected alone gives B (Soybean) farmer_priority_alignment >= 90',
        typeof score === 'number' && score >= 90,
        'actual=' + score
      );
    } catch (e) {
      record('"Save Water" selected alone gives B (Soybean) farmer_priority_alignment >= 90', false, String(e));
    }

    // --- Defect 1 regression: every sub-score of every scenario stays within
    //     [0, 100] and finite for EVERY subset (0..5) of the five priorities,
    //     including the empty set. Guards against both the old saturation
    //     (all-five case used to hit exactly 100) and any future regression.
    try {
      const ALL_PRIORITIES = ['Save Water', 'Maximize Yield', 'Reduce Climate Risk', 'Improve Soil Health', 'Low Capital'];
      let outOfRange = [];
      for (let mask = 0; mask < 32; mask++) {
        const priorities = ALL_PRIORITIES.filter(function (_, i) { return mask & (1 << i); });
        const scenarios = window.FS.engine.listScenarios({ priorities: priorities }, window.FS_DATA);
        scenarios.forEach(function (s) {
          if (!s.scores) return;
          Object.keys(s.scores).forEach(function (key) {
            const v = s.scores[key];
            if (!(typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100)) {
              outOfRange.push({ mask: mask, priorities: priorities, scenario: s.scenario_id, key: key, value: v });
            }
          });
        });
      }
      record(
        'Every sub-score stays within [0,100] and finite across all 32 priority subsets',
        outOfRange.length === 0,
        outOfRange.length ? JSON.stringify(outOfRange.slice(0, 5)) : ''
      );
    } catch (e) {
      record('Every sub-score stays within [0,100] and finite across all 32 priority subsets', false, String(e));
    }

    // --- Defect 2 regression: under Drip + a below-average precipitation ---
    //     outlook, B (Soybean, ~450mm) must still beat A (Rice, ~1200mm) on
    //     water_demand_suitability by at least 15 points. Before the fix,
    //     Drip's high capacity saturated BOTH crops to exactly 100.
    try {
      const dripScenarios = window.FS.engine.listScenarios({ irrigation_type: 'Drip' }, window.FS_DATA);
      const aDrip = dripScenarios.find(function (s) { return s.rotation_plan[1] === 'Rice'; });
      const bDrip = dripScenarios.find(function (s) { return s.rotation_plan[1] === 'Soybean'; });
      const waterA = aDrip && aDrip.scores ? aDrip.scores.water_demand_suitability : undefined;
      const waterB = bDrip && bDrip.scores ? bDrip.scores.water_demand_suitability : undefined;
      record(
        'Under Drip + below-average outlook, B\'s water score exceeds A\'s by >= 15',
        typeof waterA === 'number' && typeof waterB === 'number' && (waterB - waterA) >= 15,
        'A=' + waterA + ' B=' + waterB + ' gap=' + (typeof waterA === 'number' && typeof waterB === 'number' ? (waterB - waterA) : 'n/a')
      );
    } catch (e) {
      record('Under Drip + below-average outlook, B\'s water score exceeds A\'s by >= 15', false, String(e));
    }

    // --- Defect 2 regression: water-suitability ordering rice < maize < ----
    //     soybean must hold for EVERY irrigation type, not just Rainfed.
    try {
      const cropsObj = window.FS_DATA.crops.crops;
      const internal = window.FS.engine._internal;
      const agromet = window.FS_DATA.field_state.agrometeorological_context;
      const ndwi = window.FS_DATA.field_state.live_observation.ndwi_current;
      let allOrdered = true;
      const detail = [];
      ['Rainfed', 'Furrow', 'Sprinkler', 'Drip'].forEach(function (irrType) {
        const riceScore = internal.waterDemandSuitability(Object.assign({ key: 'rice' }, cropsObj.rice), irrType, agromet, ndwi);
        const maizeScore = internal.waterDemandSuitability(Object.assign({ key: 'maize' }, cropsObj.maize), irrType, agromet, ndwi);
        const soyScore = internal.waterDemandSuitability(Object.assign({ key: 'soybean' }, cropsObj.soybean), irrType, agromet, ndwi);
        const ordered = riceScore < maizeScore && maizeScore < soyScore;
        if (!ordered) allOrdered = false;
        detail.push(irrType + ':rice=' + riceScore + ',maize=' + maizeScore + ',soy=' + soyScore + (ordered ? ' OK' : ' FAIL'));
      });
      record(
        'Water-suitability ordering rice < maize < soybean holds for Rainfed/Furrow/Sprinkler/Drip',
        allOrdered,
        detail.join(' | ')
      );
    } catch (e) {
      record('Water-suitability ordering rice < maize < soybean holds for Rainfed/Furrow/Sprinkler/Drip', false, String(e));
    }

    // --- buildPayload shape sanity ------------------------------------------
    try {
      const payload = window.FS.engine.buildPayload({}, window.FS_DATA);
      record('buildPayload() status is "success"', payload.status === 'success');
      record('buildPayload() has request_metadata.field_id', payload.request_metadata && payload.request_metadata.field_id === 'poly_idn_jt_001');
      record('buildPayload() agrometeorological_context.source mentions NASA POWER', /NASA POWER/.test(payload.inputs_and_context.agrometeorological_context.source));
      record('buildPayload() scenario_engine_results has scenario A/B/C ids', ['A', 'B', 'C'].every(function (id) {
        return payload.scenario_engine_results.some(function (s) { return s.scenario_id === id; });
      }));
    } catch (e) {
      record('buildPayload() basic shape checks', false, String(e));
    }

    return finish(results);
  }

  function finish(results) {
    const pass = results.every(function (r) { return r.pass; });
    logTable(results);
    return { pass: pass, results: results };
  }

  function logTable(results) {
    const rows = results.map(function (r) {
      return { status: r.pass ? 'PASS' : 'FAIL', name: r.name, detail: r.detail || '' };
    });
    if (typeof console.table === 'function') {
      console.table(rows);
    } else {
      rows.forEach(function (r) { console.log('[' + r.status + '] ' + r.name + (r.detail ? ' (' + r.detail + ')' : '')); });
    }
    const failCount = rows.filter(function (r) { return r.status === 'FAIL'; }).length;
    console.log(
      'FieldShift engine self-check: ' + (failCount === 0 ? 'ALL PASS' : (failCount + ' FAILING')) +
      ' (' + rows.length + ' checks)'
    );
  }

  // Run immediately on load and log the table...
  const initialResult = runSelfCheck();

  // ...and expose selfCheck() so it can be re-run on demand (this overwrites
  // engine.js's lightweight structural selfCheck with the full suite).
  window.FS.engine.selfCheck = runSelfCheck;
  window.FS.engine._lastSelfCheckResult = initialResult;
})();
