// data/crops.js
//
// FieldShift — Crop parameter table (MVP / hackathon figures).
//
// IMPORTANT: these numbers are ILLUSTRATIVE assumptions assembled for a NASA
// Space Apps demo. They are loosely anchored to public reference ranges
// (FAO crop water requirement tables, FAO Ecocrop pH ranges, Indonesian
// BPS/Kementan production & price statistics) but have NOT been verified
// against a specific season or region beyond the single documented field
// (poly_idn_jt_001, Jawa Timur). Treat every figure as "directionally
// reasonable for East Java lowland cropping", not as ground truth.
//
// Field shape (per crop):
//   name                          English name (user-facing)
//   name_id                       Indonesian name (reference only, not shown in UI copy)
//   water_requirement_mm          Total crop water requirement for one growing cycle, mm
//                                 (FAO-56 style seasonal ETc; rice is intentionally the
//                                 highest figure in the table — paddy rice is grown
//                                 flooded, unlike the other "palawija" secondary crops)
//   cycle_days                    Typical days from planting to harvest
//   ph_min / ph_max               Tolerable soil pH band (FAO Ecocrop-style range)
//   soc_preference                'low' | 'medium' | 'high' — how much the crop benefits
//                                 from high soil organic carbon
//   nitrogen_fixing               true for legumes (soybean, mung bean, peanut) — these
//                                 fix atmospheric N via root rhizobia and enrich soil N
//                                 for the following season's crop
//   drought_sensitivity           0..1, higher = more vulnerable to below-average rainfall
//   heat_tolerance                0..1, higher = copes better with above-average temperature
//   base_yield_t_ha               Reference attainable yield, tonnes/hectare
//   farm_gate_price_idr_per_kg    Illustrative farm-gate price, IDR/kg (order-of-magnitude
//                                 from Kementan/BPS commodity price releases, NOT a live feed)
//   variable_cost_idr_per_ha      Seed+fertiliser+labour+ag-chem cash cost per hectare per cycle
//   capital_requirement_idr_per_ha Upfront capital a farmer must have available before planting
//   labour_days_per_ha            Person-days of labour required per hectare per cycle
//   market_price_volatility       0..1, higher = more exposed to price swings (e.g. import-
//                                 dependent soybean vs. government-buffered rice)
//   calendar_track                Which track(s) in data/calendar.js govern this crop's
//                                 planting windows. Rice and maize have dedicated tracks.
//                                 Soybean, mung bean and peanut are secondary ("palawija")
//                                 crops that are not separately tracked in the sourced
//                                 NASA Harvest calendar, so as a documented MVP
//                                 simplification they borrow the planting window of the
//                                 closest-behaving tracked crop (maize) — see the inline
//                                 comment on each crop below.

