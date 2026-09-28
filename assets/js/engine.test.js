// Focused checks for feasibility, risk-adjusted ranking, and explicit stress assumptions.
(function () {
  'use strict';

  function runSelfCheck() {
    var engine = window.FS.engine;
    var data = window.FS_DATA;
    var results = [];
    function record(name, pass, detail) {
      results.push({ name: name, pass: !!pass, detail: detail || '' });
    }
    function findCrop(scenarios, cropName) {
      return scenarios.find(function (scenario) { return scenario.rotation_plan[1] === cropName; });
    }
    function options(inputs, stress) {
      return engine.listScenarios(inputs || {}, data, stress);
    }

    try {
      var normal = options({}, engine.stressPresets.normal);
      var feasible = normal.filter(function (scenario) { return scenario.feasible; });
      record('Three next-season crop options include the current-crop baseline', normal.length === 3 && !!findCrop(normal, 'Rice'));
      record('All feasible options rank before infeasible options', normal.every(function (scenario, index) {
        return scenario.feasible || normal.slice(0, index).every(function (prior) { return prior.feasible; });
      }));
      record('Feasible options sort by descending risk-adjusted margin', feasible.length > 0 && feasible.slice(1).every(function (scenario, index) {
        return feasible[index].economics.risk_adjusted_margin_idr_per_ha >= scenario.economics.risk_adjusted_margin_idr_per_ha;
      }));

      var soybeanShort = findCrop(options({}, { rain_mm: 449, water_budget_mm: 0 }), 'Soybean');
      var soybeanExact = findCrop(options({}, { rain_mm: 450, water_budget_mm: 0 }), 'Soybean');
      record('Water gate fails one millimeter below requirement', !!soybeanShort && !soybeanShort.feasible && soybeanShort.gate_failures.some(function (reason) { return /450 mm/.test(reason); }));
      record('Water gate passes at the exact requirement', !!soybeanExact && soybeanExact.feasible && soybeanExact.water_required_mm === 450 && soybeanExact.water_available_mm === 450);

      var soybeanCapital = data.crops.crops.soybean.capital_requirement_idr_per_ha;
      var capitalExact = findCrop(options({ capital_available_idr_per_ha: soybeanCapital }, { rain_mm: 450, water_budget_mm: 0 }), 'Soybean');
      var capitalShort = findCrop(options({ capital_available_idr_per_ha: soybeanCapital - 1 }, { rain_mm: 450, water_budget_mm: 0 }), 'Soybean');
      record('Capital gate passes at the exact requirement', !!capitalExact && capitalExact.feasible);
      record('Capital gate fails one IDR below requirement', !!capitalShort && !capitalShort.feasible && capitalShort.gate_failures.some(function (reason) { return /Capital required/.test(reason); }));

      var normalWater = findCrop(options({}, Object.assign({}, engine.stressPresets.normal, { water_budget_mm: 1000 })), 'Soybean');
      var dryWater = findCrop(options({}, Object.assign({}, engine.stressPresets.dry, { water_budget_mm: 1000 })), 'Soybean');
      record('Reduced rainfall does not lower harvest without an explicit yield change', !!normalWater && !!dryWater && normalWater.economics.predicted_yield_t_ha === dryWater.economics.predicted_yield_t_ha && normalWater.economics.expected_net_margin_idr_per_ha.expected === dryWater.economics.expected_net_margin_idr_per_ha.expected);

      var zeroReserve = findCrop(options({}, { rain_mm: 480, water_budget_mm: 1000, risk_weight: 0 }), 'Soybean');
      var fullReserve = findCrop(options({}, { rain_mm: 480, water_budget_mm: 1000, risk_weight: 1 }), 'Soybean');
      record('Risk weight 0 returns expected margin; weight 1 returns downside margin', !!zeroReserve && !!fullReserve && zeroReserve.economics.risk_adjusted_margin_idr_per_ha === zeroReserve.economics.expected_net_margin_idr_per_ha.expected && fullReserve.economics.risk_adjusted_margin_idr_per_ha === fullReserve.economics.downside_margin_idr_per_ha);

      var priceShock = findCrop(options({}, { rain_mm: 480, water_budget_mm: 1000, price_change_pct: -20 }), 'Soybean');
      var yieldShock = findCrop(options({}, { rain_mm: 480, water_budget_mm: 1000, yield_change_pct: -20 }), 'Soybean');
      record('Price and harvest shocks each change expected margin downward', !!normalWater && !!priceShock && !!yieldShock && priceShock.economics.expected_net_margin_idr_per_ha.expected < normalWater.economics.expected_net_margin_idr_per_ha.expected && yieldShock.economics.expected_net_margin_idr_per_ha.expected < normalWater.economics.expected_net_margin_idr_per_ha.expected);

      var negativeMargin = options({}, { rain_mm: 480, water_budget_mm: 1000, price_change_pct: -50, yield_change_pct: -50 });
      record('Negative margins stay visible under severe price and harvest shocks', negativeMargin.filter(function (scenario) { return scenario.feasible; }).length > 0 && negativeMargin.filter(function (scenario) { return scenario.feasible; }).every(function (scenario) { return scenario.economics.expected_net_margin_idr_per_ha.expected < 0; }));

      var noFeasible = options({ capital_available_idr_per_ha: 0 }, { rain_mm: 0, water_budget_mm: 0 });
      record('No feasible crop produces no risk-adjusted leader', noFeasible.length === 3 && noFeasible.every(function (scenario) { return !scenario.feasible && scenario.verdict === 'Not Feasible'; }));

      var telemetry = data.telemetry;
      var camera = telemetry.camera_observation;
      record('Telemetry contract has both delivery modes and separate photo quality', telemetry.delivery_modes.realtime.sensor_interval_seconds === 60 && telemetry.delivery_modes.realtime.surface_photo_interval_seconds === 300 && telemetry.delivery_modes.batch.sensor_interval_seconds === 1800 && telemetry.delivery_modes.batch.surface_photos_per_day === 2 && camera.observed_at === null && camera.quality.status === 'missing');
      record('Sensor history has a source and observation time distinct from the missing photo', !!telemetry.source && !!telemetry.readings[telemetry.readings.length - 1].timestamp && telemetry.readings[telemetry.readings.length - 1].timestamp !== camera.observed_at && camera.source.indexOf('Camera Module 2') !== -1);

      var rice = data.crops.crops.rice;
      var mung = data.crops.crops.mung_bean;
      var normalPlant = engine.simulatePlantStress(rice, { week: 7, rainfall_pct: 100, irrigation_pct: 100, temperature_c: 0 });
      var dryRice = engine.simulatePlantStress(rice, { week: 7, rainfall_pct: 55, irrigation_pct: 100, temperature_c: 0 });
      var dryMung = engine.simulatePlantStress(mung, { week: 7, rainfall_pct: 55, irrigation_pct: 100, temperature_c: 0 });
      var hotPlant = engine.simulatePlantStress(rice, { week: 7, rainfall_pct: 80, irrigation_pct: 70, temperature_c: 2.5 });
      record('Stress Lab plant model has no money outputs and normal baseline has no climate stress', normalPlant.risk_index === 0 && normalPlant.plant_condition_index === 100 && !Object.keys(normalPlant).some(function (key) { return /margin|revenue|idr|cost/i.test(key); }));
      record('Drought-sensitive crop reports more water stress than drought-tolerant crop', dryRice.water_stress_pct > dryMung.water_stress_pct);
      record('Hot and dry case raises risk above normal baseline', hotPlant.risk_index > normalPlant.risk_index && hotPlant.heat_stress_pct > 0);

      var harvestShock = engine.simulatePlantStress(rice, { week: 7, rainfall_pct: 100, irrigation_pct: 100, temperature_c: 0, yield_change_pct: -20 });
      var priceShock = engine.simulatePlantStress(rice, { week: 7, rainfall_pct: 100, irrigation_pct: 100, temperature_c: 0, price_change_pct: -30 });
      record('Harvest assumption stays separate from climate stress', harvestShock.harvest_change_pct === -20 && harvestShock.risk_index === normalPlant.risk_index && harvestShock.harvest_context === 'Lower harvest assumption');
      record('Price shock changes qualitative context only', priceShock.profitability_context === 'Price headwind' && priceShock.risk_index === normalPlant.risk_index);
    } catch (error) {
      record('Decision-engine checks completed without exception', false, String(error && error.stack || error));
    }

    var passed = results.every(function (result) { return result.pass; });
    if (typeof console.table === 'function') console.table(results);
    console.log('FieldShift focused checks: ' + (passed ? 'ALL PASS' : 'FAIL') + ' (' + results.length + ' checks)');
    return { pass: passed, results: results };
  }

  window.FS = window.FS || {};
  window.FS.engine.selfCheck = runSelfCheck;
  window.FS.engine._lastSelfCheckResult = runSelfCheck();
})();
