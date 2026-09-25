// data/geoglam.js
//
// GEOGLAM (Group on Earth Observations Global Agricultural Monitoring) context
// for the Jawa Timur field. Two parts:
//  1. The Sept-Nov 2026 agrometeorological outlook + Early Warning No. 119 regional
//     crop-condition commentary for Indonesia (rice & maize).
//  2. A 12-month historic crop-condition percentage table (failure/poor/watch/
//     favourable/exceptional) pulled from the GEOGLAM Crop Monitor tool, used to
//     drive a small trend chart in the UI.
//
// Source for the historic table: https://cropmonitortools.org/tools/cmet/
window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.geoglam = {
  field_id: "poly_idn_jt_001",
  source: "GEOGLAM Crop Monitor",
  provider: "Group on Earth Observations Global Agricultural Monitoring (GEOGLAM)",

  // Sept-Nov 2026 agrometeorological outlook used directly by the decision engine.
  outlook: {
    period: "Sept-Nov 2026",
    precipitation_outlook: "Below-average",
    temperature_outlook: "Above-average",
    current_season_calendar: "Dry-season (Harvesting phase for Rice)",
    warning_text: "GEOGLAM projection (Sept-Nov 2026) indicates below-average rainfall and above-average temperature in Indonesia."
  },

  // GEOGLAM Early Warning No. 119, September 2026 — regional (country-level) crop
  // condition commentary. This is a REGIONAL signal; the engine also layers in the
  // field-local NDWI/rainfall exposure, which is why a crop can be regionally
  // "Favourable" yet still carry a local trade-off risk (see engine.js comments).
  early_warning: {
    bulletin: "GEOGLAM Early Warning No. 119",
    date: "2026-09",
    country: "Indonesia",
    crops: {
      rice: {
        status: "Favourable",
        drivers: "Sufficient rainfall (late July-early Aug), water, and sunlight",
        area_trend: "-3% vs last year"
      },
      maize: {
        status: "Favourable",
        drivers: "Adequate irrigation water and sufficient sunlight",
        area_trend: "-1% vs last year"
      }
    }
  },

  // 12-month historic crop condition percentages (national/regional composite),
  // most recent first, source: GEOGLAM Crop Monitor Tool (CMET).
  // Columns: date, failure %, poor %, watch %, favourable %, exceptional %
  historic_condition: [
    { date: "2026-08-28", failure: 0, poor: 0.26, watch: 16.38, favourable: 83.36, exceptional: 0.0 },
    { date: "2026-07-28", failure: 0, poor: 0.0, watch: 15.85, favourable: 84.15, exceptional: 0.0 },
    { date: "2026-06-28", failure: 0, poor: 0.01, watch: 17.55, favourable: 82.44, exceptional: 0.0 },
    { date: "2026-05-28", failure: 0, poor: 0.02, watch: 4.26, favourable: 95.55, exceptional: 0.18 },
    { date: "2026-04-28", failure: 0, poor: 0.08, watch: 3.96, favourable: 95.96, exceptional: 0.0 },
    { date: "2026-03-28", failure: 0, poor: 0.14, watch: 5.54, favourable: 94.32, exceptional: 0.0 },
    { date: "2026-02-28", failure: 0, poor: 1.22, watch: 8.68, favourable: 90.11, exceptional: 0.0 },
    { date: "2026-01-28", failure: 0, poor: 2.04, watch: 5.79, favourable: 92.17, exceptional: 0.0 },
    { date: "2025-11-28", failure: 0, poor: 5.07, watch: 3.47, favourable: 91.45, exceptional: 0.0 },
    { date: "2025-10-28", failure: 0, poor: 2.34, watch: 0.99, favourable: 96.67, exceptional: 0.0 },
    { date: "2025-09-28", failure: 0, poor: 1.68, watch: 0.91, favourable: 97.05, exceptional: 0.35 },
    { date: "2025-08-28", failure: 0, poor: 0.31, watch: 0.61, favourable: 98.47, exceptional: 0.61 }
  ],
  historic_condition_source_url: "https://cropmonitortools.org/tools/cmet/"
};
