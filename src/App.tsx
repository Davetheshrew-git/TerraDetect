/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MetalFind } from './types';
import { ProximityCheckResult } from './lib/geoUtils';
import {
  saveLocalFind,
  getAllLocalFinds,
  deleteLocalFind
} from './lib/offlineDb';
import { usePWAInstall } from './hooks/usePWAInstall';
import { MapContainer } from './components/MapContainer';
import { SlideDrawer } from './components/SlideDrawer';
import { FindForm } from './components/FindForm';
import { FindsList } from './components/FindsList';
import { HeritageDrawer } from './components/HeritageDrawer';
import { CommunityFeed } from './components/CommunityFeed';
import { ShareFindModal } from './components/ShareFindModal';
import { LocalVaultModal } from './components/LocalVaultModal';
import { TreasureActModal } from './components/TreasureActModal';
import { TestOnPhoneModal } from './components/TestOnPhoneModal';
import {
  Plus,
  Coins,
  ShieldAlert,
  Users,
  Smartphone,
  Download,
  MapPin,
  WifiOff,
  HardDrive,
  HelpCircle
} from 'lucide-react';

type DrawerTab = 'findForm' | 'findsList' | 'heritage' | 'community' | null;

export default function App() {
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab>(null);
  const [isTreasureModalOpen, setIsTreasureModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [shareFindTarget, setShareFindTarget] = useState<MetalFind | null>(null);

  // PWA installation for Android
  const { isInstallable, triggerInstall } = usePWAInstall();

  // Online / Offline connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Map & Pin state: Defaults to UK heritage center until live GPS resolves
  const [currentPin, setCurrentPin] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  }>({
    lat: 51.1789,
    lng: -1.8262,
    accuracy: 5
  });

  // Scheduled Monuments proximity detection
  const [proximityResult, setProximityResult] = useState<ProximityCheckResult | null>(null);
  const [, setMonumentsInViewCount] = useState(0);

  // Logged finds state from private On-Device Local Vault
  const [finds, setFinds] = useState<MetalFind[]>([]);

  // 1. Load finds from Local Vault on start
  const refreshLocalFinds = useCallback(async () => {
    const list = await getAllLocalFinds();
    setFinds(list);
  }, []);

  useEffect(() => {
    refreshLocalFinds();
  }, [refreshLocalFinds]);

  // 2. Online / Offline listeners for aerial & LiDAR map streaming
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Immediately acquire user's live geolocation on app startup
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCurrentPin({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 5
          });
        },
        err => {
          // If user denies or offline, cleanly retains default UK coordinates
          console.info('Startup GPS status:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, []);

  // Handle pin update from map clicks or GPS
  const handlePinChange = useCallback(
    (lat: number, lng: number, accuracy?: number) => {
      setCurrentPin({ lat, lng, accuracy });
    },
    []
  );

  // Handle proximity result update from MapContainer
  const handleProximityChange = useCallback((result: ProximityCheckResult) => {
    setProximityResult(result);
  }, []);

  // Save new find directly to Local Vault
  const handleSaveFind = async (
    findData: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const saved = await saveLocalFind(findData);
    setFinds(prev => [saved, ...prev]);
  };

  // Delete find directly from Local Vault
  const handleDeleteFind = async (findId: string) => {
    await deleteLocalFind(findId);
    setFinds(prev => prev.filter(f => f.id !== findId));
  };

  // Navigate to map and center on specific find
  const handleNavigateToMap = (lat: number, lng: number) => {
    setCurrentPin({ lat, lng, accuracy: 3 });
    setActiveDrawer(null);
  };

  // Open Log Find drawer
  const handleOpenLogFind = () => {
    setActiveDrawer('findForm');
  };

  const isProximityAlert = proximityResult?.isInsideMonument || proximityResult?.isWithinWarningDistance;
  const distanceToMonument = proximityResult ? Math.round(proximityResult.distanceMeters) : null;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-stone-950 text-stone-100 font-sans select-none">
      {/* 1. Full-Screen Interactive Map (Google Maps / Field GIS Fallback) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          currentPin={currentPin}
          onPinChange={handlePinChange}
          onProximityChange={handleProximityChange}
          savedFinds={finds}
          onMonumentsCountChange={setMonumentsInViewCount}
          onSelectFind={find => handleNavigateToMap(find.latitude, find.longitude)}
          className="w-full h-full"
        />
      </div>

      {/* 2. Floating Top HUD Bar (Pill design, Android safe-area compliant) */}
      <header className="fixed top-3 inset-x-3 sm:top-4 sm:inset-x-5 z-20 pointer-events-none flex items-center justify-between gap-2">
        {/* Brand Pill */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-stone-900/90 hover:bg-stone-900 border border-stone-750/90 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-xl transition shrink-0">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute opacity-70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 relative" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-tight text-stone-100">
            TerraDetect <span className="text-amber-400 font-mono text-[11px] font-bold">UK</span>
          </span>
        </div>

        {/* Center: Persistent Scheduled Monument 50m Proximity Alert Pill */}
        {isProximityAlert && (
          <button
            type="button"
            onClick={() => setActiveDrawer('heritage')}
            className="pointer-events-auto flex items-center space-x-1.5 bg-rose-600/95 hover:bg-rose-500 text-white font-bold text-[11px] sm:text-xs px-3.5 py-1.5 rounded-2xl shadow-2xl shadow-rose-950/70 border border-rose-400/50 animate-bounce cursor-pointer active:scale-95 transition shrink-0 max-w-[200px] sm:max-w-none"
            title="Click to view Historic England boundary details"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
            <span className="truncate">
              {proximityResult?.isInsideMonument
                ? 'INSIDE SCHEDULED MONUMENT!'
                : `MONUMENT < 50m (${distanceToMonument}m)`}
            </span>
          </button>
        )}

        {/* Right HUD Controls: Online/Offline, PWA Install, User Profile, Treasure Act */}
        <div className="pointer-events-auto flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Offline / Online Pill */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl border text-[11px] font-mono shadow-md backdrop-blur-xl ${
              isOnline
                ? 'bg-stone-900/85 border-stone-750 text-stone-300'
                : 'bg-amber-950/90 border-amber-600/60 text-amber-300'
            }`}
            title={isOnline ? 'Online for LiDAR & aerial map tiles' : 'Offline: local finds and tools active'}
          >
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden md:inline font-semibold">
              {isOnline ? 'Map Online' : 'Field Offline'}
            </span>
          </div>

          {/* Device Local Vault (100% On-Device Storage & Backup) */}
          <button
            type="button"
            onClick={() => setIsVaultModalOpen(true)}
            className="flex items-center space-x-1.5 bg-stone-900/90 hover:bg-stone-850 border border-emerald-500/40 text-stone-200 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl text-xs font-semibold active:scale-95 cursor-pointer transition shadow-md group"
            title="Device Local Vault (100% On-Device Private Storage & JSON Backup)"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              <HardDrive className="w-3 h-3" />
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-bold">
              Vault ({finds.length})
            </span>
          </button>

          {/* Android PWA Install to Home Screen Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={triggerInstall}
              className="flex items-center space-x-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold px-2.5 py-1.5 rounded-2xl shadow-lg border border-amber-300/60 active:scale-95 cursor-pointer transition"
              title="Install TerraDetect App on Android"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">Install App</span>
            </button>
          )}

          {/* Test on Phone / Mobile QR Code Button */}
          <button
            type="button"
            onClick={() => setIsPhoneModalOpen(true)}
            className="flex items-center space-x-1.5 bg-stone-900/85 hover:bg-stone-800 border border-stone-750 text-amber-400 hover:text-amber-300 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl text-xs font-bold active:scale-95 cursor-pointer transition shadow-md"
            title="Test on Phone (QR Code & Mobile Link)"
          >
            <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Phone Test</span>
          </button>

          {/* Treasure Act 1996 Info Button */}
          <button
            type="button"
            onClick={() => setIsTreasureModalOpen(true)}
            className="w-8 h-8 rounded-2xl bg-stone-900/85 hover:bg-stone-800 border border-stone-750 text-stone-300 hover:text-amber-400 backdrop-blur-xl flex items-center justify-center active:scale-95 cursor-pointer transition shadow-md"
            title="Treasure Act 1996 & FLO Reporting Guidance"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. Android Floating Side Action Buttons (FAB Stack on Right Edge - Easy Thumb Reach) */}
      <nav
        aria-label="Field Controls"
        className="fixed right-3 bottom-5 sm:right-5 sm:bottom-6 z-20 flex flex-col items-end space-y-2.5 pointer-events-auto"
      >
        {/* 1. Primary Action: LOG FIND (+) */}
        <button
          type="button"
          onClick={handleOpenLogFind}
          className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-black shadow-2xl shadow-amber-950/80 border-2 border-amber-300/70 active:scale-90 cursor-pointer transition-transform duration-200"
          title="Log / Record Metallic Find"
        >
          <Plus className="w-8 h-8 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
          <span className="absolute right-16 sm:right-18 bg-stone-900/95 border border-stone-750 text-stone-100 text-xs font-bold px-2.5 py-1 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Log New Find
          </span>
        </button>

        {/* 2. Finds Logbook */}
        <button
          type="button"
          onClick={() => setActiveDrawer('findsList')}
          className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-stone-900/90 hover:bg-stone-850 active:scale-95 text-stone-200 hover:text-amber-400 border border-stone-750 shadow-xl backdrop-blur-xl cursor-pointer transition"
          title="Field Logbook & Recorded Finds"
        >
          <Coins className="w-5 h-5" />
          {finds.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
              {finds.length}
            </span>
          )}
          <span className="absolute right-14 sm:right-16 bg-stone-900/95 border border-stone-750 text-stone-100 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Finds Log ({finds.length})
          </span>
        </button>

        {/* 4. Heritage & Scheduled Monuments GIS */}
        <button
          type="button"
          onClick={() => setActiveDrawer('heritage')}
          className={`group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl shadow-xl backdrop-blur-xl active:scale-95 cursor-pointer transition ${
            isProximityAlert
              ? 'bg-rose-950/90 text-rose-300 border-2 border-rose-500 animate-pulse'
              : 'bg-stone-900/90 hover:bg-stone-850 text-stone-200 hover:text-amber-400 border border-stone-750'
          }`}
          title="Scheduled Monuments & Ancient Monuments Act 1979"
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="absolute right-14 sm:right-16 bg-stone-900/95 border border-stone-750 text-stone-100 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Scheduled Monuments
          </span>
        </button>

        {/* 5. UK Detectorist Community Feed */}
        <button
          type="button"
          onClick={() => setActiveDrawer('community')}
          className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-stone-900/90 hover:bg-stone-850 active:scale-95 text-stone-200 hover:text-amber-400 border border-stone-750 shadow-xl backdrop-blur-xl cursor-pointer transition"
          title="UK Community Discoveries"
        >
          <Users className="w-5 h-5" />
          <span className="absolute right-14 sm:right-16 bg-stone-900/95 border border-stone-750 text-stone-100 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Community Feed
          </span>
        </button>
      </nav>

      {/* 4. Slide-in Responsive Drawers (Bottom sheet on mobile, Right drawer on tablet) */}

      {/* Drawer A: Log Metallic Find (FindForm) */}
      <SlideDrawer
        isOpen={activeDrawer === 'findForm'}
        onClose={() => setActiveDrawer(null)}
        title="Log Metallic Find"
        icon={<MapPin className="w-5 h-5" />}
        subtitle="Depth, target VDI, soil, photo & coordinates"
        badge={
          <span className="text-[10px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold">
            GPS Tagged
          </span>
        }
      >
        <FindForm
          currentPin={currentPin}
          onUpdatePin={(lat, lng) => handlePinChange(lat, lng)}
          proximityResult={proximityResult}
          onSaveFind={handleSaveFind}
          userId="device-owner"
          userDisplayName="Detectorist"
          isOnline={isOnline}
          onSaved={() => {
            setActiveDrawer(null);
          }}
        />
      </SlideDrawer>

      {/* Drawer B: Field Logbook & Recorded Finds */}
      <SlideDrawer
        isOpen={activeDrawer === 'findsList'}
        onClose={() => setActiveDrawer(null)}
        title="Field Logbook & Recorded Finds"
        icon={<Coins className="w-5 h-5" />}
        subtitle={`${finds.length} ground find${finds.length === 1 ? '' : 's'} recorded`}
      >
        <FindsList
          finds={finds}
          onSelectFind={find => handleNavigateToMap(find.latitude, find.longitude)}
          onDeleteFind={handleDeleteFind}
          onNavigateToMap={handleNavigateToMap}
          onOpenShareModal={find => setShareFindTarget(find)}
          onOpenVaultModal={() => setIsVaultModalOpen(true)}
          className="space-y-5 text-stone-100 pb-8"
        />
      </SlideDrawer>

      {/* Drawer D: Scheduled Monuments & Heritage GIS */}
      <SlideDrawer
        isOpen={activeDrawer === 'heritage'}
        onClose={() => setActiveDrawer(null)}
        title="Scheduled Monuments GIS"
        icon={<ShieldAlert className="w-5 h-5" />}
        subtitle="Historic England & Cadw statutory protection"
      >
        <HeritageDrawer
          proximityResult={proximityResult}
          currentPin={currentPin}
          onOpenTreasureInfo={() => {
            setActiveDrawer(null);
            setIsTreasureModalOpen(true);
          }}
          onClose={() => setActiveDrawer(null)}
        />
      </SlideDrawer>

      {/* Drawer E: Community Discoveries Feed */}
      <SlideDrawer
        isOpen={activeDrawer === 'community'}
        onClose={() => setActiveDrawer(null)}
        title="UK Community Discoveries"
        icon={<Users className="w-5 h-5" />}
        subtitle="Public finds verified across Britain"
      >
        <CommunityFeed
          onOpenShareModal={find => setShareFindTarget(find)}
          className="space-y-4 text-stone-100 pb-8"
        />
      </SlideDrawer>

      {/* 5. Modals */}
      <ShareFindModal
        find={shareFindTarget}
        isOpen={Boolean(shareFindTarget)}
        onClose={() => setShareFindTarget(null)}
      />

      <LocalVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        finds={finds}
        onVaultUpdated={refreshLocalFinds}
      />

      <TreasureActModal
        isOpen={isTreasureModalOpen}
        onClose={() => setIsTreasureModalOpen(false)}
      />

      <TestOnPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
      />
    </div>
  );
}
