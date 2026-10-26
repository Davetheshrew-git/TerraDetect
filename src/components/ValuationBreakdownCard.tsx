import React from 'react';
import {
  Coins,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  Crown,
  MapPin,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { AiValuation } from '../types';

interface ValuationBreakdownCardProps {
  valuation: AiValuation;
  onApplyToForm?: () => void;
}

export const ValuationBreakdownCard: React.FC<ValuationBreakdownCardProps> = ({
  valuation,
  onApplyToForm
}) => {
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Moderate':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'Low':
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    }
  };

  const getGradeColor = (grade: string) => {
    const lower = grade.toLowerCase();
    if (lower.includes('unc') || lower.includes('extremely fine') || lower.includes('ef')) {
      return 'text-amber-300 bg-amber-500/20 border-amber-500/40';
    }
    if (lower.includes('very fine') || lower.includes('vf')) {
      return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40';
    }
    if (lower.includes('fine') || lower.includes('f')) {
      return 'text-sky-300 bg-sky-500/20 border-sky-500/40';
    }
    return 'text-stone-300 bg-stone-700/40 border-stone-600/40';
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl text-stone-100">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 px-5 py-4 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-100 flex items-center space-x-2">
              <span>AI Numismatic &amp; Antiquity Valuation</span>
            </h3>
            <p className="text-xs text-stone-400">
              Grounded with live auction databases (CoinArchives, Spink, Numista)
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-mono font-semibold ${getConfidenceBadge(
            valuation.confidence
          )}`}
        >
          {valuation.confidence} Confidence
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Identified Title & Period */}
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-500 font-semibold">
            Identified Ground Find
          </span>
          <h4 className="text-xl font-extrabold text-stone-100 tracking-tight">
            {valuation.coinType}
          </h4>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {valuation.ruler && valuation.ruler !== 'None' && (
              <span className="bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-md text-stone-300 flex items-center space-x-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>{valuation.ruler}</span>
              </span>
            )}
            {valuation.period && (
              <span className="bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-md text-stone-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{valuation.period}</span>
              </span>
            )}
            {valuation.mintMark && (
              <span className="bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-md text-stone-300 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mint: {valuation.mintMark}</span>
              </span>
            )}
          </div>
        </div>

        {/* Valuation & Condition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Estimated Value Range */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-stone-900 border border-amber-500/30 rounded-xl p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Auction Valuation Range (£ GBP)</span>
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono">
              £{valuation.estimatedValueMin?.toLocaleString()} – £{valuation.estimatedValueMax?.toLocaleString()}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Based on recent hammer prices for comparable metal detector finds.
            </p>
          </div>

          {/* Condition Grade */}
          <div className="bg-stone-850 border border-stone-700/80 rounded-xl p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Estimated Condition Grade</span>
            </span>
            <div className="mt-1.5">
              <span
                className={`inline-block px-3 py-1 rounded-lg border text-sm font-bold font-mono ${getGradeColor(
                  valuation.conditionGrade || 'Fine'
                )}`}
              >
                {valuation.conditionGrade}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              Accounts for ground patina, surface strike, and soil mineralization wear.
            </p>
          </div>
        </div>

        {/* Key diagnostic features */}
        {valuation.keyFeatures && valuation.keyFeatures.length > 0 && (
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3.5 text-xs">
            <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px] block mb-2">
              Key Diagnostic Markers:
            </span>
            <ul className="space-y-1.5 text-stone-300">
              {valuation.keyFeatures.map((feature, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* UK Treasure Act 1996 Compliance Notice */}
        {valuation.isPotentialTreasure && (
          <div className="bg-gradient-to-r from-amber-950/70 via-rose-950/60 to-stone-900 border-2 border-amber-500/80 rounded-xl p-4 shadow-lg animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 border border-amber-500/40">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h5 className="font-extrabold text-sm sm:text-base text-amber-300 uppercase tracking-wide">
                    🏛️ Potential UK Treasure Act Notice
                  </h5>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                    Statutory Duty
                  </span>
                </div>
                <p className="text-xs text-stone-200 leading-relaxed">
                  {valuation.treasureNotes ||
                    'This find meets the criteria under the UK Treasure Act 1996 (precious metal content >10% over 300 years old, coin hoard, or significant prehistoric metalwork).'}
                </p>
                <div className="bg-black/40 rounded-lg p-2.5 text-[11px] text-amber-200/90 border border-amber-500/30">
                  <p className="font-semibold">
                    Legal Requirement: Under UK law, you are legally required to report this find to your local Finds Liaison Officer (FLO) or Coroner within 14 days of discovery.
                  </p>
                </div>
                <div className="pt-1 flex flex-wrap gap-2">
                  <a
                    href="https://finds.org.uk/contacts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-lg inline-flex items-center space-x-1.5 transition shadow"
                  >
                    <span>Find Local Finds Liaison Officer (FLO)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://finds.org.uk/treasure"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3 py-1.5 rounded-lg inline-flex items-center space-x-1.5 transition"
                  >
                    <span>PAS Treasure Guidelines</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Reference Matches */}
        {valuation.referenceMatches && valuation.referenceMatches.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold block">
              Live Auction &amp; Museum Reference Matches:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {valuation.referenceMatches.map((ref, idx) => (
                <a
                  key={idx}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/50 p-2.5 rounded-xl transition flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between space-x-2">
                    <span className="text-xs font-medium text-stone-200 group-hover:text-amber-400 line-clamp-1">
                      {ref.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2">
                    <span className="text-amber-500/80 font-mono">{ref.source}</span>
                    {ref.priceNote && (
                      <span className="font-mono text-stone-300 font-medium">{ref.priceNote}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: Apply to Logging Form */}
        {onApplyToForm && (
          <div className="pt-2 border-t border-stone-800 flex justify-end">
            <button
              onClick={onApplyToForm}
              className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 rounded-xl flex items-center space-x-2 transition shadow-lg shadow-amber-950/20"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Apply AI Details to Form</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
