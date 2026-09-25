// data/field_state.js
//
// Aggregated Field State — the single documented reference field for this demo,
// combining the request metadata, default farmer input, soil chemistry, live
// vegetation observation and agrometeorological context extracted from the
// team's research PDF. This is the DEFAULT/DEMO field state; assets/js/engine.js
// computeFieldState() merges runtime inputs on top of this object, and
// assets/js/data.js may overlay live NASA POWER data on top of the
// agrometeorological_context portion when running in "live" mode.
window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.field_state = {
  request_metadata: {
    field_id: "poly_idn_jt_001",
    location: "Jawa Timur, Indonesia",
    analysis_date: "2026-09-22",
    centroid: { lat: -7.75, lon: 112.6 } // approximate Jawa Timur centroid used for NASA POWER point queries
  },

  // Default farmer input (sample/default values from the PDF). The UI is expected
  // to let the farmer override these; the engine takes an `inputs` object at
  // runtime and falls back to these defaults for any field left unset.
  farmer_input: {
    previous_crop: "Rice",
    irrigation_type: "Rainfed",
    priorities: ["Save Water", "Reduce Climate Risk"],
    // Not sourced from the PDF — MVP default assumptions so the capital-gate and
    // economics math have somewhere to start from. Documented so a reviewer can
    // sanity-check them; the UI should let the farmer edit both.
    area_ha: 1,
    capital_available_idr_per_ha: 15000000
  },

  soil_chemistry: {
    source: "Local Soil DB (Static - Extracted from SoilGrids GeoTIFF)",
    pH: 6.2,
    organic_carbon: "366 dg/kg (3.66% - High/Fertile)",
    organic_carbon_pct: 3.66,
    soc_level: "high",
    water_retention: "Medium"
  },

  live_observation: {
    source: "Copernicus Sentinel-2 L2A",
    ndvi_current: 0.42,
    ndwi_current: -0.15,
    vegetation_status: "Declining / Drying"
  },

  agrometeorological_context: {
    source: "NASA POWER & GEOGLAM",
    precipitation_outlook: "Below-average",
    temperature_outlook: "Above-average",
    current_season_calendar: "Dry-season (Harvesting phase for Rice)"
  }
};
