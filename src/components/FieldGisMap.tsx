import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MonumentFeature, Point, checkProximityToMonuments, ProximityCheckResult } from '../lib/geoUtils';
import { MetalFind } from '../types';
import { LidarSvgFilters } from './LidarSvgFilters';
import { Loader2 } from 'lucide-react';

export type FallbackMapLayer = 'satellite' | 'topo' | 'osm' | 'lidar';

export type LidarPalette =
  | 'darkGold'       // Dark Obsidian & Antique Gold (Depressions dark, high spots radiant gold)
  | 'goldSunburst'   // Sunburst Gold & Organic Peat Brown (High contrast micro-relief)
  | 'slrmAmber'      // SLRM Archaeological Dual-Tone (Midnight blue depressions, warm amber banks)
  | 'bronze'         // Weathered Bronze & Verdigris Earth
  | 'emerald'        // Pasture Green & Lime Ridge (British meadow anti-glare)
  | 'thermal'        // Thermal Radar (Molten Gold & Charcoal)
  | 'slate'          // Dark Slate & Silver Graphite
  | 'original';      // Classic Monochrome Grayscale

export type LidarSource =
  | 'allWales'       // All-Britain Seamless Composite (Wales 2m DTM + England EA 1m DTM)
  | 'wales2m'        // DataMapWales 2m DTM (100% Nationwide Wales Bare-Earth)
  | 'wales1m'        // DataMapWales 1m DTM (Urban & Valley High-Res with 2m Fallback)
  | 'walesDsm2m'     // DataMapWales 2m DSM (Surface Models, Dykes & Walls)
  | 'ea1m'           // Defra Environment Agency 1m DTM Bare-Earth (England & Borders)
  | 'ea2m'           // Defra Environment Agency 2m DTM Composite (England)
  | 'eadsm'          // Defra Environment Agency 1m DSM Surface Model (England)
  | 'eacolor'        // Defra Environment Agency 1m Hypsometric Color Elevation
  | 'composite';     // UK Multi-Directional High-Relief (England, Wales, Scotland)

export const getLidarFilterString = (
  palette: LidarPalette = 'darkGold',
  contrast: number = 205,
  brightness: number = 44,
  invertRelief: boolean = false,
  isColorElevation: boolean = false,
  useSunSlrmShader: boolean = true
): string => {
  const inv = invertRelief ? 'invert(100%) hue-rotate(180deg) ' : '';
  const sunFilter = useSunSlrmShader ? 'url(#terradetect-relief-engine) ' : '';

  if (isColorElevation && palette === 'original') {
    return `${inv}contrast(${contrast}%) brightness(${Math.max(30, brightness + 15)}%) saturate(130%)`;
  }

  switch (palette) {
    case 'darkGold':
      // Dark Obsidian & Antique Gold: ditches & valleys in dark obsidian (#121214),
      // illuminated ridges, barrow crowns, and earth banks in radiant antique gold (#f59e0b / #d97706)
      return `${sunFilter}${inv}sepia(100%) hue-rotate(12deg) saturate(280%) brightness(${brightness}%) contrast(${contrast}%)`;

    case 'goldSunburst':
      // Vivid Sunburst Gold & Peat Brown: intense highlight ridges for shallow plowing furrows
      return `${sunFilter}${inv}sepia(100%) hue-rotate(24deg) saturate(340%) brightness(${Math.max(25, brightness - 2)}%) contrast(${contrast + 15}%)`;

    case 'slrmAmber':
      // SLRM Dual-Tone: Midnight blue shadows, bright amber positive features
      return `${sunFilter}${inv}sepia(100%) hue-rotate(345deg) saturate(220%) brightness(${Math.max(30, brightness - 4)}%) contrast(${contrast + 10}%)`;

    case 'bronze':
      // Archaeological Bronze & Verdigris patina
      return `${sunFilter}${inv}sepia(100%) hue-rotate(355deg) saturate(160%) brightness(${Math.max(30, brightness - 2)}%) contrast(${contrast}%)`;

    case 'emerald':
      // Pasture Green & Lime Ridge: British meadow anti-glare
      return `${sunFilter}${inv}sepia(100%) hue-rotate(75deg) saturate(190%) brightness(${brightness}%) contrast(${contrast}%)`;

    case 'thermal':
      // Thermal Radar: Deep charcoal base with electric gold edges
      return `${sunFilter}${inv}invert(95%) hue-rotate(170deg) saturate(240%) brightness(${Math.max(30, brightness - 5)}%) contrast(${contrast + 20}%)`;

    case 'slate':
      // Dark Slate & Silver Graphite: Night relief anti-glare
      return `${sunFilter}${inv}invert(90%) hue-rotate(185deg) brightness(${Math.max(30, brightness - 6)}%) contrast(${contrast}%)`;

    case 'original':
    default:
      // High-contrast bare-earth grayscale (calibrated dark, zero blinding white)
      return `${sunFilter}${inv}contrast(${contrast}%) brightness(${Math.max(30, brightness + 10)}%)`;
  }
};

