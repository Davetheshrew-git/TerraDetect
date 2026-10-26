import React from 'react';
import {
  Compass,
  MapPin,
  Coins,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  LogOut,
  LogIn,
  Layers,
  FileText,
  Users,
  Wifi,
  WifiOff,
  CloudUpload,
  Loader2
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  currentView: 'map' | 'gallery' | 'community';
  onViewChange: (view: 'map' | 'gallery' | 'community') => void;
  findsCount: number;
  totalEstimatedValue: number;
  monumentsCount: number;
  user: any;
  onOpenTreasureInfo: () => void;
  onOpenAuthModal: () => void;
  isOnline: boolean;
  pendingOfflineCount: number;
  onSyncOffline: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  findsCount,
  totalEstimatedValue,
  monumentsCount,
  user,
  onOpenTreasureInfo,
  onOpenAuthModal,
  isOnline,
  pendingOfflineCount,
  onSyncOffline,
  isSyncing
}) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const isGuest = !user || user.isAnonymous;

  return (
    <header className="border-b border-stone-800 bg-stone-900/95 backdrop-blur sticky top-0 z-40 text-stone-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('map')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 border border-amber-400/40 shrink-0">
              <Compass className="w-6 h-6 text-stone-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-amber-400">
                  Terra<span className="text-stone-100">Detect</span>
                </span>
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold tracking-wider hidden xs:inline-block">
                  UK Heritage
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                Ground Finds Logger • Scheduled Monuments GIS • AI Valuation
              </p>
            </div>
          </div>

          {/* Center Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => onViewChange('map')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  currentView === 'map'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => onViewChange('gallery')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  currentView === 'gallery'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>My Vault ({findsCount})</span>
              </button>
              <button
                onClick={() => onViewChange('community')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  currentView === 'community'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Community</span>
              </button>
            </div>

            {/* Offline sync trigger & network status */}
            {!isOnline ? (
              <div className="flex items-center space-x-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-mono">
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Offline Mode</span>
              </div>
            ) : pendingOfflineCount > 0 ? (
              <button
                onClick={onSyncOffline}
                disabled={isSyncing}
                className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Sync offline finds to Firestore"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Sync {pendingOfflineCount} Offline</span>
              </button>
            ) : (
              <div className="hidden xl:flex items-center space-x-1.5 text-emerald-400 text-[11px] font-mono px-2 py-1">
                <Wifi className="w-3 h-3" />
                <span>Synced</span>
              </div>
            )}
          </div>

          {/* Right Action: Treasure Act Guide & Auth */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenTreasureInfo}
              className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-2.5 py-1.5 rounded-lg hidden md:flex items-center space-x-1.5 transition cursor-pointer"
              title="UK Treasure Act 1996 & FLO Reporting Guide"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Treasure Act Guide</span>
            </button>

            {!isGuest ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-stone-800">
                <div className="flex items-center space-x-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Detectorist'}
                      className="w-8 h-8 rounded-full border border-amber-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-xs font-bold text-amber-400">
                      {user.displayName ? user.displayName[0].toUpperCase() : 'D'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-stone-300 hidden md:inline max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-md transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition shadow cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
