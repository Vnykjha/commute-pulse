import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';

/**
 * Fetches incidents for all routes from Firestore.
 * Returns a map: { [routeId]: incident[] }
 * Falls back to an empty map if Firestore is unavailable.
 */
export function useFirestoreIncidents() {
  const [incidentMap, setIncidentMap] = useState(null); // null = loading
  const [error, setError]             = useState(null);

  useEffect(() => {
    getDocs(collection(db, 'incidents'))
      .then((snapshot) => {
        const map = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!map[data.routeId]) map[data.routeId] = [];
          map[data.routeId].push({
            type:                 data.type,
            location:             data.location,
            reported_minutes_ago: data.reported_minutes_ago,
            severity:             data.severity,
          });
        });
        setIncidentMap(map);
      })
      .catch((err) => {
        console.warn('[CommutePulse] Firestore unavailable, using static data:', err.message);
        setError(err);
        setIncidentMap({}); // empty map → static fallback kicks in
      });
  }, []);

  return { incidentMap, error, loading: incidentMap === null };
}
