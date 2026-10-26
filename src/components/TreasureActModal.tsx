import React from 'react';
import { X, ShieldAlert, ExternalLink, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface TreasureActModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TreasureActModal: React.FC<TreasureActModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full text-stone-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-stone-900 px-6 py-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-stone-100">
                UK Treasure Act 1996 &amp; FLO Guidance
              </h3>
              <p className="text-xs text-stone-400">
                Statutory legal obligations for metal detectorists in England &amp; Wales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs sm:text-sm text-stone-300 max-h-[70vh] overflow-y-auto">
          {/* Statutory 14-Day Notice Warning */}
          <div className="bg-rose-950/50 border border-rose-500/50 rounded-2xl p-4 text-rose-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>LEGAL STATUTORY REQUIREMENT (14-DAY LIMIT)</span>
            </div>
            <p className="leading-relaxed">
              Under the <strong>Treasure Act 1996</strong>, finders in England, Wales, and Northern Ireland have a legal obligation to report all finds that qualify as Treasure to the local coroner or your local <strong>Finds Liaison Officer (FLO)</strong> within <strong>14 days of finding it</strong>, or within 14 days of realizing it may be treasure.
            </p>
            <p className="text-[11px] text-rose-300/80">
              * Failure to report a find of treasure without reasonable excuse is a criminal offence punishable by up to 3 months' imprisonment and/or an unlimited fine.
            </p>
          </div>

          {/* What constitutes Treasure? */}
          <div className="space-y-3">
            <h4 className="font-bold text-base text-stone-100 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>What Counts as Treasure?</span>
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200 block">Precious Metal Objects (&gt;300 Years Old):</strong>
                  Any metallic object (other than a coin) with at least 10% gold or silver by weight and at least 300 years old.
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200 block">Coin Hoards:</strong>
                  Two or more coins with at least 10% gold or silver at least 300 years old, or 10 or more coins of any metal (bronze/potin) at least 300 years old found together.
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200 block">Prehistoric Base-Metal Assemblages:</strong>
                  Any group of two or more prehistoric base metal objects (e.g. Bronze Age or Iron Age hoards).
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200 block">2023 Significance Amendment:</strong>
                  Any metallic object over 200 years old that provides exceptional historical, artistic, or archaeological significance to national or regional history.
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Monuments Warning */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-stone-200 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Scheduled Monuments &amp; Protected Land (Act 1979)</span>
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Metal detecting on a Scheduled Monument without written permission (Section 42 consent) from Historic England (or Cadw in Wales) is illegal under the <strong>Ancient Monuments and Archaeological Areas Act 1979</strong>. TerraDetect highlights all scheduled monument boundaries with semi-transparent red polygons and automatically warns you when your location or pin is within 50 meters of a boundary.
            </p>
          </div>

          {/* Official Resources & Links */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono uppercase text-stone-400 font-semibold block">
              Official UK Heritage Portals:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <a
                href="https://finds.org.uk/contacts"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 p-3 rounded-xl transition flex items-center justify-between group"
              >
                <div>
                  <strong className="text-amber-400 block group-hover:underline">
                    Find Your Local FLO
                  </strong>
                  <span className="text-stone-400 text-[11px]">Portable Antiquities Scheme Contacts</span>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-amber-400" />
              </a>

              <a
                href="https://historicengland.org.uk/advice/planning/consents/scheduled-monument-consent/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 p-3 rounded-xl transition flex items-center justify-between group"
              >
                <div>
                  <strong className="text-amber-400 block group-hover:underline">
                    Historic England SMC Advice
                  </strong>
                  <span className="text-stone-400 text-[11px]">Scheduled Monument Consent Guidance</span>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-amber-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-950 px-6 py-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer"
          >
            I Understand My Responsibilities
          </button>
        </div>
      </div>
    </div>
  );
};
