export interface Point {
  lat: number;
  lng: number;
}

export interface MonumentFeature {
  type: string;
  id?: string | number;
  properties: {
    OBJECTID?: number;
    ListEntry?: number;
    Name?: string;
    hyperlink?: string;
    area_ha?: number;
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
}

export interface ProximityCheckResult {
  isWithinWarningDistance: boolean;
  isInsideMonument: boolean;
  distanceMeters: number;
  nearestMonumentName: string;
  nearestMonumentId: string;
  nearestMonumentUrl?: string;
}

/**
 * Calculates the Haversine distance in meters between two lat/lng points
 */
export function getHaversineDistanceMeters(p1: Point, p2: Point): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distance from point to line segment (p1 -> p2) in meters
 */
function distanceToSegmentMeters(p: Point, p1: Point, p2: Point): number {
  const midLatRad = (((p1.lat + p2.lat) / 2) * Math.PI) / 180;
  const cosLat = Math.cos(midLatRad);

  const mPerDegLat = 111132.954;
  const mPerDegLon = 111412.84 * cosLat;

  const dx = (p2.lng - p1.lng) * mPerDegLon;
  const dy = (p2.lat - p1.lat) * mPerDegLat;

  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return getHaversineDistanceMeters(p, p1);
  }

  const px = (p.lng - p1.lng) * mPerDegLon;
  const py = (p.lat - p1.lat) * mPerDegLat;

  let t = (px * dx + py * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * dx;
  const projY = t * dy;

  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

/**
 * Point-in-polygon ray casting check
 * ring is array of [lng, lat]
 */
function isPointInRing(point: Point, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check proximity of a pin to all given Scheduled Monument features
 * Warns if within 50 meters or inside
 */
export function checkProximityToMonuments(
  point: Point,
  features: MonumentFeature[],
  warningThresholdMeters = 50
): ProximityCheckResult {
  let minDistance = Infinity;
  let isInside = false;
  let nearestName = '';
  let nearestId = '';
  let nearestUrl = '';

  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) continue;

    const name = feature.properties?.Name || 'Scheduled Monument';
    const id = String(feature.properties?.ListEntry || feature.properties?.OBJECTID || '');
    const url = feature.properties?.hyperlink || '';

    // Normalize polygons to list of rings
    const allRings: number[][][] = [];
    if (geom.type === 'Polygon') {
      // coordinates: [ [ [lng, lat], ... ] ]
      allRings.push(...(geom.coordinates as number[][][]));
    } else if (geom.type === 'MultiPolygon') {
      // coordinates: [ [ [ [lng, lat], ... ] ] ]
      for (const poly of geom.coordinates as number[][][][]) {
        if (Array.isArray(poly)) {
          allRings.push(...poly);
        }
      }
    }

    for (const ring of allRings) {
      if (!Array.isArray(ring) || ring.length < 3) continue;

      // 1. Check if inside
      if (isPointInRing(point, ring)) {
        isInside = true;
        minDistance = 0;
        nearestName = name;
        nearestId = id;
        nearestUrl = url;
        break;
      }

      // 2. Measure distance to perimeter segments
      for (let i = 0; i < ring.length - 1; i++) {
        const p1: Point = { lng: ring[i][0], lat: ring[i][1] };
        const p2: Point = { lng: ring[i + 1][0], lat: ring[i + 1][1] };

        const dist = distanceToSegmentMeters(point, p1, p2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestName = name;
          nearestId = id;
          nearestUrl = url;
        }
      }
    }

    if (isInside) break;
  }

  return {
    isWithinWarningDistance: minDistance <= warningThresholdMeters,
    isInsideMonument: isInside,
    distanceMeters: Math.round(minDistance),
    nearestMonumentName: nearestName,
    nearestMonumentId: nearestId,
    nearestMonumentUrl: nearestUrl
  };
}
