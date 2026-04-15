import { useEffect, useRef, useState } from 'react';
import Map, { Layer, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const SEVERITY_COLOR = {
  green: '#639922',
  amber: '#BA7517',
  red:   '#E24B4A',
};

// Bounds that fit all 3 Mumbai routes
const MUMBAI_BOUNDS = [
  [72.78, 18.90], // SW
  [73.02, 19.25], // NE
];

async function fetchRoadGeometry(coordinates, token) {
  const waypoints = coordinates.map((c) => c.join(',')).join(';');
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}` +
    `?geometries=geojson&overview=full&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.routes?.[0]?.geometry?.coordinates ?? null;
}

function routeToGeoJSON(routes, severityMap) {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => ({
      type: 'Feature',
      properties: {
        id:       route.id,
        name:     route.name,
        severity: severityMap[route.id] ?? 'green',
        color:    SEVERITY_COLOR[severityMap[route.id] ?? 'green'],
      },
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates,
      },
    })),
  };
}

function incidentsToGeoJSON(routes) {
  const features = [];
  for (const route of routes) {
    if (!route.incidents_coords) continue;
    for (const inc of route.incidents_coords) {
      features.push({
        type: 'Feature',
        properties: { type: inc.type, routeId: route.id },
        geometry: { type: 'Point', coordinates: [inc.lng, inc.lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

export default function RouteMap({ routes, selectedId, severityMap, onSelect }) {
  const token  = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapRef = useRef(null);

  // snappedCoords: { [routeId]: [[lng, lat], ...] }
  const [snappedCoords, setSnappedCoords] = useState({});

  // Fetch road-following geometry once on mount
  useEffect(() => {
    if (!token) return;
    routes.forEach((route) => {
      fetchRoadGeometry(route.coordinates, token)
        .then((coords) => {
          if (coords) {
            setSnappedCoords((prev) => ({ ...prev, [route.id]: coords }));
          }
        })
        .catch(() => {
          // silently fall back to straight-line waypoints
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to selected route whenever selection or snapped coords change
  useEffect(() => {
    if (!token) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const route  = routes.find((r) => r.id === selectedId);
    const coords = snappedCoords[route?.id] ?? route?.coordinates;
    if (!coords?.length) return;

    const lngs = coords.map((c) => c[0]);
    const lats  = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01],
        [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01],
      ],
      { padding: 40, duration: 800 }
    );
  }, [selectedId, routes, snappedCoords]);

  if (!token) {
    return (
      <div
        className="rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-center"
        style={{ height: 420 }}
      >
        <p className="text-xs text-gray-500">
          Add <code className="text-gray-400">VITE_MAPBOX_TOKEN</code> to{' '}
          <code className="text-gray-400">commute-pulse/.env</code> to enable the live map
        </p>
      </div>
    );
  }

  // Only render the selected route
  const selectedRoute   = routes.find((r) => r.id === selectedId);
  const routesForMap    = selectedRoute
    ? [{ ...selectedRoute, coordinates: snappedCoords[selectedRoute.id] ?? selectedRoute.coordinates }]
    : [];

  const routeGeoJSON    = routeToGeoJSON(routesForMap, severityMap);
  const incidentGeoJSON = incidentsToGeoJSON(routesForMap);

  function handleMapClick(e) {
    const features    = e.features ?? [];
    const lineFeature = features.find((f) => f.layer?.id === 'routes-line');
    if (lineFeature?.properties?.id) {
      onSelect(lineFeature.properties.id);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: 420 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          bounds: MUMBAI_BOUNDS,
          fitBoundsOptions: { padding: 30 },
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        interactiveLayerIds={['routes-line', 'routes-line-selected']}
        onClick={handleMapClick}
        cursor="pointer"
        attributionControl={false}
      >
        {/* ── All routes ── */}
        <Source id="routes" type="geojson" data={routeGeoJSON}>
          {/* Dim background halo for all routes */}
          <Layer
            id="routes-line-bg"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'id'], selectedId], 0, 6],
              'line-opacity': 0.25,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          {/* Inactive routes */}
          <Layer
            id="routes-line"
            type="line"
            filter={['!=', ['get', 'id'], selectedId]}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 4,
              'line-opacity': 0.5,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          {/* Selected route — bright + thick */}
          <Layer
            id="routes-line-selected"
            type="line"
            filter={['==', ['get', 'id'], selectedId]}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 6,
              'line-opacity': 1,
              'line-blur': 1,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          {/* Glow for selected route */}
          <Layer
            id="routes-line-glow"
            type="line"
            filter={['==', ['get', 'id'], selectedId]}
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 16,
              'line-opacity': 0.15,
              'line-blur': 6,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </Source>

        {/* ── Incident markers ── */}
        <Source id="incidents" type="geojson" data={incidentGeoJSON}>
          <Layer
            id="incidents-circle"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': '#E24B4A',
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 1.5,
              'circle-opacity': [
                'case',
                ['==', ['get', 'routeId'], selectedId], 1, 0.3,
              ],
              'circle-stroke-opacity': [
                'case',
                ['==', ['get', 'routeId'], selectedId], 1, 0.3,
              ],
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
