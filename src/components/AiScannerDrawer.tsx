import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  X
} from 'lucide-react';
import { AiValuation, MetalFind } from '../types';
import { SAMPLE_SPECIMENS, SampleSpecimen } from '../data/sampleFinds';

interface AiScannerDrawerProps {
  onTransferToLogger: (prefillData: {
    title: string;
    metalType: string;
    depth: string;
    targetVdi: string;
    notes: string;
    customTags: string[];
    imageBase64: string;
    aiValuation: AiValuation;
  }) => void;
  onClose: () => void;
}

export const AiScannerDrawer: React.FC<AiScannerDrawerProps> = ({
  onTransferToLogger,
  onClose
}) => {
  const [imageBase64, setImageBase64] = useState<string>(SAMPLE_SPECIMENS[0]?.imageUrl || '');
  const [metalHint, setMetalHint] = useState('Silver');
  const [depthHint, setDepthHint] = useState('6 inches');
  const [vdiHint, setVdiHint] = useState('84');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [valuation, setValuation] = useState<AiValuation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result);
        setValuation(null);
        setAnalysisError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setAnalysisError('Please snap a photo or select an artifact image first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          metalType: metalHint,
          targetVdi: vdiHint,
          depth: depthHint,
          generalLocation: 'United Kingdom'
        })
      });

      if (!response.ok) {
        throw new Error(`AI Service returned ${response.status}`);
      }

      const data = await response.json();
      setValuation(data);
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAnalysisError(err?.message || 'Unable to analyze artifact image. Please check your connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySample = (specimen: SampleSpecimen) => {
    setImageBase64(specimen.imageUrl);
    setMetalHint(specimen.metalType);
    setDepthHint(specimen.suggestedDepth);
    setVdiHint(specimen.suggestedVdi);
    setValuation(null);
    setAnalysisError(null);
  };

  const handleLogThisFind = () => {
    if (!valuation) return;
    onTransferToLogger({
      title: valuation.coinType || 'Identified Ground Specimen',
      metalType: metalHint,
      depth: depthHint,
      targetVdi: vdiHint,
      notes: `${valuation.period || ''} - ${valuation.ruler || ''}. Grade: ${valuation.conditionGrade || 'Ground Specimen'}.`,
      customTags: [valuation.period || 'Historical', metalHint, 'AI Identified'].filter(Boolean),
      imageBase64,
      aiValuation: valuation
    });
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-900 border border-amber-500/30 rounded-2xl p-4">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Google Gemini AI Artifact Lens</span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          Snap a photo of your ground find directly in the field. Google Gemini analyzes coin legends, ruler portraits, patina, and artifact morphology to identify the object and check UK Treasure Act rules.
        </p>
      </div>

      {/* Image Capture & Preview */}
      <div className="space-y-3">
        <div className="relative aspect-video max-h-56 w-full rounded-2xl overflow-hidden border-2 border-dashed border-stone-700 bg-stone-950 flex flex-col items-center justify-center group">
          {imageBase64 ? (
            <>
              <img
                src={imageBase64}
                alt="Artifact Preview"
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-amber-500 text-stone-950 rounded-xl text-xs font-bold shadow hover:bg-amber-400 cursor-pointer"
                >
                  Change Photo
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <Camera className="w-8 h-8 text-stone-500 mx-auto mb-2" />
              <p className="text-xs text-stone-400 font-medium">Take photo with camera or upload</p>
            </div>
          )}
        </div>

        {/* Mobile Camera & Upload Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-750 text-xs font-semibold cursor-pointer active:scale-95 transition"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Camera / Photo</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            disabled={!imageBase64 || isAnalyzing}
            onClick={handleAnalyze}
            className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 text-xs font-bold shadow-lg shadow-amber-950/50 cursor-pointer active:scale-95 transition"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Identify Find</span>
              </>
            )}
          </button>
        </div>

        {/* Sample Specimens Carousel for Instant Test */}
        <div className="pt-1">
          <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
            Or test with ground specimen samples:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {SAMPLE_SPECIMENS.map((specimen, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applySample(specimen)}
                className="shrink-0 flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl border border-stone-800 bg-stone-900/80 hover:bg-stone-800 hover:border-amber-500/50 transition cursor-pointer text-left"
              >
                <img
                  src={specimen.imageUrl}
                  alt={specimen.title}
                  className="w-8 h-8 rounded-lg object-cover bg-stone-950"
                />
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-stone-200 truncate max-w-[120px]">
                    {specimen.title}
                  </div>
                  <div className="text-[10px] text-amber-400">{specimen.metalType}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Error */}
      {analysisError && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* AI Valuation & Identification Result */}
      {valuation && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-stone-900 border border-stone-750 rounded-2xl p-4 space-y-3 shadow-xl">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  {valuation.period || 'Historical Era'}
                </span>
                <h4 className="text-base font-bold text-stone-100">
                  {valuation.coinType || 'Identified Artifact'}
                </h4>
                {valuation.ruler && (
                  <p className="text-xs text-stone-300 mt-0.5">
                    <strong>Ruler / Issuer:</strong> {valuation.ruler}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-mono block">Estimated Value</span>
                <span className="text-base font-bold text-emerald-400">
                  £{valuation.estimatedValueMin} – £{valuation.estimatedValueMax}
                </span>
              </div>
            </div>

            {/* Spec Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-800">
              <div className="bg-stone-950/70 p-2.5 rounded-xl border border-stone-850">
                <span className="text-[10px] text-stone-400 block font-mono">Condition Grade</span>
                <span className="font-semibold text-stone-200">{valuation.conditionGrade || 'Fine'}</span>
              </div>
              <div className="bg-stone-950/70 p-2.5 rounded-xl border border-stone-850">
                <span className="text-[10px] text-stone-400 block font-mono">Mint / Origin</span>
                <span className="font-semibold text-stone-200">{valuation.mintMark || 'Britain / Gaul'}</span>
              </div>
            </div>

            {/* Treasure Act 1996 Compliance Check */}
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                valuation.isPotentialTreasure
                  ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                {valuation.isPotentialTreasure ? (
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {valuation.isPotentialTreasure
                    ? 'Treasure Act 1996: Potential Statutory Treasure'
                    : 'Treasure Act 1996: Single Stray / Base Metal Item'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {valuation.treasureNotes ||
                  'Report any potential treasure finds to your local Finds Liaison Officer (FLO) within 14 days of discovery.'}
              </p>
            </div>

            {/* Auction Comparables / Notes */}
            {valuation.referenceMatches && valuation.referenceMatches.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono uppercase text-stone-400 font-semibold block">
                  Auction Comparables &amp; Records:
                </span>
                <div className="space-y-1">
                  {valuation.referenceMatches.map((rec, i) => (
                    <div
                      key={i}
                      className="text-[11px] bg-stone-950 p-2 rounded-lg border border-stone-850 flex items-center justify-between text-stone-300"
                    >
                      <span className="truncate pr-2">{rec.source || rec.title}</span>
                      <span className="font-mono text-emerald-400 font-semibold shrink-0">
                        {rec.priceNote || 'Auction record'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transfer to Find Logger Button */}
            <button
              type="button"
              onClick={handleLogThisFind}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/60 cursor-pointer active:scale-95 transition"
            >
              <span>Save &amp; Log This Find in Book</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
