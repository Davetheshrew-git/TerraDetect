import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  Download,
  Share2
} from 'lucide-react';

interface TestOnPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestOnPhoneModal: React.FC<TestOnPhoneModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [urlMode, setUrlMode] = useState<'dev' | 'shared'>('dev');

  if (!isOpen) return null;

  const devUrl =
    typeof window !== 'undefined' && window.location?.origin?.startsWith('http')
      ? window.location.origin
      : 'https://ais-dev-nrv56ebrlxj266irmg5dhf-962830534041.europe-west2.run.app';

  const sharedUrl =
    'https://ais-pre-nrv56ebrlxj266irmg5dhf-962830534041.europe-west2.run.app';

  const activeUrl = urlMode === 'dev' ? devUrl : sharedUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    activeUrl
  )}&margin=10`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full text-stone-100 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-stone-900 px-5 sm:px-6 py-4 sm:py-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-stone-100">
                Launch TerraDetect UK on Mobile
              </h3>
              <p className="text-xs text-stone-400">
                QR code launcher &amp; home-screen field installation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-200 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-stone-300 max-h-[75vh] overflow-y-auto">
          {/* Mode Selector Tabs */}
          <div className="flex items-center p-1 bg-stone-950 rounded-2xl border border-stone-800">
            <button
              type="button"
              onClick={() => setUrlMode('dev')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                urlMode === 'dev'
                  ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Primary App Link</span>
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('shared')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                urlMode === 'shared'
                  ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Published Mirror Link</span>
            </button>
          </div>

          {/* QR Code and Quick Link Card */}
          <div className="bg-stone-950/80 border border-stone-800/90 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center space-y-3">
            <div className="bg-white p-2.5 rounded-2xl shadow-xl border border-stone-700/50">
              <img
                src={qrCodeUrl}
                alt="Scan QR code to launch TerraDetect UK on mobile"
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-stone-200">
                Scan with Phone Camera
              </span>
              <p className="text-[11px] text-stone-400 max-w-xs">
                Open on your phone in the field for live GPS positioning, Scheduled Monument boundary warnings, and private on-device vault logging.
              </p>
            </div>

            <div className="w-full flex items-center space-x-2 bg-stone-900 border border-stone-800 rounded-xl p-1.5 pl-3">
              <span className="font-mono text-[11px] text-amber-400 truncate flex-1 text-left select-all">
                {activeUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-stone-100 flex items-center space-x-2">
              <Download className="w-4 h-4 text-amber-400" />
              <span>Install as a Standalone Field App (PWA)</span>
            </h4>

            <div className="bg-stone-850/80 border border-stone-750/70 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-emerald-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Android (Chrome)</span>
              </div>
              <ol className="list-decimal list-inside text-xs text-stone-300 space-y-1 pl-1">
                <li>Scan the QR code and open in Chrome on Android.</li>
                <li>Tap <strong>"Install App"</strong> in the top bar or open browser menu (<strong className="font-mono">⋮</strong>).</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
              </ol>
            </div>

            <div className="bg-stone-850/80 border border-stone-750/70 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-sky-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>iPhone / iPad (Safari)</span>
              </div>
              <ol className="list-decimal list-inside text-xs text-stone-300 space-y-1 pl-1">
                <li>Open the link in <strong>Safari</strong> on iOS.</li>
                <li>Tap the <strong>Share</strong> icon in the bottom bar.</li>
                <li>Choose <strong>"Add to Home Screen"</strong>.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-950/80 px-6 py-3.5 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
