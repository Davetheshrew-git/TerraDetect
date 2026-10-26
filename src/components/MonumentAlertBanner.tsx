import React from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, X, MapPin } from 'lucide-react';
import { ProximityCheckResult } from '../lib/geoUtils';

interface MonumentAlertBannerProps {
  proximityResult: ProximityCheckResult | null;
  onDismiss?: () => void;
  onCenterOnMonument?: () => void;
}

export const MonumentAlertBanner: React.FC<MonumentAlertBannerProps> = ({
  proximityResult,
  onDismiss,
  onCenterOnMonument
}) => {
  if (!proximityResult || !proximityResult.isWithinWarningDistance) {
    return null;
  }

  const { isInsideMonument, distanceMeters, nearestMonumentName, nearestMonumentId, nearestMonumentUrl } =
    proximityResult;

  return (
    <div
      className={`border-b px-4 py-3 shadow-lg transition-all animate-in slide-in-from-top duration-300 ${
        isInsideMonument
          ? 'bg-rose-950/90 border-rose-600 text-rose-100'
          : 'bg-amber-950/90 border-amber-500 text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isInsideMonument ? 'bg-rose-600/30 text-rose-400 border border-rose-500/50' : 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
            }`}
          >
            {isInsideMonument ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                {isInsideMonument
                  ? '⛔ EXCLUSION ZONE: PIN IS INSIDE A SCHEDULED MONUMENT'
                  : `⚠️ PROXIMITY ALERT: PIN IS WITHIN ${distanceMeters}m OF SCHEDULED MONUMENT`}
              </span>
              {nearestMonumentId && (
                <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  NHLE #{nearestMonumentId}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm mt-0.5 font-medium opacity-95">
              Monument: <span className="underline decoration-dotted">{nearestMonumentName || 'Protected Archaeological Asset'}</span>.
            </p>
            <p className="text-[11px] sm:text-xs opacity-80 mt-1 max-w-4xl">
              Under the <strong>Ancient Monuments and Archaeological Areas Act 1979 (Section 42)</strong>, it is a criminal offence to use a metal detector in a protected area or remove archaeological objects without written consent from Historic England or Cadw.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          {nearestMonumentUrl && (
            <a
              href={nearestMonumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold bg-black/40 hover:bg-black/60 border border-white/20 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
            >
              <span>View NHLE Entry</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-black/30 rounded-lg text-white/70 hover:text-white transition"
              title="Acknowledge alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
