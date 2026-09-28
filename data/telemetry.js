// 48 hours of synthetic probe, microclimate, flow, and read-only pump-status history at 30-minute intervals.
// One sensor-fault window demonstrates quality labeling. There is no captured camera image and no live device.
window.FS_DATA = window.FS_DATA || {};
window.FS_DATA.telemetry ={
  "node_id": "node_jt_001",
  "field_id": "poly_idn_jt_001",
  "source": "FieldShift synthetic IoT telemetry (illustrative, NOT live sensor data)",
  "interval_minutes": 30,
  "duration_hours": 48,
  "units": {
    "soil_moisture_15cm_pct_vwc": "% volumetric water content at 15cm depth",
    "air_temp_c": "degrees Celsius",
    "air_humidity_pct": "relative humidity %",
    "flow_lpm": "irrigation flow, litres per minute",
    "pump_state": "synthetic read-only status contact; 0 = off, 1 = on"
  },
  "annotations": {
    "irrigation_event": {
      "start_index": 60,
      "length_steps": 2,
      "note": "clean irrigation event: flow_lpm > 0, pump_state=1, visible 15cm moisture recovery"
    },
    "sensor_fault_window": {
      "start_index": 20,
      "length_steps": 6,
      "note": "flat-lined out-of-range 15cm reading (41.0% held constant) simulating a stuck/faulty sensor; used to demo the UI sensor-quality flag"
    }
  },
  "readings": [
    {
      "timestamp": "2026-09-23T00:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.83,
      "air_temp_c": 23.82,
      "air_humidity_pct": 83.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T00:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.78,
      "air_temp_c": 23.66,
      "air_humidity_pct": 84.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T01:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.76,
      "air_temp_c": 22.91,
      "air_humidity_pct": 87.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T01:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.71,
      "air_temp_c": 23.24,
      "air_humidity_pct": 85.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T02:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.41,
      "air_temp_c": 23.27,
      "air_humidity_pct": 86.4,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T02:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.45,
      "air_temp_c": 23.23,
      "air_humidity_pct": 88.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T03:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.46,
      "air_temp_c": 23.39,
      "air_humidity_pct": 87.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T03:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.13,
      "air_temp_c": 23.26,
      "air_humidity_pct": 86.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T04:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.13,
      "air_temp_c": 23.82,
      "air_humidity_pct": 84.6,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T04:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.98,
      "air_temp_c": 24.23,
      "air_humidity_pct": 84.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T05:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.01,
      "air_temp_c": 24.9,
      "air_humidity_pct": 82.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T05:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.85,
      "air_temp_c": 24.99,
      "air_humidity_pct": 79.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T06:00:00Z",
      "soil_moisture_15cm_pct_vwc": 30.86,
      "air_temp_c": 25.98,
      "air_humidity_pct": 77.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T06:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.74,
      "air_temp_c": 26.26,
      "air_humidity_pct": 75.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T07:00:00Z",
      "soil_moisture_15cm_pct_vwc": 30.78,
      "air_temp_c": 27.02,
      "air_humidity_pct": 73.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T07:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.63,
      "air_temp_c": 27.55,
      "air_humidity_pct": 72.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T08:00:00Z",
      "soil_moisture_15cm_pct_vwc": 30.59,
      "air_temp_c": 28.8,
      "air_humidity_pct": 68.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T08:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.29,
      "air_temp_c": 29.33,
      "air_humidity_pct": 66.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T09:00:00Z",
      "soil_moisture_15cm_pct_vwc": 30.38,
      "air_temp_c": 29.89,
      "air_humidity_pct": 66.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T09:30:00Z",
      "soil_moisture_15cm_pct_vwc": 30.12,
      "air_temp_c": 30.85,
      "air_humidity_pct": 62.4,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T10:00:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 31.41,
      "air_humidity_pct": 59.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T10:30:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 31.74,
      "air_humidity_pct": 55.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T11:00:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 32.27,
      "air_humidity_pct": 54.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T11:30:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 32.85,
      "air_humidity_pct": 52.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T12:00:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 33.25,
      "air_humidity_pct": 52.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T12:30:00Z",
      "soil_moisture_15cm_pct_vwc": 41.0,
      "air_temp_c": 33.41,
      "air_humidity_pct": 52.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": true
    },
    {
      "timestamp": "2026-09-23T13:00:00Z",
      "soil_moisture_15cm_pct_vwc": 29.53,
      "air_temp_c": 34.11,
      "air_humidity_pct": 50.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T13:30:00Z",
      "soil_moisture_15cm_pct_vwc": 29.37,
      "air_temp_c": 33.85,
      "air_humidity_pct": 50.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T14:00:00Z",
      "soil_moisture_15cm_pct_vwc": 29.46,
      "air_temp_c": 33.84,
      "air_humidity_pct": 52.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T14:30:00Z",
      "soil_moisture_15cm_pct_vwc": 29.37,
      "air_temp_c": 33.78,
      "air_humidity_pct": 49.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T15:00:00Z",
      "soil_moisture_15cm_pct_vwc": 29.01,
      "air_temp_c": 33.99,
      "air_humidity_pct": 48.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T15:30:00Z",
      "soil_moisture_15cm_pct_vwc": 29.15,
      "air_temp_c": 33.72,
      "air_humidity_pct": 51.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T16:00:00Z",
      "soil_moisture_15cm_pct_vwc": 28.79,
      "air_temp_c": 33.48,
      "air_humidity_pct": 50.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T16:30:00Z",
      "soil_moisture_15cm_pct_vwc": 28.73,
      "air_temp_c": 32.71,
      "air_humidity_pct": 56.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T17:00:00Z",
      "soil_moisture_15cm_pct_vwc": 28.76,
      "air_temp_c": 32.69,
      "air_humidity_pct": 55.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T17:30:00Z",
      "soil_moisture_15cm_pct_vwc": 28.45,
      "air_temp_c": 31.84,
      "air_humidity_pct": 56.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T18:00:00Z",
      "soil_moisture_15cm_pct_vwc": 28.33,
      "air_temp_c": 31.11,
      "air_humidity_pct": 61.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T18:30:00Z",
      "soil_moisture_15cm_pct_vwc": 28.1,
      "air_temp_c": 30.63,
      "air_humidity_pct": 62.5,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T19:00:00Z",
      "soil_moisture_15cm_pct_vwc": 27.93,
      "air_temp_c": 29.95,
      "air_humidity_pct": 65.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T19:30:00Z",
      "soil_moisture_15cm_pct_vwc": 27.8,
      "air_temp_c": 29.01,
      "air_humidity_pct": 69.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T20:00:00Z",
      "soil_moisture_15cm_pct_vwc": 27.9,
      "air_temp_c": 28.34,
      "air_humidity_pct": 68.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T20:30:00Z",
      "soil_moisture_15cm_pct_vwc": 27.66,
      "air_temp_c": 27.73,
      "air_humidity_pct": 72.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T21:00:00Z",
      "soil_moisture_15cm_pct_vwc": 27.57,
      "air_temp_c": 26.92,
      "air_humidity_pct": 74.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T21:30:00Z",
      "soil_moisture_15cm_pct_vwc": 27.54,
      "air_temp_c": 26.14,
      "air_humidity_pct": 77.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T22:00:00Z",
      "soil_moisture_15cm_pct_vwc": 27.38,
      "air_temp_c": 25.61,
      "air_humidity_pct": 80.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T22:30:00Z",
      "soil_moisture_15cm_pct_vwc": 27.17,
      "air_temp_c": 25.35,
      "air_humidity_pct": 80.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T23:00:00Z",
      "soil_moisture_15cm_pct_vwc": 27.08,
      "air_temp_c": 24.8,
      "air_humidity_pct": 81.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-23T23:30:00Z",
      "soil_moisture_15cm_pct_vwc": 26.85,
      "air_temp_c": 23.9,
      "air_humidity_pct": 85.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T00:00:00Z",
      "soil_moisture_15cm_pct_vwc": 26.81,
      "air_temp_c": 23.82,
      "air_humidity_pct": 84.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T00:30:00Z",
      "soil_moisture_15cm_pct_vwc": 26.57,
      "air_temp_c": 23.37,
      "air_humidity_pct": 85.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T01:00:00Z",
      "soil_moisture_15cm_pct_vwc": 26.61,
      "air_temp_c": 23.33,
      "air_humidity_pct": 87.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T01:30:00Z",
      "soil_moisture_15cm_pct_vwc": 26.64,
      "air_temp_c": 23.29,
      "air_humidity_pct": 87.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T02:00:00Z",
      "soil_moisture_15cm_pct_vwc": 26.54,
      "air_temp_c": 22.88,
      "air_humidity_pct": 90.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T02:30:00Z",
      "soil_moisture_15cm_pct_vwc": 26.44,
      "air_temp_c": 22.9,
      "air_humidity_pct": 86.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T03:00:00Z",
      "soil_moisture_15cm_pct_vwc": 26.38,
      "air_temp_c": 22.98,
      "air_humidity_pct": 89.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T03:30:00Z",
      "soil_moisture_15cm_pct_vwc": 26.13,
      "air_temp_c": 23.13,
      "air_humidity_pct": 88.5,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T04:00:00Z",
      "soil_moisture_15cm_pct_vwc": 26.17,
      "air_temp_c": 23.93,
      "air_humidity_pct": 83.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T04:30:00Z",
      "soil_moisture_15cm_pct_vwc": 25.99,
      "air_temp_c": 23.97,
      "air_humidity_pct": 85.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T05:00:00Z",
      "soil_moisture_15cm_pct_vwc": 25.86,
      "air_temp_c": 24.32,
      "air_humidity_pct": 82.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T05:30:00Z",
      "soil_moisture_15cm_pct_vwc": 25.96,
      "air_temp_c": 25.23,
      "air_humidity_pct": 79.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T06:00:00Z",
      "soil_moisture_15cm_pct_vwc": 30.25,
      "air_temp_c": 26.03,
      "air_humidity_pct": 76.2,
      "flow_lpm": 59.4,
      "pump_state": 1,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T06:30:00Z",
      "soil_moisture_15cm_pct_vwc": 34.78,
      "air_temp_c": 26.29,
      "air_humidity_pct": 77.1,
      "flow_lpm": 52.7,
      "pump_state": 1,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T07:00:00Z",
      "soil_moisture_15cm_pct_vwc": 34.74,
      "air_temp_c": 26.78,
      "air_humidity_pct": 76.6,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T07:30:00Z",
      "soil_moisture_15cm_pct_vwc": 34.69,
      "air_temp_c": 27.7,
      "air_humidity_pct": 70.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T08:00:00Z",
      "soil_moisture_15cm_pct_vwc": 34.49,
      "air_temp_c": 28.63,
      "air_humidity_pct": 67.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T08:30:00Z",
      "soil_moisture_15cm_pct_vwc": 34.59,
      "air_temp_c": 29.0,
      "air_humidity_pct": 67.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T09:00:00Z",
      "soil_moisture_15cm_pct_vwc": 34.22,
      "air_temp_c": 29.8,
      "air_humidity_pct": 64.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T09:30:00Z",
      "soil_moisture_15cm_pct_vwc": 34.26,
      "air_temp_c": 30.69,
      "air_humidity_pct": 61.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T10:00:00Z",
      "soil_moisture_15cm_pct_vwc": 34.06,
      "air_temp_c": 31.43,
      "air_humidity_pct": 57.6,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T10:30:00Z",
      "soil_moisture_15cm_pct_vwc": 34.15,
      "air_temp_c": 32.04,
      "air_humidity_pct": 57.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T11:00:00Z",
      "soil_moisture_15cm_pct_vwc": 34.11,
      "air_temp_c": 32.24,
      "air_humidity_pct": 56.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T11:30:00Z",
      "soil_moisture_15cm_pct_vwc": 33.92,
      "air_temp_c": 32.68,
      "air_humidity_pct": 55.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T12:00:00Z",
      "soil_moisture_15cm_pct_vwc": 33.71,
      "air_temp_c": 33.41,
      "air_humidity_pct": 53.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T12:30:00Z",
      "soil_moisture_15cm_pct_vwc": 33.66,
      "air_temp_c": 33.59,
      "air_humidity_pct": 49.6,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T13:00:00Z",
      "soil_moisture_15cm_pct_vwc": 33.68,
      "air_temp_c": 33.91,
      "air_humidity_pct": 52.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T13:30:00Z",
      "soil_moisture_15cm_pct_vwc": 33.65,
      "air_temp_c": 34.08,
      "air_humidity_pct": 49.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T14:00:00Z",
      "soil_moisture_15cm_pct_vwc": 33.37,
      "air_temp_c": 33.98,
      "air_humidity_pct": 49.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T14:30:00Z",
      "soil_moisture_15cm_pct_vwc": 33.21,
      "air_temp_c": 34.03,
      "air_humidity_pct": 49.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T15:00:00Z",
      "soil_moisture_15cm_pct_vwc": 33.14,
      "air_temp_c": 33.83,
      "air_humidity_pct": 49.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T15:30:00Z",
      "soil_moisture_15cm_pct_vwc": 33.08,
      "air_temp_c": 33.52,
      "air_humidity_pct": 51.8,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T16:00:00Z",
      "soil_moisture_15cm_pct_vwc": 33.09,
      "air_temp_c": 33.31,
      "air_humidity_pct": 53.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T16:30:00Z",
      "soil_moisture_15cm_pct_vwc": 32.95,
      "air_temp_c": 32.77,
      "air_humidity_pct": 55.3,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T17:00:00Z",
      "soil_moisture_15cm_pct_vwc": 32.63,
      "air_temp_c": 32.42,
      "air_humidity_pct": 55.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T17:30:00Z",
      "soil_moisture_15cm_pct_vwc": 32.55,
      "air_temp_c": 31.75,
      "air_humidity_pct": 58.5,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T18:00:00Z",
      "soil_moisture_15cm_pct_vwc": 32.41,
      "air_temp_c": 31.32,
      "air_humidity_pct": 57.4,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T18:30:00Z",
      "soil_moisture_15cm_pct_vwc": 32.17,
      "air_temp_c": 30.38,
      "air_humidity_pct": 62.4,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T19:00:00Z",
      "soil_moisture_15cm_pct_vwc": 32.24,
      "air_temp_c": 30.08,
      "air_humidity_pct": 63.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T19:30:00Z",
      "soil_moisture_15cm_pct_vwc": 32.17,
      "air_temp_c": 28.93,
      "air_humidity_pct": 67.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T20:00:00Z",
      "soil_moisture_15cm_pct_vwc": 32.02,
      "air_temp_c": 28.59,
      "air_humidity_pct": 69.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T20:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.77,
      "air_temp_c": 27.56,
      "air_humidity_pct": 72.9,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T21:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.69,
      "air_temp_c": 26.88,
      "air_humidity_pct": 75.0,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T21:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.43,
      "air_temp_c": 26.16,
      "air_humidity_pct": 75.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T22:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.42,
      "air_temp_c": 25.88,
      "air_humidity_pct": 76.4,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T22:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.12,
      "air_temp_c": 25.36,
      "air_humidity_pct": 80.2,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T23:00:00Z",
      "soil_moisture_15cm_pct_vwc": 31.13,
      "air_temp_c": 24.57,
      "air_humidity_pct": 82.1,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    },
    {
      "timestamp": "2026-09-24T23:30:00Z",
      "soil_moisture_15cm_pct_vwc": 31.05,
      "air_temp_c": 23.9,
      "air_humidity_pct": 86.7,
      "flow_lpm": 0.0,
      "pump_state": 0,
      "sensor_fault_flag": false
    }
  ],
  "delivery_modes": {
    "realtime": {
      "sensor_interval_seconds": 60,
      "surface_photo_interval_seconds": 300,
      "upload": "when_wifi_connected"
    },
    "batch": {
      "sensor_interval_seconds": 1800,
      "surface_photos_per_day": 2,
      "upload": "queue_locally_then_upload_when_connected"
    }
  },
  "camera_observation": {
    "source": "Camera Module 2 (planned; no demo image captured)",
    "observed_at": null,
    "uploaded_at": null,
    "quality": {
      "status": "missing",
      "is_current": false,
      "note": "No camera image exists in the synthetic telemetry dataset."
    },
    "value": null
  }
};
