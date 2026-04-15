export const ROUTES = [
  {
    id: "route_1",
    name: "Andheri → BKC",
    // [lng, lat] — Mapbox convention
    coordinates: [
      [72.8562, 19.1197], // Andheri East, SV Road
      [72.8761, 19.1138], // JVLR Junction
      [72.9063, 19.1172], // Powai Flyover
      [72.9198, 19.0964], // LBS Marg Entry
      [72.9301, 19.0712], // Kurla depot area
      [72.8656, 19.0607], // BKC Gate 4
    ],
    incidents_coords: [
      { lng: 72.8761, lat: 19.1138, type: "accident" },    // JVLR Junction
      { lng: 72.9198, lat: 19.0964, type: "waterlogging" }, // LBS Marg underpass
    ],
    segments: [
      {
        name: "Andheri East SV Road to JVLR Junction",
        length_km: 2.4,
        base_speed_kmh: 28,
      },
      {
        name: "JVLR Junction to Powai Flyover",
        length_km: 3.1,
        base_speed_kmh: 35,
      },
      {
        name: "Powai Flyover to LBS Marg Entry",
        length_km: 2.7,
        base_speed_kmh: 30,
      },
      {
        name: "LBS Marg to BKC Gate 4",
        length_km: 4.2,
        base_speed_kmh: 22,
      },
    ],
    incidents: [
      {
        type: "accident",
        location: "JVLR Junction near Rambaug signal",
        reported_minutes_ago: 18,
        severity: 3,
      },
      {
        type: "waterlogging",
        location: "LBS Marg underpass near Kurla depot",
        reported_minutes_ago: 45,
        severity: 2,
      },
    ],
    congestion_index: 72,
    time_risk_table: {
      "7-10": 1.5,
      "10-16": 0.85,
      "16-21": 1.4,
      "21-7": 0.65,
    },
  },

  {
    id: "route_2",
    name: "Borivali → Churchgate",
    coordinates: [
      [72.8562, 19.2307], // Borivali Station
      [72.8553, 19.1652], // WEH Borivali entry
      [72.8491, 19.1197], // WEH Andheri
      [72.8347, 19.0558], // Bandra Flyover
      [72.8392, 19.0390], // Mahim Causeway
      [72.8090, 19.0277], // Haji Ali Junction
      [72.8217, 18.9322], // Marine Drive / Churchgate
    ],
    incidents_coords: [
      { lng: 72.8491, lat: 19.1652, type: "breakdown" },    // WEH Goregaon
      { lng: 72.8392, lat: 19.0390, type: "waterlogging" }, // Mahim Causeway
      { lng: 72.8347, lat: 19.0558, type: "accident" },     // Bandra Flyover
    ],
    segments: [
      {
        name: "Borivali Station Road to Western Express Highway",
        length_km: 1.8,
        base_speed_kmh: 20,
      },
      {
        name: "Western Express Highway Borivali to Andheri",
        length_km: 12.5,
        base_speed_kmh: 55,
      },
      {
        name: "Andheri to Bandra Flyover",
        length_km: 8.0,
        base_speed_kmh: 40,
      },
      {
        name: "Bandra Flyover to Mahim Causeway",
        length_km: 3.6,
        base_speed_kmh: 30,
      },
      {
        name: "Mahim Causeway to Haji Ali Junction",
        length_km: 4.3,
        base_speed_kmh: 25,
      },
      {
        name: "Haji Ali Junction to Marine Drive Churchgate",
        length_km: 5.1,
        base_speed_kmh: 35,
      },
    ],
    incidents: [
      {
        type: "breakdown",
        location: "WEH near Goregaon flyover, lane 2",
        reported_minutes_ago: 9,
        severity: 2,
      },
      {
        type: "waterlogging",
        location: "Mahim Causeway east end",
        reported_minutes_ago: 62,
        severity: 1,
      },
      {
        type: "accident",
        location: "Bandra Flyover approach, Khar side",
        reported_minutes_ago: 31,
        severity: 3,
      },
    ],
    congestion_index: 85,
    time_risk_table: {
      "7-10": 1.6,
      "10-16": 0.9,
      "16-21": 1.5,
      "21-7": 0.6,
    },
  },

  {
    id: "route_3",
    name: "Thane → Powai",
    coordinates: [
      [72.9781, 19.1820], // Thane Station
      [72.9615, 19.2109], // Ghodbunder Road entry
      [72.9301, 19.2284], // Pokhran Road 2 Junction
      [72.9542, 19.1983], // Eastern Express Hwy Thane
      [72.9988, 19.1563], // Airoli Bridge approach
      [72.9063, 19.1172], // Powai Lake Road
    ],
    incidents_coords: [
      { lng: 72.9615, lat: 19.2109, type: "waterlogging" }, // Ghodbunder Teen Hath Naka
      { lng: 72.9988, lat: 19.1563, type: "breakdown" },    // EEH Mulund toll
    ],
    segments: [
      {
        name: "Thane Station to Ghodbunder Road Entry",
        length_km: 2.1,
        base_speed_kmh: 18,
      },
      {
        name: "Ghodbunder Road to Pokhran Road 2 Junction",
        length_km: 5.4,
        base_speed_kmh: 42,
      },
      {
        name: "Pokhran Road 2 to Eastern Express Highway Thane",
        length_km: 3.8,
        base_speed_kmh: 48,
      },
      {
        name: "Eastern Express Highway to Airoli Bridge",
        length_km: 6.2,
        base_speed_kmh: 60,
      },
      {
        name: "Airoli Bridge to Powai Lake Road",
        length_km: 4.9,
        base_speed_kmh: 38,
      },
    ],
    incidents: [
      {
        type: "waterlogging",
        location: "Ghodbunder Road near Teen Hath Naka",
        reported_minutes_ago: 27,
        severity: 2,
      },
      {
        type: "breakdown",
        location: "Eastern Express Highway near Mulund toll",
        reported_minutes_ago: 53,
        severity: 1,
      },
    ],
    congestion_index: 54,
    time_risk_table: {
      "7-10": 1.3,
      "10-16": 0.8,
      "16-21": 1.2,
      "21-7": 0.7,
    },
  },
];
