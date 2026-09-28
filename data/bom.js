/* Published read-only pilot kit BOM. Kept aligned with data/bom.json. */
window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.bom = {
  "meta": {
    "title": "FieldShift Ground Truth Pilot Kit — Indicative BOM",
    "disclaimer": "Planning list only. Prices require local quotes. Check interface compatibility, enclosure protection, and electrical isolation before field installation.",
    "scope": "One read-only kit for one plot",
    "power": "Protected 5 V supply",
    "connectivity": "Wi-Fi",
    "last_updated": "2026-09-27"
  },
  "device_parts": [
    {
      "part_id": "pi-zero-2-w",
      "name": "Raspberry Pi Zero 2 W",
      "spec": {
        "Processor": "Quad-core 64-bit Arm Cortex-A53",
        "Connectivity": "2.4 GHz Wi-Fi",
        "Camera": "CSI camera connector",
        "Power": "5 V USB"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "compute",
      "why": "Captures timestamped readings and queues records locally when Wi-Fi is unavailable.",
      "datasheet_url": "https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/"
    },
    {
      "part_id": "camera-module-2",
      "name": "Camera Module 2 + compatible ribbon",
      "spec": {
        "Role": "Fixed view of soil surface",
        "Measurement": "Qualitative visual evidence",
        "Interval": "Every 5 min realtime; two photos daily in batch"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "imaging",
      "why": "Documents visible surface condition; does not measure subsurface moisture or soil chemistry.",
      "datasheet_url": "https://www.raspberrypi.com/documentation/computers/camera_software.html"
    },
    {
      "part_id": "soil-moisture-probe",
      "name": "Calibratable root-zone soil moisture probe",
      "spec": {
        "Role": "Numeric soil moisture",
        "Installation": "One probe in root zone",
        "Calibration": "Calibrate against local soil before reporting accuracy"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "soil sensing",
      "why": "Provides a numeric moisture reading; local calibration is needed for stronger volumetric water content accuracy.",
      "datasheet_url": "https://publications.metergroup.com/Sales%20and%20Support/METER%20Environment/Website%20Articles/how-calibrate-soil-moisture-sensors.pdf"
    },
    {
      "part_id": "air-temperature-humidity",
      "name": "Air temperature / humidity sensor",
      "spec": {
        "Role": "Plot microclimate",
        "Interface": "I2C",
        "Measurement": "Air temperature and relative humidity"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "microclimate",
      "why": "Adds local air context beside regional weather data.",
      "datasheet_url": null
    },
    {
      "part_id": "inline-flow-meter",
      "name": "Inline water flow meter",
      "spec": {
        "Role": "Water volume / flow rate",
        "Interface": "Pulse output with level interface as required",
        "Installation": "Existing irrigation pipe"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "water sensing",
      "why": "Measures delivered water without controlling the irrigation line.",
      "datasheet_url": null
    },
    {
      "part_id": "isolated-pump-status-input",
      "name": "Isolated pump-status input",
      "spec": {
        "Role": "Read existing low-voltage status contact",
        "Interface": "Opto-isolated digital input",
        "Output": "Read-only status"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "status sensing",
      "why": "Reads compatible pump status. Does not switch mains or send pump commands.",
      "datasheet_url": null
    },
    {
      "part_id": "power-enclosure-mount",
      "name": "Protected 5 V supply, enclosure, mount, and cables",
      "spec": {
        "Power": "Protected 5 V USB supply",
        "Connectivity": "Wi-Fi",
        "Purpose": "Weather protection and mounting",
        "Excluded": "Solar sizing and battery system"
      },
      "qty": 1,
      "unit_cost_usd": null,
      "unit_cost_idr": null,
      "supplier_class": "local quote needed",
      "layer": "power and mounting",
      "why": "Keeps pilot power and mounting simple for a student-built, one-plot kit.",
      "datasheet_url": null
    }
  ],
  "device_total_usd": null,
  "device_total_idr": null,
  "excluded_components": [
    "Pump-actuation relay",
    "Irrigation valve",
    "LoRa radio",
    "Solar panel and battery system",
    "Mains switching"
  ]
};
