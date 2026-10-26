import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Info,
  CheckCircle2,
  Scale,
  Landmark
} from 'lucide-react';
import { ProximityCheckResult, MonumentFeature } from '../lib/geoUtils';

interface HeritageDrawerProps {
  proximityResult: ProximityCheckResult | null;
  currentPin: { lat: number; lng: number; accuracy?: number } | null;
  onOpenTreasureInfo: () => void;
  onClose: () => void;
}

export const HeritageDrawer: React.FC<HeritageDrawerProps> = ({
  proximityResult,
  currentPin,
  onOpenTreasureInfo,
  onClose
}) => {
  const isInside = proximityResult?.isInsideMonument;
  const isWarning = proximityResult?.isWithinWarningDistance;
  const nearestName = proximityResult?.nearestMonumentName;
  const nearestId = proximityResult?.nearestMonumentId;
  const nearestUrl = proximityResult?.nearestMonumentUrl;
  const distanceM = proximityResult ? Math.round(proximityResult.distanceMeters) : null;

  return (
    <div className="space-y-5 pb-8 text-stone-200">
      {/* Status Card */}
      <div
        className={`p-4 rounded-2xl border space-y-2 ${
          isInside
            ? 'bg-rose-950/40 border-rose-600/80 text-rose-100 shadow-xl shadow-rose-950/40'
            : isWarning
            ? 'bg-amber-950/40 border-amber-600/80 text-amber-100 shadow-xl shadow-amber-950/40'
            : 'bg-emerald-950/30 border-emerald-600/50 text-emerald-100 shadow-xl shadow-emerald-950/30'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isInside || isWarning ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <h3 className="font-bold text-sm">
            {isInside
              ? 'INSIDE SCHEDULED MONUMENT BOUNDARY'
              : isWarning
              ? `WITHIN 50m BUFFER ZONE (${distanceM}m)`
              : 'CLEAR TO DETECT (Outside Protected Monuments)'}
          </h3>
        </div>

        <p className="text-xs leading-relaxed opacity-90">
          {isInside
            ? 'Metal detecting on a Scheduled Monument without written consent from the Secretary of State (Section 2 consent) is a strict criminal offense under the Ancient Monuments and Archaeological Areas Act 1979.'
            : isWarning
            ? `Your current location pin is approximately ${distanceM}m from a legally protected Scheduled Monument. Maintain a mandatory 50m buffer margin to avoid boundary overlap.`
            : 'Current pin is clear of Scheduled Monuments in the Historic England and Cadw GIS databases. Always ensure you have valid landowner permission.'}
        </p>

        {nearestName && (
          <div className="pt-2 border-t border-white/10 mt-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white truncate max-w-[240px]">
                {nearestName}
              </span>
              {nearestId && (
                <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded">
                  List #{nearestId}
                </span>
              )}
            </div>
            {nearestUrl && (
              <a
                href={nearestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-[11px] text-amber-300 hover:underline"
              >
                <span>{nearestUrl.includes('cadw') ? 'View Official Cadw Record (Wales)' : 'View Official Historic England Record'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* GPS Location Pin info */}
      {currentPin && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-stone-300">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Pin Coordinates:</span>
          </div>
          <span className="text-stone-100 font-bold">
            {currentPin.lat.toFixed(5)}, {currentPin.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* UK Detectorist Code of Practice */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
          <Scale className="w-4 h-4 text-amber-400" />
          <span>UK Legal Compliance Checklist</span>
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Landowner Permission:</strong> Written consent secured for the search area before detecting.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Treasure Act 1996:</strong> Any gold/silver &gt;300 yrs or prehistoric hoard must be reported to the local Finds Liaison Officer (FLO) within 14 days.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>NCMD / FID Insurance:</strong> Active public liability insurance while on farm or pasture ground.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>PAS Recording:</strong> Voluntary recording of significant historical items with the Portable Antiquities Scheme (finds.org.uk).
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTreasureInfo}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs font-semibold text-stone-200 flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Read Full Treasure Act 1996 Guide</span>
        </button>
      </div>
    </div>
  );
};
