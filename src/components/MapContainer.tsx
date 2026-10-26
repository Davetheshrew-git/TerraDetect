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
import { FieldGisMap, FallbackMapLayer, LidarPalette } from './FieldGisMap';
import {
  Compass,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Crosshair,
  Eye,
  EyeOff,
  Navigation,
  Loader2,
  AlertTriangle,
  Globe,
  Satellite,
  Mountain,
  Scan,
  SlidersHorizontal
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
            {selectedFindForInfo.aiAnalysis && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', fontSize: 11, marginTop: 4 }}>
                <span style={{ fontWeight: 'bold', color: '#92400e' }}>
                  Est. £{selectedFindForInfo.aiAnalysis.estimatedValueMin} - £{selectedFindForInfo.aiAnalysis.estimatedValueMax}
                </span>
                <span style={{ color: '#78716c', fontSize: 10, marginLeft: 4 }}>
                  ({selectedFindForInfo.aiAnalysis.conditionGrade})
                </span>
              </div>
            )}
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
  const [gisLayer, setGisLayer] = useState<FallbackMapLayer>('satellite');
  const [lidarContrast, setLidarContrast] = useState<number>(140);
  const [lidarPalette, setLidarPalette] = useState<LidarPalette>('green');
  const [mapTypeId, setMapTypeId] = useState<string>('hybrid');
  const [gpsCenterTrigger, setGpsCenterTrigger] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    currentPin ? { lat: currentPin.lat, lng: currentPin.lng } : { lat: 51.1789, lng: -1.8262 }
  );

  // Active Map Engine: default to 'fieldGis' if Google Maps auth fails
  const [activeEngine, setActiveEngine] = useState<'fieldGis' | 'google'>('fieldGis');
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Catch Google Maps Authentication Failure (e.g. UrlAuthenticationCommonError / Referrer restrictions)
  useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication failure detected (UrlAuthenticationCommonError). Switched to High-Resolution Field GIS Satellite Map.');
      setAuthWarning(
        'Google Cloud API key has HTTP Referrer restrictions on Cloud Run domains. TerraDetect has seamlessly activated Field GIS Satellite Map with live Scheduled Monuments.'
      );
      setActiveEngine('fieldGis');
      setIsMapLoaded(true);
    };

    // Auto-resolve loading spinner after 3 seconds so user is never blocked
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

  return (
    <div className={className || "relative w-full h-[520px] sm:h-[580px] lg:h-[620px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950"}>
      {/* 1. RENDER ACTIVE MAP ENGINE FIRST */}
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
          lidarPalette={lidarPalette}
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
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
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

          {/* Bottom-left Legend for Google Maps mode */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-none">
            <div className="bg-stone-900/90 border border-stone-800 text-stone-300 text-xs px-3 py-1.5 rounded-xl shadow-lg backdrop-blur flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500 shrink-0" />
              <span>
                Red Polygons: <strong>Scheduled Monuments</strong> (Protected)
              </span>
              {isLoadingMonuments && (
                <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-1" />
              )}
            </div>

            {currentPin && (
              <div className="bg-stone-950/90 border border-stone-800 text-stone-400 font-mono text-[11px] px-2.5 py-1 rounded-lg shadow backdrop-blur">
                Pin: {currentPin.lat.toFixed(5)}, {currentPin.lng.toFixed(5)}
              </div>
            )}
          </div>
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

          <div className="flex items-center space-x-1.5 mt-5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '200ms' }} />
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      )}

      {/* 3. Unified Map Controls (Rendered AFTER map engine with z-[1050] so Leaflet panes never obscure it) */}
      <div className="absolute top-[68px] sm:top-[74px] left-3 sm:left-4 z-[1050] flex flex-col items-start space-y-2 pointer-events-auto select-none">
        {/* Layer & Engine Switcher Bar */}
        <div className="flex items-center space-x-1 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 p-1 rounded-2xl shadow-2xl max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar">
          {/* Satellite Layer Button */}
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

          {/* High-Resolution UK LiDAR Elevation Hillshade Button */}
          <button
            type="button"
            onClick={() => {
              if (activeEngine !== 'fieldGis') setActiveEngine('fieldGis');
              setGisLayer('lidar');
            }}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
              activeEngine === 'fieldGis' && gisLayer === 'lidar'
                ? 'bg-emerald-500 text-stone-950 shadow-md font-extrabold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="UK LiDAR Hillshade Composite for England & Wales (Reveals faint earthworks & cropmarks)"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>LiDAR</span>
          </button>

          {/* UK Topo Contours Layer */}
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
            <span>UK Topo</span>
          </button>

          {/* Field Tracks & Footpaths Layer */}
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

          <div className="w-[1px] h-5 bg-stone-700/80 mx-0.5 shrink-0" />

          {/* Map Engine Toggle: GIS / Google */}
          <button
            type="button"
            onClick={() => {
              const next = activeEngine === 'fieldGis' ? 'google' : 'fieldGis';
              setActiveEngine(next);
              if (next === 'google') setIsMapLoaded(false);
            }}
            className="px-2 py-1.5 text-[11px] font-mono text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-xl transition flex items-center space-x-1 cursor-pointer shrink-0"
            title={activeEngine === 'fieldGis' ? 'Switch to Google Maps Engine' : 'Switch to Field GIS Satellite Engine'}
          >
            <Globe className="w-3 h-3" />
            <span>{activeEngine === 'fieldGis' ? 'GIS' : 'Google'}</span>
          </button>
        </div>

        {/* Secondary Row: Scheduled Monuments Toggle & Locate Me GPS */}
        <div className="flex items-center space-x-2">
          {/* Scheduled Monuments Toggle Button */}
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

          {/* Locate Me GPS Button */}
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

        {/* Tertiary Row: LiDAR Palette & Relief Controls (Only visible when LiDAR layer is selected) */}
        {gisLayer === 'lidar' && activeEngine === 'fieldGis' && (
          <div className="bg-stone-900/95 backdrop-blur-xl border border-emerald-600/60 p-3 rounded-2xl shadow-2xl w-[300px] sm:w-[340px] space-y-2.5 pointer-events-auto transition-all animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span>LiDAR Relief &amp; Palette</span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold">
                {lidarContrast}%
              </span>
            </div>

            {/* Base Colour / Palette Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                <span>Base Colour:</span>
                <span className="text-[10px] text-emerald-400 font-mono capitalize">
                  {lidarPalette === 'green' ? 'Pasture Green (Default)' : lidarPalette}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {/* Pasture Green Button (Default) */}
                <button
                  type="button"
                  onClick={() => setLidarPalette('green')}
                  className={`px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                    lidarPalette === 'green'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-md shadow-emerald-950/60'
                      : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                  title="Pasture Green (Natural field meadow, removes white glare)"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 shrink-0" />
                  <span className="truncate">Green</span>
                </button>

                {/* Topo Emerald Button */}
                <button
                  type="button"
                  onClick={() => setLidarPalette('emerald')}
                  className={`px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                    lidarPalette === 'emerald'
                      ? 'bg-teal-600/30 border-teal-400 text-teal-200 font-bold shadow-md shadow-teal-950/60'
                      : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                  title="Emerald Moss (Deep high-contrast topography)"
                >
                  <span className="w-3 h-3 rounded-full bg-teal-400 border border-teal-200 shrink-0" />
                  <span className="truncate">Emerald</span>
                </button>

                {/* Bronze / Sepia Earth Button */}
                <button
                  type="button"
                  onClick={() => setLidarPalette('sepia')}
                  className={`px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                    lidarPalette === 'sepia'
                      ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-950/60'
                      : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                  title="Archaeological Bronze / Sepia Earth Tone"
                >
                  <span className="w-3 h-3 rounded-full bg-amber-600 border border-amber-400 shrink-0" />
                  <span className="truncate">Bronze</span>
                </button>

                {/* Slate Relief Button */}
                <button
                  type="button"
                  onClick={() => setLidarPalette('slate')}
                  className={`px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                    lidarPalette === 'slate'
                      ? 'bg-slate-600/30 border-slate-400 text-slate-200 font-bold shadow-md shadow-slate-950/60'
                      : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                  title="Dark Slate / Charcoal Relief (Anti-glare night)"
                >
                  <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-300 shrink-0" />
                  <span className="truncate">Slate</span>
                </button>

                {/* Original Grayscale Button */}
                <button
                  type="button"
                  onClick={() => setLidarPalette('original')}
                  className={`px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                    lidarPalette === 'original'
                      ? 'bg-stone-600/30 border-stone-300 text-stone-100 font-bold shadow-md'
                      : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
                  }`}
                  title="Classic Monochrome Grayscale"
                >
                  <span className="w-3 h-3 rounded-full bg-stone-300 border border-stone-100 shrink-0" />
                  <span className="truncate">Classic</span>
                </button>
              </div>
            </div>

            {/* Relief Contrast Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span>Relief Contrast:</span>
                <span className="font-mono text-emerald-300 font-semibold">{lidarContrast}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-stone-500 font-mono">60%</span>
                <input
                  type="range"
                  min="60"
                  max="250"
                  step="5"
                  value={lidarContrast}
                  onChange={(e) => setLidarContrast(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                  aria-label="LiDAR Contrast Slider"
                />
                <span className="text-[10px] text-stone-500 font-mono">250%</span>
              </div>
            </div>

            {/* Quick Contrast presets */}
            <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-[10px]">
              <span className="text-stone-400 font-medium">Quick Depth:</span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setLidarContrast(100)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                    lidarContrast === 100
                      ? 'bg-emerald-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  100% Flat
                </button>
                <button
                  type="button"
                  onClick={() => setLidarContrast(140)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                    lidarContrast === 140
                      ? 'bg-emerald-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  140% Enhanced
                </button>
                <button
                  type="button"
                  onClick={() => setLidarContrast(200)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                    lidarContrast === 200
                      ? 'bg-emerald-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  200% Deep
                </button>
              </div>
            </div>

            <p className="text-[10px] text-stone-400 leading-tight">
              Pasture green base eliminates white glare, revealing subtle ridge &amp; furrow, barrows &amp; sunken ditches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
