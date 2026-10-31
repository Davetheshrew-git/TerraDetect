/**
 * TerraDetect UK — Geodesic & Scheduled Monument Boundary Clearance Engine
 * Custom local-tangent-plane projection calibrated for British Isles latitudes (49°N–61°N).
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface MonumentFeature {
  type: string;
  id?: string | number;
  properties: {
    OBJECTID?: number;
    ListEntry?: string | number;
    Name?: string;
    hyperlink?: string;
    area_ha?: number;
    authority?: string;
    country?: string;
    period?: string;
    siteType?: string;
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

const DEG_TO_RAD = Math.PI / 180;
const UK_MERIDIONAL_METERS_PER_DEG = 111285.4;
const UK_ZONAL_EQUATORIAL_METERS_PER_DEG = 111412.8;

/**
 * Converts a pair of WGS84 coordinates into local British planar offsets (dx, dy in meters)
 */
function projectToLocalPlanarMeters(origin: Point, target: Point): { dx: number; dy: number } {
  const meanLatRad = ((origin.lat + target.lat) * 0.5) * DEG_TO_RAD;
  const zonalScale = Math.cos(meanLatRad) * UK_ZONAL_EQUATORIAL_METERS_PER_DEG;
  return {
    dx: (target.lng - origin.lng) * zonalScale,
    dy: (target.lat - origin.lat) * UK_MERIDIONAL_METERS_PER_DEG
  };
}

/**
 * Computes direct planar geodesic separation in meters between two field coordinates
 */
export function getHaversineDistanceMeters(origin: Point, target: Point): number {
  const { dx, dy } = projectToLocalPlanarMeters(origin, target);
  return Math.hypot(dx, dy);
}

/**
 * Computes shortest orthogonal distance in meters from a detectorist pin to a boundary edge [vertexA -> vertexB]
 */
function computeBoundaryEdgeClearanceMeters(pin: Point, vertexA: Point, vertexB: Point): number {
  const edgeVec = projectToLocalPlanarMeters(vertexA, vertexB);
  const pinVec = projectToLocalPlanarMeters(vertexA, pin);

  const edgeMagSq = edgeVec.dx * edgeVec.dx + edgeVec.dy * edgeVec.dy;
  if (edgeMagSq < 1e-6) {
    return Math.hypot(pinVec.dx, pinVec.dy);
  }

  const projectionRatio = Math.max(
    0,
    Math.min(1, (pinVec.dx * edgeVec.dx + pinVec.dy * edgeVec.dy) / edgeMagSq)
  );

  const closestX = projectionRatio * edgeVec.dx;
  const closestY = projectionRatio * edgeVec.dy;

  return Math.hypot(pinVec.dx - closestX, pinVec.dy - closestY);
}

/**
 * Winding-Parity Boundary Inclusion Test for GeoJSON coordinate rings ([lng, lat][])
 */
function isPinEnclosedByRing(pin: Point, ringCoords: number[][]): boolean {
  let parityCrossings = false;
  const totalVertices = ringCoords.length;

  for (let current = 0, previous = totalVertices - 1; current < totalVertices; previous = current++) {
    const lngA = ringCoords[current][0];
    const latA = ringCoords[current][1];
    const lngB = ringCoords[previous][0];
    const latB = ringCoords[previous][1];

    const straddlesLatitude = (latA > pin.lat) !== (latB > pin.lat);
    if (straddlesLatitude) {
      const crossingLng = lngA + ((pin.lat - latA) * (lngB - lngA)) / (latB - latA);
      if (pin.lng < crossingLng) {
        parityCrossings = !parityCrossings;
      }
    }
  }

  return parityCrossings;
}

/**
 * Extracts normalized exterior/interior coordinate rings from a Polygon or MultiPolygon feature
 */
function extractMonumentCoordinateRings(geometry: MonumentFeature['geometry']): number[][][] {
  if (!geometry || !geometry.coordinates) return [];

  if (geometry.type === 'Polygon') {
    return geometry.coordinates as number[][][];
  }

  if (geometry.type === 'MultiPolygon') {
    const rings: number[][][] = [];
    const multiCoords = geometry.coordinates as number[][][][];
    for (const polyGroup of multiCoords) {
      if (Array.isArray(polyGroup)) {
        rings.push(...polyGroup);
      }
    }
    return rings;
  }

  return [];
}

/**
 * Evaluates a detectorist pin against all Historic England & Cadw Scheduled Monument polygons in view.
 * Triggers statutory warning if inside a boundary or within the 50m statutory buffer zone.
 */
export function checkProximityToMonuments(
  pin: Point,
  monumentFeatures: MonumentFeature[],
  statutoryBufferMeters = 50
): ProximityCheckResult {
  let closestDistanceMeters = Infinity;
  let enclosedInMonument = false;
  let matchedMonumentName = '';
  let matchedMonumentId = '';
  let matchedMonumentUrl = '';

  for (const monument of monumentFeatures) {
    const rings = extractMonumentCoordinateRings(monument.geometry);
    if (rings.length === 0) continue;

    const monumentTitle = monument.properties?.Name || 'Scheduled Ancient Monument';
    const monumentRef = String(monument.properties?.ListEntry || monument.properties?.OBJECTID || '');
    const monumentLink = monument.properties?.hyperlink || '';

    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 3) continue;

      if (isPinEnclosedByRing(pin, ring)) {
        enclosedInMonument = true;
        closestDistanceMeters = 0;
        matchedMonumentName = monumentTitle;
        matchedMonumentId = monumentRef;
        matchedMonumentUrl = monumentLink;
        break;
      }

      for (let idx = 0; idx < ring.length - 1; idx++) {
        const vertexA: Point = { lng: ring[idx][0], lat: ring[idx][1] };
        const vertexB: Point = { lng: ring[idx + 1][0], lat: ring[idx + 1][1] };

        const segmentMeters = computeBoundaryEdgeClearanceMeters(pin, vertexA, vertexB);
        if (segmentMeters < closestDistanceMeters) {
          closestDistanceMeters = segmentMeters;
          matchedMonumentName = monumentTitle;
          matchedMonumentId = monumentRef;
          matchedMonumentUrl = monumentLink;
        }
      }
    }

    if (enclosedInMonument) break;
  }

  return {
    isWithinWarningDistance: closestDistanceMeters <= statutoryBufferMeters,
    isInsideMonument: enclosedInMonument,
    distanceMeters: Number.isFinite(closestDistanceMeters) ? Math.round(closestDistanceMeters) : 9999,
    nearestMonumentName: matchedMonumentName,
    nearestMonumentId: matchedMonumentId,
    nearestMonumentUrl: matchedMonumentUrl
  };
}
