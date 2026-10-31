import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Coins
} from 'lucide-react';
import { MetalFind, isPreciousTreasureCandidate } from '../types';

interface ShareFindModalProps {
  find: MetalFind | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareFindModal: React.FC<ShareFindModalProps> = ({ find, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !find) return null;

  const locationLabel = find.generalLocation || 'United Kingdom';
  const isTreasure = isPreciousTreasureCandidate(find);

  const shareText = `⛏️ Recorded a metal detecting ground find with TerraDetect UK!
🪙 ${find.title}
📍 Region: ${locationLabel}
⚡ VDI: ${find.targetVdi || 'N/A'} • Depth: ${find.depth || 'Surface'} • Metal: ${find.metalType}
${isTreasure ? '🏛️ Potential UK Treasure Act 1996 discovery\n' : ''}#metaldetecting #detectorist #UKArchaeology #treasure`;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(appUrl)}`;

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    appUrl
  )}&quote=${encodeURIComponent(shareText)}`;

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText}\n${appUrl}`
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TerraDetect UK: ${find.title}`,
          text: shareText,
          url: appUrl
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full text-stone-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-950 px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Share Ground Find</h3>
              <p className="text-[11px] text-stone-400">Export find card (exact GPS protected)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="p-5 space-y-4">
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-3 flex space-x-3">
            {find.imageUrl ? (
              <img
                src={find.imageUrl}
                alt={find.title}
                className="w-20 h-20 rounded-xl object-contain bg-black border border-stone-800 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 shrink-0">
                <Coins className="w-8 h-8" />
              </div>
            )}
            <div className="overflow-hidden space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                {find.metalType} • {locationLabel}
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-100 line-clamp-1">
                {find.title}
              </h4>
              <p className="text-[11px] font-mono text-stone-400">
                Depth: {find.depth || 'Surface'} • VDI: {find.targetVdi || 'N/A'}
              </p>
              {isTreasure && (
                <span className="inline-block text-[9px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                  Treasure Act 1996
                </span>
              )}
            </div>
          </div>

          {/* Share Links */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-stone-400 font-semibold block">
              Choose Platform:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <a
                href={twitterHref}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-sky-500/50 text-stone-200 transition flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4 fill-current text-sky-400" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X / Twitter</span>
              </a>

              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-blue-500/50 text-stone-200 transition flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4 fill-current text-blue-500" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/50 text-stone-200 transition flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-stone-200 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>More Apps</span>
              </button>
            </div>
          </div>

          {/* Copy Text Card */}
          <div className="pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied Summary to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-400" />
                  <span>Copy Find Summary Card</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
