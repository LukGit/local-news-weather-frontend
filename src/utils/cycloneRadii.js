/**
 * Calculates estimated wind radii (in meters) based on storm intensity in mph.
 * 39 mph  (~34 kt) -> Tropical Storm Force
 * 58 mph  (~50 kt) -> Severe Tropical Storm Force
 * 74+ mph (~64 kt) -> Hurricane / Typhoon Force
 */
export const getEstimatedWindRadii = (intensityMph) => {
  const speed = parseFloat(intensityMph) || 0;
  if (speed < 39) return [];

  const rings = [];

  // 34 kt (~39 mph) - Tropical Storm Force
  if (speed >= 39) {
    const radiusKm = Math.min(300, 80 + (speed - 39) * 3.5);
    rings.push({
      speedKt: 34,
      radiusMeters: radiusKm * 1000,
      fillColor: '#5eead4',   // Light teal/seafoam green
      strokeColor: '#000000', // Solid black boundary
      fillOpacity: 0.45
    });
  }

  // 50 kt (~58 mph) - Severe TS Force
  if (speed >= 58) {
    const radiusKm = Math.min(150, 40 + (speed - 58) * 2.2);
    rings.push({
      speedKt: 50,
      radiusMeters: radiusKm * 1000,
      fillColor: '#4ade80',   // Grass green
      strokeColor: '#000000', // Solid black boundary
      fillOpacity: 0.55
    });
  }

  // 64 kt (~74 mph) - Typhoon / Hurricane Force Core
  if (speed >= 74) {
    const radiusKm = Math.min(80, 25 + (speed - 74) * 1.5);
    rings.push({
      speedKt: 64,
      radiusMeters: radiusKm * 1000,
      fillColor: '#991b1b',   // Muted dark red/brown fill
      strokeColor: '#dc2626', // Distinct red boundary
      fillOpacity: 0.40
    });
  }

  return rings;
};
