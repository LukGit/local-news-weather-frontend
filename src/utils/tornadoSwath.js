// src/utils/tornadoSwath.js

const METERS_PER_DEG_LAT = 111320;
const METERS_PER_MILE = 1609.344;
const YARDS_TO_METERS = 0.9144;

function metersPerDegLng(lat) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function segmentMeters(a, b) {
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * metersPerDegLng((a.lat + b.lat) / 2);
  return Math.hypot(dx, dy);
}

/**
 * Resamples a surveyed polyline into evenly spaced vertices scaled by
 * actual track mileage (65–140 steps) for consistent visual speed.
 */
export function densifyPath(path) {
  if (!Array.isArray(path) || path.length < 2) return path || [];

  const cumDist = [0];
  for (let i = 1; i < path.length; i++) {
    cumDist.push(cumDist[i - 1] + segmentMeters(path[i - 1], path[i]));
  }

  const totalDist = cumDist[cumDist.length - 1];
  if (totalDist <= 0) return path;

  const totalMiles = totalDist / METERS_PER_MILE;
  const distanceScaledSteps = Math.round(65 + totalMiles * 2.5);
  const clampedSteps = Math.min(140, Math.max(65, distanceScaledSteps));
  const steps = Math.max(clampedSteps, path.length);

  const stepDist = totalDist / steps;
  const result = [{ lat: path[0].lat, lng: path[0].lng }];

  let segIdx = 1;
  for (let s = 1; s < steps; s++) {
    const target = s * stepDist;
    while (segIdx < cumDist.length - 1 && cumDist[segIdx] < target) {
      segIdx++;
    }
    const prevD = cumDist[segIdx - 1];
    const nextD = cumDist[segIdx];
    const span = nextD - prevD;
    const t = span > 0 ? (target - prevD) / span : 0;

    const p0 = path[segIdx - 1];
    const p1 = path[segIdx];
    result.push({
      lat: p0.lat + (p1.lat - p0.lat) * t,
      lng: p0.lng + (p1.lng - p0.lng) * t
    });
  }

  const last = path[path.length - 1];
  result.push({ lat: last.lat, lng: last.lng });
  return result;
}

/**
 * Builds a closed, tapered damage-swath polygon around a slice of the track.
 * Returns [] when widthYd is null/0 so callers can fall back to centerline only.
 */
export function buildTaperedSwathPolygon(slicePoints, widthYd, totalTrackPoints) {
  if (!widthYd || widthYd <= 0 || !Array.isArray(slicePoints) || slicePoints.length < 2) {
    return [];
  }

  const maxHalfMeters = (widthYd * YARDS_TO_METERS) / 2;
  const totalSpan = Math.max(totalTrackPoints - 1, slicePoints.length - 1, 1);
  const leftEdge = [];
  const rightEdge = [];

  let lastNormal = { nx: 0, ny: 1 };

  for (let i = 0; i < slicePoints.length; i++) {
    const pt = slicePoints[i];
    const u = i / totalSpan;

    // Taper touchdown (0 -> 0.15) and liftoff (0.85 -> 1.0)
    let taperFactor = 1.0;
    if (u < 0.15) {
      taperFactor = 0.15 + 0.85 * (u / 0.15);
    } else if (u > 0.85) {
      taperFactor = 0.12 + 0.88 * ((1 - u) / 0.15);
    }

    const halfWidth = maxHalfMeters * Math.max(0.1, taperFactor);
    const prev = slicePoints[Math.max(0, i - 1)];
    const next = slicePoints[Math.min(slicePoints.length - 1, i + 1)];

    const mLng = metersPerDegLng(pt.lat);
    const dx = (next.lng - prev.lng) * mLng;
    const dy = (next.lat - prev.lat) * METERS_PER_DEG_LAT;
    const len = Math.hypot(dx, dy);

    if (len > 0) {
      lastNormal = { nx: -dy / len, ny: dx / len };
    }

    const dLat = (lastNormal.ny * halfWidth) / METERS_PER_DEG_LAT;
    const dLng = (lastNormal.nx * halfWidth) / mLng;

    leftEdge.push({ lat: pt.lat + dLat, lng: pt.lng + dLng });
    rightEdge.push({ lat: pt.lat - dLat, lng: pt.lng - dLng });
  }

  return leftEdge.concat(rightEdge.reverse());
}
