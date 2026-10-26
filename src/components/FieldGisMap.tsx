import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MonumentFeature, Point, checkProximityToMonuments, ProximityCheckResult } from '../lib/geoUtils';
import { MetalFind } from '../types';
import {
  Navigation,
  Eye,
  EyeOff,
  Loader2,
  Layers,
  MapPin,
  Mountain,
  Compass,
  Moon,
  Satellite,
  Check,
  AlertTriangle
} from 'lucide-react';

export type FallbackMapLayer = 'satellite' | 'topo' | 'osm' | 'lidar';
export type LidarPalette = 'green' | 'emerald' | 'sepia' | 'slate' | 'original';

export const getLidarFilterString = (
  palette: LidarPalette = 'green',
  contrast: number = 140,
  brightness: number = 82
): string => {
  switch (palette) {
    case 'green':
      // Lush British pasture & field meadow green: replaces harsh white with natural pasture green
      return `sepia(100%) hue-rotate(65deg) saturate(240%) brightness(${brightness}%) contrast(${contrast}%)`;
    case 'emerald':
      // High-contrast topographic emerald moss: enhances elevation ditches & banks
      return `sepia(100%) hue-rotate(95deg) saturate(320%) brightness(${Math.max(65, brightness - 5)}%) contrast(${contrast}%)`;
    case 'sepia':
      // Historic archaeological parchment & warm bronze earth tone
      return `sepia(100%) hue-rotate(350deg) saturate(180%) brightness(${brightness}%) contrast(${contrast}%)`;
    case 'slate':
      // Anti-glare dark slate & charcoal relief
      return `invert(85%) hue-rotate(185deg) brightness(${Math.max(70, brightness - 8)}%) contrast(${contrast}%)`;
    case 'original':
      // Raw monochrome grayscale hillshade
      return `contrast(${contrast}%) brightness(${brightness + 18}%)`;
    default:
      return `sepia(100%) hue-rotate(65deg) saturate(240%) brightness(${brightness}%) contrast(${contrast}%)`;
  }
};

interface FieldGisMapProps {
  currentPin: { lat: number; lng: number; accuracy?: number } | null;
  onPinChange: (lat: number, lng: number, accuracy?: number) => void;
  onProximityChange: (result: ProximityCheckResult) => void;
  savedFinds: MetalFind[];
  onSelectFind?: (find: MetalFind) => void;
  onMonumentsCountChange?: (count: number) => void;
  onMapLoaded?: () => void;
  mapStyle?: FallbackMapLayer;
  showMonuments?: boolean;
  gpsCenterTrigger?: number;
  lidarContrast?: number;
  lidarBrightness?: number;
  lidarPalette?: LidarPalette;
}