export interface FieldGisMapProps {
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
  lidarSource?: LidarSource;
  lidarOpacity?: number;
  invertRelief?: boolean;

  // Real-Time Sun Direction, Altitude & SLRM Micro-Relief
  sunAzimuth?: number; // 0° to 360°
  sunAltitude?: number; // 5° to 85°
  slrmOpacity?: number; // 0.0 to 1.0
  slrmRadius?: number; // 2 to 10
  useSunSlrmShader?: boolean;
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
  lidarContrast = 205,
  lidarBrightness = 44,
  lidarPalette = 'darkGold',
  lidarSource = 'allWales',
  lidarOpacity = 0.95,
  invertRelief = false,
  sunAzimuth = 315,
  sunAltitude = 35,
  slrmOpacity = 0.6,
  slrmRadius = 4,
  useSunSlrmShader = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const savedMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Layers for clean compositing
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const baseSatLayerRef = useRef<L.TileLayer | null>(null);
  const walesReliefLayerRef = useRef<L.TileLayer | null>(null);

  const [isLoadingMonuments, setIsLoadingMonuments] = useState(false);
  const [monumentsFeatures, setMonumentsFeatures] = useState<MonumentFeature[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = currentPin
      ? [currentPin.lat, currentPin.lng]
      : [52.3664, -3.7500]; // Centered across Wales and England

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Satellite Tile Layer
    const satTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri, Maxar',
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

    setTimeout(() => {
      map.invalidateSize();
      fetchMonumentsInView();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layers dynamically with seamless Wales & England coverage
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous layers
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (walesReliefLayerRef.current) {
      map.removeLayer(walesReliefLayerRef.current);
      walesReliefLayerRef.current = null;
    }

    if (mapStyle === 'lidar') {
      // 1. Underlying Satellite layer for opacity blending
      if (!baseSatLayerRef.current) {
        const baseSat = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Satellite &copy; Esri, Maxar',
            maxZoom: 19,
            zIndex: 1
          }
        ).addTo(map);
        baseSatLayerRef.current = baseSat;
      }

      // 2. Select appropriate LiDAR layer provider
      if (lidarSource === 'wales2m') {
        // DataMapWales 2m DTM (100% Nationwide Wales Bare-Earth Coverage)
        const walesLayer = L.tileLayer('/api/wales-lidar/dtm2m/{z}/{x}/{y}.png', {
          attribution: 'DataMapWales &copy; Natural Resources Wales (2m DTM)',
          maxNativeZoom: 17,
          maxZoom: 20,
          opacity: lidarOpacity,
          zIndex: 2,
          className: 'lidar-tile-layer'
        }).addTo(map);
        tileLayerRef.current = walesLayer;
      } else if (lidarSource === 'wales1m') {
        // DataMapWales 1m DTM (Detailed with automatic 2m fallback)
        const walesLayer = L.tileLayer('/api/wales-lidar/dtm1m/{z}/{x}/{y}.png', {
          attribution: 'DataMapWales &copy; Welsh Government / NRW (1m DTM)',
          maxNativeZoom: 17,
          maxZoom: 20,
          opacity: lidarOpacity,
          zIndex: 2,
          className: 'lidar-tile-layer'
        }).addTo(map);
        tileLayerRef.current = walesLayer;
      } else if (lidarSource === 'walesDsm2m') {
        // DataMapWales 2m DSM Surface Model (Ancient field boundaries, dykes, walls)
        const walesLayer = L.tileLayer('/api/wales-lidar/dsm2m/{z}/{x}/{y}.png', {
          attribution: 'DataMapWales &copy; Natural Resources Wales (2m DSM Surface)',
          maxNativeZoom: 17,
          maxZoom: 20,
          opacity: lidarOpacity,
          zIndex: 2,
          className: 'lidar-tile-layer'
        }).addTo(map);
        tileLayerRef.current = walesLayer;
      } else if (lidarSource === 'allWales') {
        // All-Britain Seamless Composite:
        // Wales 2m DTM underneath (covers 100% of Wales with zero gaps)
        const walesRelief = L.tileLayer('/api/wales-lidar/dtm2m/{z}/{x}/{y}.png', {
          attribution: 'DataMapWales &copy; Natural Resources Wales, Defra EA',
          maxNativeZoom: 17,
          maxZoom: 20,
          opacity: lidarOpacity,
          zIndex: 2,
          className: 'lidar-tile-layer'
        }).addTo(map);
        walesReliefLayerRef.current = walesRelief;

        // Superimpose EA 1m DTM for England on top
        const eaLayer = L.tileLayer.wms(
          'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wms',
          {
            layers: 'Lidar_Composite_Hillshade_DTM_1m',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 3,
            attribution: 'EA 1m DTM &copy; Crown copyright',
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = eaLayer;
      } else if (lidarSource === 'ea1m') {
        const eaLayer = L.tileLayer.wms(
          'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wms',
          {
            layers: 'Lidar_Composite_Hillshade_DTM_1m',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 3,
            attribution: 'EA 1m DTM LiDAR &copy; Crown copyright',
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = eaLayer;
      } else if (lidarSource === 'ea2m') {
        const eaLayer = L.tileLayer.wms(
          'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-2m/wms',
          {
            layers: 'Lidar_Composite_Hillshade_DTM_2m',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 3,
            attribution: 'EA 2m DTM LiDAR &copy; Crown copyright',
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = eaLayer;
      } else if (lidarSource === 'eadsm') {
        const eaLayer = L.tileLayer.wms(
          'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-surface-model-last-return-dsm-1m/wms',
          {
            layers: 'Lidar_Composite_Hillshade_LZ_DSM_1m',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 3,
            attribution: 'EA 1m DSM Surface LiDAR &copy; Crown copyright',
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = eaLayer;
      } else if (lidarSource === 'eacolor') {
        const eaLayer = L.tileLayer.wms(
          'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wms',
          {
            layers: 'Lidar_Composite_Elevation_DTM_1m',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG3857,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 3,
            attribution: 'EA 1m Elevation &copy; Crown copyright',
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = eaLayer;
      } else {
        // 'composite' UK nationwide hillshade
        const compRelief = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'UK Elevation &copy; Esri, OS',
            maxNativeZoom: 16,
            maxZoom: 20,
            opacity: lidarOpacity,
            zIndex: 2,
            className: 'lidar-tile-layer'
          }
        ).addTo(map);
        tileLayerRef.current = compRelief;
      }

      // Apply initial dynamic shader filter
      const filterStr = getLidarFilterString(
        lidarPalette,
        lidarContrast,
        lidarBrightness,
        invertRelief,
        lidarSource === 'eacolor',
        useSunSlrmShader
      );

      if (walesReliefLayerRef.current) {
        const walesContainer = walesReliefLayerRef.current.getContainer();
        if (walesContainer) walesContainer.style.filter = filterStr;
      }

      if (tileLayerRef.current) {
        const eaContainer = tileLayerRef.current.getContainer();
        if (eaContainer) eaContainer.style.filter = filterStr;
      }
    } else {
      // Non-LiDAR mode: clean up LiDAR & background satellite layers
      if (baseSatLayerRef.current) {
        map.removeLayer(baseSatLayerRef.current);
        baseSatLayerRef.current = null;
      }

      let newLayer: L.TileLayer;
      if (mapStyle === 'topo') {
        newLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data &copy; OpenTopoMap (CC-BY-SA)',
          maxZoom: 17,
          subdomains: 'abc'
        });
      } else if (mapStyle === 'osm') {
        newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: 'abc'
        });
      } else {
        newLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles &copy; Esri, Maxar',
            maxZoom: 19,
            subdomains: 'abc'
          }
        );
      }

      newLayer.addTo(map);
      tileLayerRef.current = newLayer;
    }
  }, [mapStyle, lidarSource]);

  // Update LiDAR Opacity dynamically
  useEffect(() => {
    if (mapStyle === 'lidar') {
      if (walesReliefLayerRef.current) {
        walesReliefLayerRef.current.setOpacity(lidarOpacity);
      }
      if (tileLayerRef.current && tileLayerRef.current !== walesReliefLayerRef.current) {
        tileLayerRef.current.setOpacity(lidarOpacity);
      }
    }
  }, [lidarOpacity, mapStyle]);

  // Dynamically update CSS contrast, Sun direction shader, and color palette filter
  useEffect(() => {
    if (mapStyle === 'lidar') {
      const filterStr = getLidarFilterString(
        lidarPalette,
        lidarContrast,
        lidarBrightness,
        invertRelief,
        lidarSource === 'eacolor',
        useSunSlrmShader
      );

      if (walesReliefLayerRef.current) {
        const container = walesReliefLayerRef.current.getContainer();
        if (container) container.style.filter = filterStr;
      }

      if (tileLayerRef.current && tileLayerRef.current !== walesReliefLayerRef.current) {
        const container = tileLayerRef.current.getContainer();
        if (container) container.style.filter = filterStr;
      }
    }
  }, [
    lidarPalette,
    lidarContrast,
    lidarBrightness,
    invertRelief,
    mapStyle,
    lidarSource,
    useSunSlrmShader,
    sunAzimuth,
    sunAltitude,
    slrmOpacity
  ]);

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
      console.warn('Failed to fetch monuments in GIS engine:', err);
    } finally {
      setIsLoadingMonuments(false);
    }
  }, [onMonumentsCountChange]);

  // Handle GPS Centering via Trigger Button
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPin) return;

    map.flyTo([currentPin.lat, currentPin.lng], 16, {
      duration: 1.2
    });

    const timer = setTimeout(() => {
      fetchMonumentsInView();
    }, 1500);
    return () => clearTimeout(timer);
  }, [gpsCenterTrigger, fetchMonumentsInView]);

  // Auto-center to user's real location when acquired on startup
  const hasAutoCenteredOnUserRef = useRef(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPin) return;

    const isDefaultCoords =
      Math.abs(currentPin.lat - 51.1789) < 0.0001 && Math.abs(currentPin.lng - -1.8262) < 0.0001;

    if (!isDefaultCoords && !hasAutoCenteredOnUserRef.current) {
      hasAutoCenteredOnUserRef.current = true;
      map.flyTo([currentPin.lat, currentPin.lng], 16, {
        duration: 1.2
      });
      fetchMonumentsInView();
    }
  }, [currentPin?.lat, currentPin?.lng, fetchMonumentsInView]);

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
        icon: customIcon,
        draggable: true,
        title: 'New Find Target (Drag to adjust)'
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPinChange(pos.lat, pos.lng, 2);
      });

      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLatLng([pinPos.lat, pinPos.lng]);
    }

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
        className: 'saved-find-pin',
        html: `
          <div style="width: 18px; height: 18px; background: ${pinColor}; border: 1.5px solid #0c0a09; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
            <div style="width: 5px; height: 5px; background: #0c0a09; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker([find.latitude, find.longitude], { icon });

      marker.bindPopup(`
        <div style="font-family: sans-serif; max-width: 220px; color: #1c1917; padding: 2px;">
          ${find.imageUrl ? `<img src="${find.imageUrl}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-bottom: 4px;" />` : ''}
          <h4 style="font-weight: bold; font-size: 12px; margin: 0 0 2px 0; color: #0c0a09;">${find.title}</h4>
          <div style="font-size: 11px; color: #57534e; margin-bottom: 2px;">
            <span><strong>Metal:</strong> ${find.metalType}</span>
            ${find.targetVdi ? ` • <span><strong>VDI:</strong> ${find.targetVdi}</span>` : ''}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectFind) onSelectFind(find);
      });

      layer.addLayer(marker);
    });
  }, [savedFinds, onSelectFind]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* Dynamic SVG Filter Definitions (Sun Direction, Altitude & SLRM) */}
      <LidarSvgFilters
        sunAzimuth={sunAzimuth}
        sunAltitude={sunAltitude}
        slrmOpacity={slrmOpacity}
        slrmRadius={slrmRadius}
      />

      {/* Single, pristine Fullscreen Leaflet Map */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* Floating Bottom Left Status & Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-none">
        <div className="bg-stone-900/90 border border-stone-800 text-stone-300 text-xs px-3 py-1.5 rounded-xl shadow-lg backdrop-blur flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 shrink-0" />
          <span>
            Red: <strong>Scheduled Monuments</strong>
          </span>
          {isLoadingMonuments && (
            <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-1" />
          )}
        </div>

        {mapStyle === 'lidar' && (
          <div className="bg-stone-950/90 border border-amber-500/60 text-amber-200 text-xs px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[11px]">
              Sun {sunAzimuth}° @ {sunAltitude}° • SLRM {Math.round(slrmOpacity * 100)}% • {lidarPalette === 'darkGold' ? 'Dark & Gold' : lidarPalette}
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