window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.crops = {
  source_note: "MVP illustrative figures — anchored to FAO crop-water-requirement ranges and Indonesian BPS/Kementan price orders of magnitude, but NOT independently verified. Do not treat as authoritative agronomic or market data.",
  crops: {
    rice: {
      name: "Rice",
      name_id: "Padi",
      water_requirement_mm: 1200, // FAO-56: flooded lowland (paddy) rice, ~1200-1500mm/cycle incl. land prep & percolation
      cycle_days: 115, // typical Indonesian inbred dry-season variety, ~110-120 days
      ph_min: 5.0,
      ph_max: 7.5, // paddy rice is unusually pH-tolerant because flooding buffers soil chemistry
      soc_preference: "medium",
      nitrogen_fixing: false,
      drought_sensitivity: 0.85, // very sensitive — needs standing water through most of the cycle
      heat_tolerance: 0.5, // moderate; heat during flowering can cause spikelet sterility
      base_yield_t_ha: 5.2, // approx. Indonesian national average paddy (GKG) yield, BPS order of magnitude
      farm_gate_price_idr_per_kg: 6000, // dry unmilled grain (GKG), Kementan reference range order of magnitude
      variable_cost_idr_per_ha: 12000000,
      capital_requirement_idr_per_ha: 10000000,
      labour_days_per_ha: 45,
      market_price_volatility: 0.2, // relatively stable — staple crop, government price floor/buffer stock
      calendar_track: ["rice_wet_season", "rice_dry_season"]
    },
    maize: {
      name: "Maize",
      name_id: "Jagung",
      water_requirement_mm: 600, // FAO-56 maize ETc range ~500-800mm/cycle; mid-point for a rainy-season crop
      cycle_days: 100,
      ph_min: 5.5,
      ph_max: 7.5,
      soc_preference: "high", // maize is a heavy feeder and responds strongly to high organic carbon / N availability
      nitrogen_fixing: false,
      drought_sensitivity: 0.55, // moderate — vulnerable mainly around tasseling/silking (early vegetative-repro)
      heat_tolerance: 0.6,
      base_yield_t_ha: 5.0, // approx. Indonesian national average maize yield, BPS order of magnitude
      farm_gate_price_idr_per_kg: 5000,
      variable_cost_idr_per_ha: 9000000,
      capital_requirement_idr_per_ha: 7500000,
      labour_days_per_ha: 30,
      market_price_volatility: 0.35,
      calendar_track: ["maize_rainy_season", "maize_dry_season"]
    },
    soybean: {
      name: "Soybean",
      name_id: "Kedelai",
      water_requirement_mm: 450, // FAO-56 soybean ETc range ~450-700mm; low end reflects short-cycle palawija use
      cycle_days: 80,
      ph_min: 6.0,
      ph_max: 7.0, // soybean is comparatively pH-fussy, prefers near-neutral soil
      soc_preference: "medium",
      nitrogen_fixing: true, // legume — fixes atmospheric N via rhizobia, enriches soil for the next crop
      drought_sensitivity: 0.35, // relatively drought-tolerant secondary crop
      heat_tolerance: 0.65,
      base_yield_t_ha: 1.5, // approx. Indonesian average soybean yield order of magnitude (BPS)
      farm_gate_price_idr_per_kg: 10000, // Indonesia is a large soybean importer — domestic price tracks global CBOT + import costs
      variable_cost_idr_per_ha: 7500000,
      capital_requirement_idr_per_ha: 6000000,
      labour_days_per_ha: 25,
      market_price_volatility: 0.45, // higher — import-dependent commodity, exposed to global price swings & FX
      // NOTE: no dedicated soybean track exists in the sourced NASA Harvest calendar (data/calendar.js only
      // tracks rice and maize). As an MVP simplification, soybean is treated as following the maize_rainy_season
      // planting window, since both are common wet-season "palawija" rotation crops planted after dry-season
      // rice harvest in East Java. This is a modelling approximation, not sourced calendar data.
      calendar_track: ["maize_rainy_season"]
    },
    mung_bean: {
      name: "Mung Bean",
      name_id: "Kacang Hijau",
      water_requirement_mm: 300, // FAO-56 mung bean is one of the lowest water-demand pulses, ~250-350mm, short cycle
      cycle_days: 60, // very short cycle — often used as a fast "catch crop" between rice cycles
      ph_min: 5.5,
      ph_max: 7.5,
      soc_preference: "low", // tolerant of lower-fertility soils, often grown specifically because it needs little input
      nitrogen_fixing: true,
      drought_sensitivity: 0.25, // bred/selected for drought escape via its short cycle
      heat_tolerance: 0.75, // a warm-season tropical legume
      base_yield_t_ha: 1.2,
      farm_gate_price_idr_per_kg: 22000, // niche/high-value pulse relative to staple grains
      variable_cost_idr_per_ha: 5500000,
      capital_requirement_idr_per_ha: 4500000,
      labour_days_per_ha: 20,
      market_price_volatility: 0.4,
      // Same MVP simplification as soybean: no dedicated calendar track sourced, so mung bean is modelled
      // against the maize_dry_season window since it is commonly relay-planted as a fast dry-season catch
      // crop on residual soil moisture after rice.
      calendar_track: ["maize_dry_season"]
    },
    peanut: {
      name: "Peanut",
      name_id: "Kacang Tanah",
      water_requirement_mm: 500, // FAO-56 groundnut ETc range ~450-700mm
      cycle_days: 100,
      ph_min: 5.5,
      ph_max: 7.0,
      soc_preference: "medium",
      nitrogen_fixing: true,
      drought_sensitivity: 0.4, // deep taproot gives moderate drought tolerance
      heat_tolerance: 0.7,
      base_yield_t_ha: 1.3,
      farm_gate_price_idr_per_kg: 15000,
      variable_cost_idr_per_ha: 8000000,
      capital_requirement_idr_per_ha: 6500000,
      labour_days_per_ha: 28,
      market_price_volatility: 0.4,
      // Same MVP simplification: no dedicated calendar track sourced, modelled against maize_rainy_season
      // since peanut is a common wet-season palawija rotation crop in this region.
      calendar_track: ["maize_rainy_season"]
    }
  }
};