export const FieldGisMap: React.FC<FieldGisMapProps> = ({
  currentPin,
  onPinChange,
  onProximityChange,
  savedFinds,
  onSelectFind,
  onMonumentsCountChange,
  onMapLoaded,
  mapStyle = 'satellite',
  showMonuments = true,
  gpsCenterTrigger,
  lidarContrast = 140,
  lidarBrightness = 82,
  lidarPalette = 'green'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const savedMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [isLoadingMonuments, setIsLoadingMonuments] = useState(false);
  const [monumentsFeatures, setMonumentsFeatures] = useState<MonumentFeature[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = currentPin
      ? [currentPin.lat, currentPin.lng]
      : [51.1789, -1.8262];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Satellite Tile Layer (Esri World Imagery)
    const satTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    ).addTo(map);
    tileLayerRef.current = satTile;

    // Layer groups for monuments and finds
    geoJsonLayerRef.current = L.geoJSON().addTo(map);
    savedMarkersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Handle Map Clicks to move/drop Pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      onPinChange(e.latlng.lat, e.latlng.lng, 3);
    });

    // Trigger monument fetch on map move
    map.on('moveend', () => {
      fetchMonumentsInView();
    });

    if (onMapLoaded) {
      onMapLoaded();
    }

    // Initial fetch
    setTimeout(() => {
      map.invalidateSize();
      fetchMonumentsInView();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer dynamically when user selects layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let attr = 'Tiles &copy; Esri, Maxar';
    let maxZoom = 19;
    let subdomains: string | string[] = 'abc';

    if (mapStyle === 'lidar') {
      // High-resolution UK LiDAR & Elevation Hillshade composite covering England & Wales
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}';
      attr = 'UK LiDAR Composite &copy; Esri, EA, NRW';
      maxZoom = 19;
    } else if (mapStyle === 'topo') {
      // High detail UK topographic elevation contours
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attr = 'Map data &copy; OpenTopoMap (CC-BY-SA)';
      maxZoom = 17;
    } else if (mapStyle === 'osm') {
      // OpenStreetMap with field tracks and footpaths
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attr = '&copy; OpenStreetMap contributors';
    }

    const newLayer = L.tileLayer(url, {
      attribution: attr,
      maxZoom,
      subdomains,
      className: mapStyle === 'lidar' ? 'lidar-tile-layer' : undefined
    }).addTo(map);
    tileLayerRef.current = newLayer;

    // Apply immediate CSS filter if LiDAR
    if (mapStyle === 'lidar') {
      const container = newLayer.getContainer();
      if (container) {
        container.style.filter = getLidarFilterString(lidarPalette, lidarContrast, lidarBrightness);
      }
    }
  }, [mapStyle, lidarPalette, lidarContrast, lidarBrightness]);

  // Dynamically update CSS contrast & color palette filter on the LiDAR tile container
  useEffect(() => {
    if (tileLayerRef.current) {
      const container = tileLayerRef.current.getContainer();
      if (container) {
        if (mapStyle === 'lidar') {
          container.style.filter = getLidarFilterString(lidarPalette, lidarContrast, lidarBrightness);
        } else {
          container.style.filter = 'none';
        }
      }
    }
  }, [lidarPalette, lidarContrast, lidarBrightness, mapStyle]);

  // Fetch Monuments from backend proxy for current viewport
  const fetchMonumentsInView = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const minLon = bounds.getWest() - 0.01;
    const minLat = bounds.getSouth() - 0.01;
    const maxLon = bounds.getEast() + 0.01;
    const maxLat = bounds.getNorth() + 0.01;

    setIsLoadingMonuments(true);
    try {
      const res = await fetch(
        `/api/monuments?minLon=${minLon}&minLat=${minLat}&maxLon=${maxLon}&maxLat=${maxLat}`
      );
      if (res.ok) {
        const data = await res.json();
        const features: MonumentFeature[] = data.features || [];
        setMonumentsFeatures(features);
        if (onMonumentsCountChange) {
          onMonumentsCountChange(features.length);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch monuments in GIS map:', err);
    } finally {
      setIsLoadingMonuments(false);
    }
  }, [onMonumentsCountChange]);

  // Center Leaflet map when gpsCenterTrigger fires
  useEffect(() => {
    if (!mapInstanceRef.current || !currentPin) return;
    if (gpsCenterTrigger && gpsCenterTrigger > 0) {
      mapInstanceRef.current.flyTo([currentPin.lat, currentPin.lng], 16, {
        duration: 1.5,
        easeLinearity: 0.25
      });
      const timer = setTimeout(() => {
        fetchMonumentsInView();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gpsCenterTrigger, fetchMonumentsInView]);

  // Render Scheduled Monuments polygons in semi-transparent red
  useEffect(() => {
    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showMonuments) return;

    monumentsFeatures.forEach(feature => {
      layer.addData({
        type: 'Feature',
        geometry: feature.geometry,
        properties: feature.properties
      } as any);
    });

    layer.setStyle({
      fillColor: '#ef4444',
      fillOpacity: 0.28,
      color: '#dc2626',
      weight: 2
    });

    layer.eachLayer(l => {
      const f = (l as any).feature;
      if (f && f.properties) {
        const p = f.properties;
        const isWales = p.authority?.includes('Wales') || p.country === 'Wales';
        const authorityBadge = isWales ? 'CADW (WALES)' : 'HISTORIC ENGLAND';
        const badgeBg = isWales ? '#b91c1c' : '#ef4444';
        const refLabel = isWales ? `Cadw SAM #${p.ListEntry}` : `NHLE #${p.ListEntry}`;
        const linkText = isWales ? 'View Official Cadw Record &rarr;' : 'View Historic England Record &rarr;';

        l.bindPopup(`
          <div style="font-family: sans-serif; max-width: 270px; color: #1c1917; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: ${badgeBg}; color: white; display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
                ${authorityBadge}
              </span>
              ${p.ListEntry ? `<span style="font-size: 11px; font-family: monospace; color: #78716c;">${refLabel}</span>` : ''}
            </div>
            <h4 style="font-weight: bold; font-size: 13px; margin: 4px 0; color: #0c0a09; line-height: 1.3;">${p.Name || 'Protected Heritage Asset'}</h4>
            ${p.siteType || p.period ? `
              <div style="font-size: 11px; color: #57534e; margin-bottom: 4px; background: #f5f5f4; padding: 3px 6px; border-radius: 4px;">
                ${p.siteType ? `<strong>Type:</strong> ${p.siteType}` : ''}
                ${p.siteType && p.period ? ' • ' : ''}
                ${p.period ? `<strong>Period:</strong> ${p.period}` : ''}
              </div>
            ` : ''}
            <p style="font-size: 11px; color: #44403c; margin: 0 0 6px 0;">
              Protected under Ancient Monuments and Archaeological Areas Act 1979. 
              <strong style="color: #dc2626;">Metal detecting strictly prohibited without Section 42 licence.</strong>
            </p>
            ${p.hyperlink ? `<a href="${p.hyperlink}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: bold; color: #b45309; text-decoration: underline;">${linkText}</a>` : ''}
          </div>
        `);
      }
    });
  }, [monumentsFeatures, showMonuments]);

  // Update Draggable Find Pin & Proximity
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPin) return;

    const pinPos: Point = { lat: currentPin.lat, lng: currentPin.lng };

    // Accuracy Circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle([pinPos.lat, pinPos.lng], {
        radius: currentPin.accuracy || 10,
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        color: '#d97706',
        weight: 1
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng([pinPos.lat, pinPos.lng]);
      accuracyCircleRef.current.setRadius(currentPin.accuracy || 10);
    }

    // Custom Draggable Pin Marker
    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="width: 24px; height: 24px; background: #f59e0b; border: 2px solid #78350f; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #0c0a09; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });

    if (!pinMarkerRef.current) {
      const marker = L.marker([pinPos.lat, pinPos.lng], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPinChange(pos.lat, pos.lng, 2);
      });

      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLatLng([pinPos.lat, pinPos.lng]);
    }

    // Check proximity to Scheduled Monuments (50m warning threshold)
    const proximity = checkProximityToMonuments(pinPos, monumentsFeatures, 50);
    onProximityChange(proximity);
  }, [currentPin, monumentsFeatures, onPinChange, onProximityChange]);

  // Render Saved Finds Markers
  useEffect(() => {
    const layer = savedMarkersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    savedFinds.forEach(find => {
      let pinColor = '#f59e0b';
      if (find.metalType.toLowerCase().includes('silver')) pinColor = '#38bdf8';
      if (find.metalType.toLowerCase().includes('bronze')) pinColor = '#34d399';
      if (find.metalType.toLowerCase().includes('gold')) pinColor = '#fbbf24';

      const icon = L.divIcon({
        className: 'saved-find-icon',
        html: `
          <div style="width: 16px; height: 16px; background: ${pinColor}; border: 2px solid #0c0a09; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([find.latitude, find.longitude], { icon }).addTo(layer);

      const val = find.aiAnalysis;
      marker.bindPopup(`
        <div style="font-family: sans-serif; max-width: 230px; color: #1c1917; padding: 2px;">
          ${find.imageUrl ? `<img src="${find.imageUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 6px; border: 1px solid #d6d3d1;" />` : ''}
          <h4 style="font-weight: bold; font-size: 13px; margin: 0 0 4px 0; color: #0c0a09;">${find.title}</h4>
          <div style="font-size: 11px; color: #57534e; margin-bottom: 4px;">
            <span><strong>Metal:</strong> ${find.metalType}</span>
            ${find.depth ? ` • <span><strong>Depth:</strong> ${find.depth}</span>` : ''}
          </div>
          ${val ? `<div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; font-size: 11px; margin-top: 4px; font-weight: bold; color: #92400e;">Est. £${val.estimatedValueMin} - £${val.estimatedValueMax} (${val.conditionGrade})</div>` : ''}
        </div>
      `);

      marker.on('click', () => {
        if (onSelectFind) onSelectFind(find);
      });
    });
  }, [savedFinds, onSelectFind]);

  return (
    <div className="relative w-full h-full">
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* Floating Bottom Left Status & Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-none">
        <div className="bg-stone-900/90 border border-stone-800 text-stone-300 text-xs px-3 py-1.5 rounded-xl shadow-lg backdrop-blur flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 shrink-0" />
          <span>
            Red Polygons: <strong>Scheduled Monuments</strong> (Protected)
          </span>
          {isLoadingMonuments && (
            <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-1" />
          )}
        </div>

        {mapStyle === 'lidar' && (
          <div className="bg-emerald-950/90 border border-emerald-600/70 text-emerald-200 text-xs px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              LiDAR: <strong className="capitalize">{lidarPalette === 'original' ? 'B&W' : lidarPalette}</strong> • <strong>{lidarContrast}% Contrast</strong>
            </span>
          </div>
        )}

        {currentPin && (
          <div className="bg-stone-950/90 border border-stone-800 text-stone-400 font-mono text-[11px] px-2.5 py-1 rounded-lg shadow backdrop-blur">
            Pin: {currentPin.lat.toFixed(5)}, {currentPin.lng.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
};
