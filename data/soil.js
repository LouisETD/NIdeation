// data/soil.js
//
// Static soil chemistry extraction for field poly_idn_jt_001 (Jawa Timur, Indonesia).
//
// Source: SoilGrids (ISRIC) — NOT a NASA source. Included because it is the best
// public global soil raster available for an MVP demo; the UI must label it clearly
// as non-NASA so the source-attribution story stays honest.
//
// Extraction method: a regional SoilGrids GeoTIFF covering West Java & Banten was
// loaded in QGIS; the pixel underlying the field centroid was read with the
// "Identify Features" tool (point sample, not a zonal/plot average).
window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.soil = {
  field_id: "poly_idn_jt_001",
  source: "SoilGrids (ISRIC) — NOT a NASA source",
  provider: "ISRIC — World Soil Information",
  dataset: "SoilGrids 250m v2.0",
  extraction_method: "QGIS 'Identify Features' point read of the field centroid against a regional SoilGrids GeoTIFF clipped to West Java & Banten",
  extraction_date: "2026-09-22",
  resolution_m: 250,
  resolution_note: "SoilGrids ships as a 250m x 250m global raster. One pixel covers roughly 6.25 hectares, so this reading is a REGIONAL ESTIMATE for the raster cell the field falls in, not a direct plot-level soil test. Actual in-field values may vary, especially near cell boundaries or on heterogeneous smallholder plots.",
  properties: {
    ph: {
      value: 6.2,
      units: "pH (H2O)",
      label: "Slightly acidic — within the tolerable range for most staple and secondary crops"
    },
    organic_carbon: {
      value_dg_kg: 366,
      value_pct: 3.66,
      label: "High / Fertile",
      note: "366 dg/kg = 3.66% soil organic carbon — favourable for crops with high nutrient demand (e.g. maize)"
    },
    water_retention: {
      value: "Medium",
      note: "Derived qualitative class from SoilGrids texture/bulk-density fractions; not a direct field capacity measurement"
    }
  }
};
