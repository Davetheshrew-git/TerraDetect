import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  MapMouseEvent,
  AdvancedMarker,
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';
import { MonumentFeature, Point, checkProximityToMonuments, ProximityCheckResult } from '../lib/geoUtils';
import { MetalFind } from '../types';
import { FieldGisMap, FallbackMapLayer, LidarPalette, LidarSource } from './FieldGisMap';
import {
  Compass,
  Layers,
  Eye,
  EyeOff,
  Navigation,
  Loader2,
  Globe,
  Satellite,
  Mountain,
  Scan,
  SunMedium,
  Sparkles,
  Sun,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';

const API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyCFIMwu9i09TEiqeImYkzNifxCrPAW-p2Q';

interface MapContainerProps {
  currentPin: { lat: number; lng: number; accuracy?: number } | null;
  onPinChange: (lat: number, lng: number, accuracy?: number) => void;
  onProximityChange: (result: ProximityCheckResult) => void;
  savedFinds: MetalFind[];
  onSelectFind?: (find: MetalFind) => void;
  onMonumentsCountChange?: (count: number) => void;
  className?: string;
}

// Inner Google Maps child component using modern AdvancedMarkerElement
const GoogleMapContent: React.FC<MapContainerProps & {
  mapTypeId: string;
  showMonuments: boolean;
  monumentsFeatures: MonumentFeature[];
  isLoadingMonuments: boolean;
  onRequestGps: () => void;
  isLocating: boolean;
  onMapLoaded: () => void;
}> = ({
  currentPin,
  onPinChange,
  onProximityChange,
  savedFinds,
  onSelectFind,
  showMonuments,
  monumentsFeatures,
  onMapLoaded
}) => {
  const map = useMap();
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const polygonInstancesRef = useRef<google.maps.Polygon[]>([]);
  const hasTriggeredLoadedRef = useRef(false);

  const [selectedFindForInfo, setSelectedFindForInfo] = useState<MetalFind | null>(null);
  const [selectedMonumentForInfo, setSelectedMonumentForInfo] = useState<{
    pos: google.maps.LatLngLiteral;
    name: string;
    listEntry?: string;
    hyperlink?: string;
    authority?: string;
    period?: string;
    siteType?: string;
  } | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!hasTriggeredLoadedRef.current) {
      hasTriggeredLoadedRef.current = true;
      onMapLoaded();
    }

    const listener = map.addListener('tilesloaded', () => {
      onMapLoaded();
    });

    return () => {
      if (window.google?.maps?.event) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [map, onMapLoaded]);

  // Render & Update Scheduled Monuments Polygons
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    polygonInstancesRef.current.forEach(poly => poly.setMap(null));
    polygonInstancesRef.current = [];

    if (!showMonuments) return;

    monumentsFeatures.forEach(feature => {
      const geom = feature.geometry;
      if (!geom || !geom.coordinates) return;

      const polygonPaths: google.maps.LatLngLiteral[][] = [];

      if (geom.type === 'Polygon') {
        const rings = geom.coordinates as number[][][];
        rings.forEach(ring => {
          const path = ring.map(pt => ({ lat: pt[1], lng: pt[0] }));
          polygonPaths.push(path);
        });
      } else if (geom.type === 'MultiPolygon') {
        const polys = geom.coordinates as number[][][][];
        polys.forEach(poly => {
          poly.forEach(ring => {
            const path = ring.map(pt => ({ lat: pt[1], lng: pt[0] }));
            polygonPaths.push(path);
          });
        });
      }

      polygonPaths.forEach(path => {
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: '#dc2626',
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.28,
          map: map,
          zIndex: 10
        });

        polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
          if (!e.latLng) return;
          const props = feature.properties || {};
          setSelectedMonumentForInfo({
            pos: { lat: e.latLng.lat(), lng: e.latLng.lng() },
            name: props.Name || 'Protected Heritage Asset',
            listEntry: props.ListEntry ? String(props.ListEntry) : undefined,
            hyperlink: props.hyperlink,
            authority: props.authority,
            period: props.period,
            siteType: props.siteType
          });
        });

        polygonInstancesRef.current.push(polygon);
      });
    });
  }, [map, monumentsFeatures, showMonuments]);

  // Update current find target accuracy circle & proximity check
  useEffect(() => {
    if (!map || !window.google?.maps || !currentPin) return;

    const pinPos = { lat: currentPin.lat, lng: currentPin.lng };

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new google.maps.Circle({
        map,
        center: pinPos,
        radius: currentPin.accuracy || 10,
        fillColor: '#f59e0b',
        fillOpacity: 0.12,
        strokeColor: '#d97706',
        strokeOpacity: 0.4,
        strokeWeight: 1,
        zIndex: 5
      });
    } else {
      accuracyCircleRef.current.setCenter(pinPos);
      accuracyCircleRef.current.setRadius(currentPin.accuracy || 10);
    }

    const proximity = checkProximityToMonuments(pinPos, monumentsFeatures, 50);
    onProximityChange(proximity);
  }, [map, currentPin, monumentsFeatures, onProximityChange]);

  return (
    <>
      {/* Draggable Current Find Target using AdvancedMarkerElement */}
      {currentPin && (
        <AdvancedMarker
          position={{ lat: currentPin.lat, lng: currentPin.lng }}
          draggable={true}
          title="New Find Target Location (Drag to adjust)"
          onDragEnd={(e) => {
            if (e.latLng) {
              onPinChange(e.latLng.lat(), e.latLng.lng(), 2);
            }
          }}
        >
          <Pin
            background="#f59e0b"
            borderColor="#78350f"
            glyphColor="#0c0a09"
            scale={1.25}
          />
        </AdvancedMarker>
      )}

      {/* Saved Detectorist Finds using AdvancedMarkerElement */}
      {savedFinds.map(find => {
        let pinColor = '#f59e0b';
        if (find.metalType.toLowerCase().includes('silver')) pinColor = '#38bdf8';
        if (find.metalType.toLowerCase().includes('bronze')) pinColor = '#34d399';
        if (find.metalType.toLowerCase().includes('gold')) pinColor = '#fbbf24';

        return (
          <AdvancedMarker
            key={find.id}
            position={{ lat: find.latitude, lng: find.longitude }}
            title={find.title}
            onClick={() => {
              setSelectedFindForInfo(find);
              if (onSelectFind) onSelectFind(find);
            }}
          >
            <Pin
              background={pinColor}
              borderColor="#0c0a09"
              glyphColor="#0c0a09"
              scale={0.85}
            />
          </AdvancedMarker>
        );
      })}

      {/* Selected Find InfoWindow */}
      {selectedFindForInfo && (
        <InfoWindow
          position={{ lat: selectedFindForInfo.latitude, lng: selectedFindForInfo.longitude }}
          onCloseClick={() => setSelectedFindForInfo(null)}
        >
          <div style={{ color: '#1c1917', fontFamily: 'sans-serif', maxWidth: 240, padding: 4 }}>
            {selectedFindForInfo.imageUrl && (
              <img
                src={selectedFindForInfo.imageUrl}
                alt={selectedFindForInfo.title}
                style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 6, border: '1px solid #d6d3d1' }}
              />
            )}
            <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 'bold', color: '#0c0a09' }}>
              {selectedFindForInfo.title}
            </h4>
            <div style={{ fontSize: 11, color: '#57534e', marginBottom: 4, display: 'flex', gap: 8 }}>
              <span><strong>Metal:</strong> {selectedFindForInfo.metalType}</span>
              {selectedFindForInfo.depth && <span><strong>Depth:</strong> {selectedFindForInfo.depth}</span>}
              {selectedFindForInfo.targetVdi && <span><strong>VDI:</strong> {selectedFindForInfo.targetVdi}</span>}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Scheduled Monument Details InfoWindow */}
      {selectedMonumentForInfo && (
        <InfoWindow
          position={selectedMonumentForInfo.pos}
          onCloseClick={() => setSelectedMonumentForInfo(null)}
        >
          <div style={{ color: '#1c1917', fontFamily: 'sans-serif', maxWidth: 280, padding: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                background: selectedMonumentForInfo.authority?.includes('Wales') ? '#b91c1c' : '#ef4444',
                color: 'white',
                fontSize: 10,
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: 4
              }}>
                {selectedMonumentForInfo.authority?.includes('Wales') ? 'CADW (WALES)' : 'HISTORIC ENGLAND'}
              </span>
              {selectedMonumentForInfo.listEntry && (
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#78716c' }}>
                  {selectedMonumentForInfo.authority?.includes('Wales') ? `SAM #${selectedMonumentForInfo.listEntry}` : `NHLE #${selectedMonumentForInfo.listEntry}`}
                </span>
              )}
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 'bold', color: '#0c0a09', lineHeight: 1.3 }}>
              {selectedMonumentForInfo.name}
            </h4>
            {(selectedMonumentForInfo.siteType || selectedMonumentForInfo.period) && (
              <div style={{ fontSize: 11, color: '#57534e', marginBottom: 4, background: '#f5f5f4', padding: '3px 6px', borderRadius: 4 }}>
                {selectedMonumentForInfo.siteType ? <span><strong>Type:</strong> {selectedMonumentForInfo.siteType}</span> : null}
                {selectedMonumentForInfo.siteType && selectedMonumentForInfo.period ? ' • ' : null}
                {selectedMonumentForInfo.period ? <span><strong>Period:</strong> {selectedMonumentForInfo.period}</span> : null}
              </div>
            )}
            <p style={{ margin: '0 0 6px 0', fontSize: 11, color: '#44403c' }}>
              Protected under Ancient Monuments and Archaeological Areas Act 1979.{' '}
              <strong style={{ color: '#dc2626' }}>Metal detecting strictly prohibited without Section 42 licence.</strong>
            </p>
            {selectedMonumentForInfo.hyperlink && (
              <a
                href={selectedMonumentForInfo.hyperlink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 'bold', color: '#b45309', textDecoration: 'underline' }}
              >
                {selectedMonumentForInfo.authority?.includes('Wales') ? 'View Official Cadw Record →' : 'View Official Historic England Listing →'}
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const MapContainer: React.FC<MapContainerProps> = ({
  currentPin,
  onPinChange,
  onProximityChange,
  savedFinds,
  onSelectFind,
  onMonumentsCountChange,
  className
}) => {
  const [monumentsFeatures, setMonumentsFeatures] = useState<MonumentFeature[]>([]);
  const [isLoadingMonuments, setIsLoadingMonuments] = useState(false);
  const [showMonuments, setShowMonuments] = useState(true);
  const [gisLayer, setGisLayer] = useState<FallbackMapLayer>('satellite'); // Default to high-resolution Satellite view

  // Archaeological Relief Controls - Defaults to user's desired Dark & Gold
  const [lidarContrast, setLidarContrast] = useState<number>(205);
  const [lidarBrightness, setLidarBrightness] = useState<number>(44);
  const [lidarPalette, setLidarPalette] = useState<LidarPalette>('darkGold'); // Dark Obsidian & Antique Gold
  const [lidarSource, setLidarSource] = useState<LidarSource>('allWales'); // 100% Wales & UK Complete Coverage default
  const [lidarOpacity, setLidarOpacity] = useState<number>(0.95);
  const [invertRelief, setInvertRelief] = useState<boolean>(false);

  // Real-Time Sun Direction, Altitude & SLRM Micro-Relief (TerraDetect Live Relief Engine)
  const [sunAzimuth, setSunAzimuth] = useState<number>(315); // NW (standard archaeological hillshade angle)
  const [sunAltitude, setSunAltitude] = useState<number>(35); // 35 degrees altitude
  const [slrmOpacity, setSlrmOpacity] = useState<number>(0.6); // 60% SLRM
  const [slrmRadius, setSlrmRadius] = useState<number>(4);

  // Active Tab inside LiDAR Drawer
  const [activeLidarTab, setActiveLidarTab] = useState<'sun' | 'colors' | 'slrm' | 'sources'>('sun');
  const [isLidarDrawerOpen, setIsLidarDrawerOpen] = useState<boolean>(false);

  const [mapTypeId, setMapTypeId] = useState<string>('hybrid');
  const [gpsCenterTrigger, setGpsCenterTrigger] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    currentPin ? { lat: currentPin.lat, lng: currentPin.lng } : { lat: 51.1789, lng: -1.8262 }
  );

  // Active Map Engine
  const [activeEngine, setActiveEngine] = useState<'fieldGis' | 'google'>('fieldGis');

  useEffect(() => {
    (window as any).gm_authFailure = () => {
      setActiveEngine('fieldGis');
      setIsMapLoaded(true);
    };

    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch Scheduled Monuments from backend ArcGIS proxy
  const fetchMonumentsInView = useCallback(
    async (bounds?: google.maps.LatLngBounds | null) => {
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const pad = 0.01;
      const minLon = sw.lng() - pad;
      const minLat = sw.lat() - pad;
      const maxLon = ne.lng() + pad;
      const maxLat = ne.lat() + pad;

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
        console.warn('Failed to fetch monuments:', err);
      } finally {
        setIsLoadingMonuments(false);
      }
    },
    [onMonumentsCountChange]
  );

  // Request user GPS location
  const handleRequestGps = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported on this device');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        onPinChange(latitude, longitude, accuracy);
        setMapCenter({ lat: latitude, lng: longitude });
        setGpsCenterTrigger(prev => prev + 1);
      },
      err => {
        setIsLocating(false);
        console.warn('Geolocation acquisition note:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [onPinChange]);

  // Automatically request GPS location on startup so app centers on user's real location
  const hasAutoLocatedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoLocatedRef.current) {
      hasAutoLocatedRef.current = true;
      handleRequestGps();
    }
  }, [handleRequestGps]);

  // Keep mapCenter in sync when currentPin changes externally (e.g. logbook navigation)
  useEffect(() => {
    if (currentPin) {
      setMapCenter({ lat: currentPin.lat, lng: currentPin.lng });
    }
  }, [currentPin?.lat, currentPin?.lng]);

  const handleMapLoaded = useCallback(() => {
    setIsMapLoaded(true);
  }, []);

  const getCompassHeadingName = (deg: number): string => {
    const norm = ((deg % 360) + 360) % 360;
    if (norm >= 337.5 || norm < 22.5) return 'N (0°)';
    if (norm >= 22.5 && norm < 67.5) return 'NE (45°)';
    if (norm >= 67.5 && norm < 112.5) return 'E (90°)';
    if (norm >= 112.5 && norm < 157.5) return 'SE (135°)';
    if (norm >= 157.5 && norm < 202.5) return 'S (180°)';
    if (norm >= 202.5 && norm < 247.5) return 'SW (225°)';
    if (norm >= 247.5 && norm < 292.5) return 'W (270°)';
    return 'NW (315°)';
  };

  return (
    <div className={className || 'relative w-full h-[540px] sm:h-[600px] lg:h-[660px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950'}>
      {/* 1. RENDER ACTIVE MAP ENGINE */}
      {activeEngine === 'fieldGis' ? (
        <FieldGisMap
          currentPin={currentPin}
          onPinChange={onPinChange}
          onProximityChange={onProximityChange}
          savedFinds={savedFinds}
          onSelectFind={onSelectFind}
          onMonumentsCountChange={onMonumentsCountChange}
          onMapLoaded={handleMapLoaded}
          mapStyle={gisLayer}
          showMonuments={showMonuments}
          gpsCenterTrigger={gpsCenterTrigger}
          lidarContrast={lidarContrast}
          lidarBrightness={lidarBrightness}
          lidarPalette={lidarPalette}
          lidarSource={lidarSource}
          lidarOpacity={lidarOpacity}
          invertRelief={invertRelief}
          sunAzimuth={sunAzimuth}
          sunAltitude={sunAltitude}
          slrmOpacity={slrmOpacity}
          slrmRadius={slrmRadius}
        />
      ) : (
        <>
          <APIProvider apiKey={API_KEY}>
            <Map
              id="terraDetectMap"
              mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'}
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={15}
              mapTypeId={mapTypeId}
              fullscreenControl={false}
              streetViewControl={false}
              mapTypeControl={false}
              onClick={(e: MapMouseEvent) => {
                if (e.detail.latLng) {
                  onPinChange(e.detail.latLng.lat, e.detail.latLng.lng, 3);
                }
              }}
              onIdle={(e) => {
                fetchMonumentsInView(e.map.getBounds());
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <GoogleMapContent
                currentPin={currentPin}
                onPinChange={onPinChange}
                onProximityChange={onProximityChange}
                savedFinds={savedFinds}
                onSelectFind={onSelectFind}
                onMonumentsCountChange={onMonumentsCountChange}
                mapTypeId={mapTypeId}
                showMonuments={showMonuments}
                monumentsFeatures={monumentsFeatures}
                isLoadingMonuments={isLoadingMonuments}
                onRequestGps={handleRequestGps}
                isLocating={isLocating}
                onMapLoaded={handleMapLoaded}
              />
            </Map>
          </APIProvider>
        </>
      )}

      {/* 2. Visual Loading Spinner Overlay */}
      {!isMapLoaded && (
        <div className="absolute inset-0 z-30 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-300">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-28 h-28 rounded-full border-2 border-amber-500/20 animate-ping opacity-60" />
            <div className="absolute w-20 h-20 rounded-full border border-amber-500/40 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-950/60 border border-amber-400/50 relative z-10">
              <Compass className="w-9 h-9 text-stone-950 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-bounce -top-3" />
          </div>

          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-base font-bold text-stone-100 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading Interactive Heritage Map...</span>
            </h3>
            <p className="text-xs text-stone-400 font-medium leading-relaxed">
              Acquiring satellite imagery, detectorist coordinates, and querying live UK Scheduled Monument boundaries.
            </p>
          </div>
        </div>
      )}

      {/* 3. Unified Map Controls (z-[1050] so Leaflet panes never obscure it) */}
      <div className="absolute top-[68px] sm:top-[74px] left-3 sm:left-4 z-[1050] flex flex-col items-start space-y-2 pointer-events-auto select-none max-w-[calc(100vw-24px)]">
        {/* Row 1: Layer Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Layer Bar */}
          <div className="flex items-center space-x-1 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 p-1 rounded-2xl shadow-2xl">
            {/* Satellite Layer */}
            <button
              type="button"
              onClick={() => {
                if (activeEngine === 'fieldGis') setGisLayer('satellite');
                else setMapTypeId('hybrid');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                (activeEngine === 'fieldGis' && gisLayer === 'satellite') || (activeEngine === 'google' && mapTypeId === 'hybrid')
                  ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              title="High-Resolution Satellite Aerial View"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>

            {/* High-Resolution Live LiDAR Button */}
            <button
              type="button"
              onClick={() => {
                if (activeEngine !== 'fieldGis') setActiveEngine('fieldGis');
                setGisLayer('lidar');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                activeEngine === 'fieldGis' && gisLayer === 'lidar'
                  ? 'bg-amber-400 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              title="Live UK LiDAR Hillshade & SLRM Micro-Relief with Sun Position Control"
            >
              <Sun className="w-3.5 h-3.5 text-amber-700" />
              <span>Live LiDAR</span>
            </button>

            {/* UK Topo Contours */}
            <button
              type="button"
              onClick={() => {
                if (activeEngine === 'fieldGis') setGisLayer('topo');
                else setMapTypeId('terrain');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                (activeEngine === 'fieldGis' && gisLayer === 'topo') || (activeEngine === 'google' && mapTypeId === 'terrain')
                  ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              title="UK Topographic Elevation Contours"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Topo</span>
            </button>

            {/* Field Tracks */}
            <button
              type="button"
              onClick={() => {
                if (activeEngine === 'fieldGis') setGisLayer('osm');
                else setMapTypeId('roadmap');
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                (activeEngine === 'fieldGis' && gisLayer === 'osm') || (activeEngine === 'google' && mapTypeId === 'roadmap')
                  ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
              title="Public Footpaths & Field Tracks"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tracks</span>
            </button>
          </div>
        </div>

        {/* Row 2: Monuments Toggle & Locate Me */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowMonuments(!showMonuments)}
            className={`px-3 py-1.5 rounded-2xl border shadow-xl backdrop-blur-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
              showMonuments
                ? 'bg-rose-950/90 border-rose-600/80 text-rose-200 shadow-rose-950/50'
                : 'bg-stone-900/90 border-stone-750 text-stone-400 hover:text-stone-200'
            }`}
            title={showMonuments ? 'Hide Scheduled Monument Boundaries' : 'Show Scheduled Monument Boundaries'}
          >
            {showMonuments ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Monuments</span>
            {monumentsFeatures.length > 0 && showMonuments && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                {monumentsFeatures.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRequestGps}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-2xl bg-stone-900/90 hover:bg-stone-850 border border-stone-750 text-amber-400 text-xs font-bold shadow-xl backdrop-blur-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 disabled:opacity-75"
            title="Center map on my live GPS location"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Locate Me</span>
              </>
            )}
          </button>
        </div>

        {/* Row 3: COMPLETE REWORKED LIDAR CONTROLS (Sun Position, SLRM Opacity, Dark & Gold Tones, EA & Wales Sources) */}
        {gisLayer === 'lidar' && activeEngine === 'fieldGis' && (
          <div className="bg-stone-950/95 backdrop-blur-2xl border border-amber-500/60 rounded-2xl shadow-2xl w-[320px] sm:w-[380px] space-y-2.5 pointer-events-auto transition-all animate-in fade-in duration-200 overflow-hidden">
            {/* Header with Minimize/Expand Toggle */}
            <div className="flex items-center justify-between p-2.5 pb-2 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border-b border-stone-800">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
                <span>Live LiDAR Engine &amp; Sun Controls</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-[10px] font-bold">
                  {getCompassHeadingName(sunAzimuth)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLidarDrawerOpen(!isLidarDrawerOpen)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  title={isLidarDrawerOpen ? 'Minimize Controls' : 'Expand Controls'}
                >
                  {isLidarDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isLidarDrawerOpen && (
              <div className="p-3 pt-0 space-y-3">
                {/* Tab Navigation: Sun Angle | Dark & Gold Colors | SLRM Relief | Data Sources */}
                <div className="flex items-center justify-between bg-stone-900 p-1 rounded-xl border border-stone-800 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveLidarTab('sun')}
                    className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                      activeLidarTab === 'sun'
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Sun Angle
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLidarTab('colors')}
                    className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                      activeLidarTab === 'colors'
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Dark &amp; Gold
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLidarTab('slrm')}
                    className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                      activeLidarTab === 'slrm'
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    SLRM Micro
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLidarTab('sources')}
                    className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                      activeLidarTab === 'sources'
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Sources
                  </button>
                </div>

                {/* TAB 1: SUN POSITION & ILLUMINATION ANGLE (TerraDetect Dynamic Relief) */}
                {activeLidarTab === 'sun' && (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    {/* Sun Direction (Azimuth 0° to 360°) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-300">
                        <span className="font-semibold flex items-center space-x-1">
                          <Compass className="w-3.5 h-3.5 text-amber-400" />
                          <span>Sun Direction (Azimuth):</span>
                        </span>
                        <span className="font-mono text-amber-300 font-bold">
                          {sunAzimuth}° ({getCompassHeadingName(sunAzimuth)})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={sunAzimuth}
                        onChange={(e) => setSunAzimuth(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
                        aria-label="Sun Azimuth Direction Slider"
                      />
                      {/* 8 Cardinal Direction Quick Presets */}
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                        {[
                          { label: 'NW 315°', deg: 315 },
                          { label: 'N 0°', deg: 0 },
                          { label: 'NE 45°', deg: 45 },
                          { label: 'E 90°', deg: 90 },
                          { label: 'SE 135°', deg: 135 },
                          { label: 'S 180°', deg: 180 },
                          { label: 'SW 225°', deg: 225 },
                          { label: 'W 270°', deg: 270 }
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => setSunAzimuth(btn.deg)}
                            className={`py-0.5 rounded border transition cursor-pointer text-center ${
                              sunAzimuth === btn.deg
                                ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sun Height (Altitude 5° to 85°) */}
                    <div className="space-y-1 pt-1 border-t border-stone-850">
                      <div className="flex items-center justify-between text-[11px] text-stone-300">
                        <span className="font-semibold flex items-center space-x-1">
                          <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                          <span>Sun Height (Altitude):</span>
                        </span>
                        <span className="font-mono text-amber-300 font-bold">{sunAltitude}°</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="85"
                        step="2"
                        value={sunAltitude}
                        onChange={(e) => setSunAltitude(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
                        aria-label="Sun Altitude Height Slider"
                      />
                      {/* Quick Sun Altitude Presets */}
                      <div className="flex items-center space-x-1 text-[9px]">
                        <button
                          type="button"
                          onClick={() => setSunAltitude(15)}
                          className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                            sunAltitude === 15
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-white'
                          }`}
                          title="Low grazing winter sun casts long dramatic shadows exposing 5cm plowing furrows"
                        >
                          Grazing Low (15°)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSunAltitude(35)}
                          className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                            sunAltitude === 35
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-white'
                          }`}
                          title="Standard archaeological hillshade angle"
                        >
                          Standard (35°)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSunAltitude(60)}
                          className={`flex-1 py-1 rounded border text-center transition cursor-pointer ${
                            sunAltitude === 60
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-white'
                          }`}
                          title="High overhead sun pierces deep holloways and pits"
                        >
                          Overhead (60°)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DARK & GOLD COLOURS & TONES */}
                {activeLidarTab === 'colors' && (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    {/* Palette Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                        <span>Terrain Tones:</span>
                        <span className="text-[10px] text-amber-300 font-mono capitalize">
                          {lidarPalette === 'darkGold' && 'Dark & Gold (Obsidian)'}
                          {lidarPalette === 'goldSunburst' && 'Sunburst Gold'}
                          {lidarPalette === 'slrmAmber' && 'SLRM Amber & Midnight'}
                          {lidarPalette === 'bronze' && 'Archaeological Bronze'}
                          {lidarPalette === 'emerald' && 'Pasture Green'}
                          {lidarPalette === 'thermal' && 'Thermal Radar'}
                          {lidarPalette === 'slate' && 'Dark Slate'}
                          {lidarPalette === 'original' && 'Classic B&W'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[9px]">
                        {/* 1. Dark & Gold (Obsidian & Antique Gold) */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('darkGold')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'darkGold'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-950/70'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Dark Obsidian depressions with gleaming Antique Gold ridges & barrow mounds"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-950 via-amber-700 to-amber-400 border border-amber-300" />
                          <span className="truncate font-bold text-amber-300">Dark &amp; Gold</span>
                        </button>

                        {/* 2. Sunburst Gold */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('goldSunburst')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'goldSunburst'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Vivid Sunburst Gold ridges and deep peat shadows"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-900 via-amber-600 to-yellow-300 border border-yellow-200" />
                          <span className="truncate">Sunburst</span>
                        </button>

                        {/* 3. SLRM Amber */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('slrmAmber')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'slrmAmber'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Archaeological SLRM Dual-Tone: Midnight depressions, amber banks"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-950 via-amber-800 to-amber-300 border border-amber-200" />
                          <span className="truncate">SLRM Amber</span>
                        </button>

                        {/* 4. Bronze */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('bronze')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'bronze'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Archaeological Bronze & Verdigris Earth"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-900 to-amber-700 border border-amber-600" />
                          <span className="truncate">Bronze</span>
                        </button>

                        {/* 5. Pasture Green */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('emerald')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'emerald'
                              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Pasture Green & Lime Ridge: British meadow anti-glare"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-900 to-emerald-500 border border-emerald-300" />
                          <span className="truncate">Pasture</span>
                        </button>

                        {/* 6. Thermal */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('thermal')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'thermal'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Thermal Radar: Molten gold & charcoal"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-purple-950 to-amber-400 border border-amber-300" />
                          <span className="truncate">Thermal</span>
                        </button>

                        {/* 7. Slate */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('slate')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'slate'
                              ? 'bg-slate-600/30 border-slate-400 text-slate-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Dark Slate & Silver Graphite"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-950 to-slate-400 border border-slate-300" />
                          <span className="truncate">Slate</span>
                        </button>

                        {/* 8. Classic B&W */}
                        <button
                          type="button"
                          onClick={() => setLidarPalette('original')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center space-y-0.5 transition cursor-pointer text-center ${
                            lidarPalette === 'original'
                              ? 'bg-stone-600/30 border-stone-400 text-stone-200 font-bold shadow-md'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Calibrated Monochrome Grayscale"
                        >
                          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-stone-900 to-stone-200 border border-stone-100" />
                          <span className="truncate">B&amp;W</span>
                        </button>
                      </div>
                    </div>

                    {/* Ground Exposure & Contrast Sliders */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-850">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-stone-300">
                          <span>Exposure:</span>
                          <span className="font-mono text-amber-300 font-bold">{lidarBrightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="85"
                          step="2"
                          value={lidarBrightness}
                          onChange={(e) => setLidarBrightness(Number(e.target.value))}
                          className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-stone-300">
                          <span>Contrast:</span>
                          <span className="font-mono text-amber-300 font-bold">{lidarContrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="280"
                          step="5"
                          value={lidarContrast}
                          onChange={(e) => setLidarContrast(Number(e.target.value))}
                          className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                    </div>

                    {/* Invert Shadows Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-stone-400">Reverse Lighting Angles:</span>
                      <button
                        type="button"
                        onClick={() => setInvertRelief(!invertRelief)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          invertRelief
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {invertRelief ? 'Inverted Shadows ON' : 'Invert Shadows'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: SLRM (SIMPLE LOCAL RELIEF MODEL) MICRO-RELIEF */}
                {activeLidarTab === 'slrm' && (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-300">
                        <span className="font-semibold flex items-center space-x-1">
                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                          <span>SLRM Opacity (Micro-Relief):</span>
                        </span>
                        <span className="font-mono text-amber-300 font-bold">{Math.round(slrmOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.0"
                        step="0.05"
                        value={slrmOpacity}
                        onChange={(e) => setSlrmOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
                        aria-label="SLRM Opacity Slider"
                      />
                      <div className="flex items-center justify-between text-[9px] text-stone-500">
                        <span>Standard Hillshade (0%)</span>
                        <span>Pure SLRM Micro (100%)</span>
                      </div>
                    </div>

                    {/* Macro-Trend Radius Presets */}
                    <div className="space-y-1 pt-1 border-t border-stone-850">
                      <div className="flex items-center justify-between text-[10px] text-stone-300">
                        <span>SLRM Feature Scope:</span>
                        <span className="font-mono text-amber-300">
                          {slrmRadius === 2 && 'Subtle (2px - furrows)'}
                          {slrmRadius === 4 && 'Standard (4px - barrows)'}
                          {slrmRadius === 8 && 'Deep (8px - ramparts)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px]">
                        <button
                          type="button"
                          onClick={() => setSlrmRadius(2)}
                          className={`py-1 rounded border text-center transition cursor-pointer ${
                            slrmRadius === 2
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Subtle (2px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlrmRadius(4)}
                          className={`py-1 rounded border text-center transition cursor-pointer ${
                            slrmRadius === 4
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Standard (4px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlrmRadius(8)}
                          className={`py-1 rounded border text-center transition cursor-pointer ${
                            slrmRadius === 8
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          Deep (8px)
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-400 leading-relaxed bg-stone-900/60 p-2 rounded-xl border border-stone-800">
                      <strong>Simple Local Relief Model (SLRM):</strong> Strips away broader regional hillside slopes to isolate human-made micro-earthworks (Celtic lynchets, ridge-and-furrow, barrows) regardless of terrain gradient.
                    </p>
                  </div>
                )}

                {/* TAB 4: DATA SOURCES & SATELLITE BLENDING */}
                {activeLidarTab === 'sources' && (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    {/* Sources Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                        <span>Terrain Laser Provider:</span>
                        <span className="text-[10px] text-amber-300 font-mono truncate max-w-[150px]">
                          {lidarSource === 'wales2m' && 'DataMapWales 2m DTM (100% Wales)'}
                          {lidarSource === 'wales1m' && 'DataMapWales 1m DTM (High-Res)'}
                          {lidarSource === 'walesDsm2m' && 'DataMapWales 2m DSM (Walls/Dykes)'}
                          {lidarSource === 'allWales' && 'All-UK Auto (Wales 2m + EA 1m)'}
                          {lidarSource === 'ea1m' && 'EA 1m DTM (England Bare-Earth)'}
                          {lidarSource === 'ea2m' && 'EA 2m DTM (England Wide)'}
                          {lidarSource === 'eadsm' && 'EA 1m DSM (Banks & Walls)'}
                          {lidarSource === 'eacolor' && 'EA 1m Color Elevation'}
                          {lidarSource === 'composite' && 'UK Multi-Angle Relief'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                        {/* Wales 2m National DTM */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('wales2m')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'wales2m'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="DataMapWales 2m DTM: Complete 100% nationwide laser bare-earth terrain for all of Wales"
                        >
                          <Globe className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">Wales 2m DTM</span>
                          <span className="text-[8px] text-amber-300 font-semibold">100% Wales</span>
                        </button>

                        {/* Wales 1m High-Res DTM */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('wales1m')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'wales1m'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="DataMapWales 1m DTM: High-resolution laser bare-earth with auto 2m fallback"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">Wales 1m DTM</span>
                          <span className="text-[8px] text-stone-400">High-Res</span>
                        </button>

                        {/* Wales 2m DSM Surface (Walls & Dykes) */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('walesDsm2m')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'walesDsm2m'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="DataMapWales 2m DSM: Surface model highlighting ancient field walls, earth dykes and tree canopies"
                        >
                          <Scan className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">Wales 2m DSM</span>
                          <span className="text-[8px] text-stone-400">Walls &amp; Dykes</span>
                        </button>

                        {/* All-UK Seamless Auto Composite */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('allWales')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'allWales'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="All-UK Auto: DataMapWales 2m DTM in Wales seamlessly combined with EA 1m DTM in England"
                        >
                          <Globe className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">All-UK Auto</span>
                          <span className="text-[8px] text-stone-400">Wales + England</span>
                        </button>

                        {/* EA 1m DTM (England) */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('ea1m')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'ea1m'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Environment Agency 1m National DTM (England Bare-earth micro relief)"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">EA 1m DTM</span>
                          <span className="text-[8px] text-stone-500">England</span>
                        </button>

                        {/* EA 2m DTM */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('ea2m')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'ea2m'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Environment Agency 2m DTM Composite (Wide rural England)"
                        >
                          <Mountain className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">EA 2m DTM</span>
                          <span className="text-[8px] text-stone-500">England Rural</span>
                        </button>

                        {/* EA 1m DSM */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('eadsm')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'eadsm'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Environment Agency 1m DSM Surface Model (Ancient walls & boundary dykes in England)"
                        >
                          <Scan className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">EA 1m DSM</span>
                          <span className="text-[8px] text-stone-500">England Walls</span>
                        </button>

                        {/* EA 1m Elevation Color */}
                        <button
                          type="button"
                          onClick={() => {
                            setLidarSource('eacolor');
                            setLidarPalette('original');
                          }}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'eacolor'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="Environment Agency 1m Hypsometric Color Elevation"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-500 mb-0.5 border border-white/40" />
                          <span className="font-bold leading-none">Elevation</span>
                          <span className="text-[8px] text-stone-500">Color Ramp</span>
                        </button>

                        {/* UK Multi-Angle Composite */}
                        <button
                          type="button"
                          onClick={() => setLidarSource('composite')}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                            lidarSource === 'composite'
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md ring-1 ring-amber-400/40'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                          title="UK Nationwide Multi-Directional High-Relief (England, Wales, Scotland)"
                        >
                          <Mountain className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                          <span className="font-bold leading-none">UK Multi</span>
                          <span className="text-[8px] text-stone-500">All Britain</span>
                        </button>
                      </div>
                    </div>

                    {/* Satellite Blend Opacity Slider */}
                    <div className="space-y-1 pt-1 border-t border-stone-850">
                      <div className="flex items-center justify-between text-[11px] text-stone-300">
                        <span className="flex items-center space-x-1">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Satellite Aerial Blend:</span>
                        </span>
                        <span className="font-mono text-amber-300 font-bold">{Math.round(lidarOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.20"
                        max="1.00"
                        step="0.05"
                        value={lidarOpacity}
                        onChange={(e) => setLidarOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
                        aria-label="Satellite Overlay Blend Slider"
                      />
                      <div className="flex items-center justify-between text-[9px] text-stone-500">
                        <span>Satellite visible</span>
                        <span>100% Pure Bare-Earth</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
