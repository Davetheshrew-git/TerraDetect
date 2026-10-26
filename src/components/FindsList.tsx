import React, { useState, useMemo } from 'react';
import { MetalFind } from '../types';
import {
  Coins,
  Search,
  Filter,
  MapPin,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  Share2,
  Globe,
  Lock
} from 'lucide-react';

interface FindsListProps {
  finds: MetalFind[];
  onSelectFind: (find: MetalFind) => void;
  onDeleteFind: (findId: string) => void;
  onNavigateToMap: (lat: number, lng: number) => void;
  onOpenShareModal: (find: MetalFind) => void;
  className?: string;
}

export const FindsList: React.FC<FindsListProps> = ({
  finds,
  onSelectFind,
  onDeleteFind,
  onNavigateToMap,
  onOpenShareModal,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetal, setSelectedMetal] = useState<string>('ALL');
  const [filterTreasureOnly, setFilterTreasureOnly] = useState(false);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalMin = 0;
    let totalMax = 0;
    let treasureCount = 0;
    let monumentWarningCount = 0;

    finds.forEach(f => {
      if (f.aiAnalysis) {
        totalMin += f.aiAnalysis.estimatedValueMin || 0;
        totalMax += f.aiAnalysis.estimatedValueMax || 0;
      }
      if (f.aiAnalysis?.isPotentialTreasure) {
        treasureCount++;
      }
      if (f.nearScheduledMonument) {
        monumentWarningCount++;
      }
    });

    return {
      totalFinds: finds.length,
      estimatedRange: `£${totalMin.toLocaleString()} – £${totalMax.toLocaleString()}`,
      treasureCount,
      monumentWarningCount
    };
  }, [finds]);

  // Filtered finds
  const filteredFinds = useMemo(() => {
    return finds.filter(find => {
      const matchesSearch =
        find.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        find.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        find.customTags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMetal =
        selectedMetal === 'ALL' ||
        find.metalType.toLowerCase() === selectedMetal.toLowerCase();

      const matchesTreasure =
        !filterTreasureOnly || Boolean(find.aiAnalysis?.isPotentialTreasure);

      return matchesSearch && matchesMetal && matchesTreasure;
    });
  }, [finds, searchQuery, selectedMetal, filterTreasureOnly]);

  // Export to CSV for FLO submission
  const handleExportCsv = () => {
    if (finds.length === 0) return;

    const headers = [
      'Title',
      'Date Logged',
      'Latitude',
      'Longitude',
      'Accuracy (m)',
      'Depth',
      'Target VDI',
      'Metal Type',
      'Tags',
      'Estimated Value Min (GBP)',
      'Estimated Value Max (GBP)',
      'Condition Grade',
      'Potential Treasure Act',
      'Near Scheduled Monument',
      'Notes'
    ];

    const rows = finds.map(f => [
      `"${f.title.replace(/"/g, '""')}"`,
      f.createdAt || '',
      f.latitude,
      f.longitude,
      f.accuracy || '',
      `"${f.depth || ''}"`,
      `"${f.targetVdi || ''}"`,
      `"${f.metalType || ''}"`,
      `"${(f.customTags || []).join('; ')}"`,
      f.aiAnalysis?.estimatedValueMin || '',
      f.aiAnalysis?.estimatedValueMax || '',
      `"${f.aiAnalysis?.conditionGrade || ''}"`,
      f.aiAnalysis?.isPotentialTreasure ? 'YES' : 'NO',
      f.nearScheduledMonument ? 'YES' : 'NO',
      `"${(f.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TerraDetect_Finds_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={className || "space-y-6 text-stone-100 max-w-7xl mx-auto px-4 sm:px-6 py-6"}>
      {/* Top Header & Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Finds */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-stone-400 block mb-1">
            Total Ground Finds
          </span>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {stats.totalFinds}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Persistently synced with Firestore
          </span>
        </div>

        {/* Total Hoard Valuation */}
        <div className="bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-900 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-amber-400 block mb-1 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cumulative Valuation</span>
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
            {stats.estimatedRange}
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            Live web auction matching (£ GBP)
          </span>
        </div>

        {/* Treasure Act Finds */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-rose-400 block mb-1 flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Treasure Act Finds</span>
          </span>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">
            {stats.treasureCount}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Precious metal &gt;300y / Hoards
          </span>
        </div>

        {/* Export / Quick Actions */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-mono uppercase text-stone-400 block mb-1">
            PAS / FLO Export
          </span>
          <button
            onClick={handleExportCsv}
            disabled={finds.length === 0}
            className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV for FLO</span>
          </button>
          <span className="text-[10px] text-stone-500 mt-1">
            Standard format with GPS coordinates
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, ruler, period, or notes..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metal Filter */}
          <select
            value={selectedMetal}
            onChange={e => setSelectedMetal(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Metals</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
            <option value="Copper Alloy">Copper Alloy</option>
            <option value="Lead">Lead</option>
            <option value="Pewter">Pewter</option>
          </select>

          {/* Treasure Only Toggle */}
          <button
            onClick={() => setFilterTreasureOnly(!filterTreasureOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 cursor-pointer ${
              filterTreasureOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Treasure Only</span>
          </button>
        </div>
      </div>

      {/* Finds Cards Grid */}
      {filteredFinds.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <Coins className="w-12 h-12 mx-auto text-stone-600" />
          <h4 className="text-base font-bold text-stone-300">No Finds Logged Yet</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Switch back to the Map &amp; Field Log tab to drop your pin and log your first metallic ground find!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFinds.map(find => {
            const val = find.aiAnalysis;
            return (
              <div
                key={find.id || `${find.latitude}-${find.longitude}`}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/40 rounded-2xl overflow-hidden transition shadow-lg flex flex-col group"
              >
                {/* Photo & Badges */}
                <div className="relative aspect-video bg-stone-950 overflow-hidden">
                  {find.imageUrl ? (
                    <img
                      src={find.imageUrl}
                      alt={find.title}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-600">
                      <Coins className="w-10 h-10" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <span className="bg-stone-900/90 backdrop-blur border border-stone-700 text-stone-200 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md">
                      {find.metalType}
                    </span>
                    {find.targetVdi && (
                      <span className="bg-stone-900/90 backdrop-blur border border-amber-500/40 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                        VDI: {find.targetVdi}
                      </span>
                    )}
                    {find.isPublic ? (
                      <span className="bg-stone-900/90 backdrop-blur border border-emerald-500/40 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center space-x-1" title="Shared to Community Feed">
                        <Globe className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="bg-stone-900/90 backdrop-blur border border-stone-700 text-stone-400 text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center space-x-1" title="Private to your vault">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {val?.isPotentialTreasure && (
                    <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>TREASURE ACT</span>
                    </div>
                  )}

                  {find.nearScheduledMonument && (
                    <div className="absolute bottom-2.5 left-2.5 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur">
                      Near Monument ({find.nearestMonumentDistance || 50}m)
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col justify-between grow space-y-3">
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-stone-100 group-hover:text-amber-400 transition line-clamp-1">
                      {find.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-stone-400 mt-1 font-mono">
                      {find.depth && <span>Depth: {find.depth}</span>}
                      <span>GPS: {find.latitude.toFixed(4)}, {find.longitude.toFixed(4)}</span>
                    </div>

                    {/* AI Valuation Summary */}
                    {val && (
                      <div className="mt-3 bg-stone-950/80 border border-stone-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-amber-500 font-mono block">
                            Est. Auction Range
                          </span>
                          <span className="font-extrabold text-amber-400 font-mono text-sm">
                            £{val.estimatedValueMin?.toLocaleString()} – £{val.estimatedValueMax?.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded border border-stone-700">
                          {val.conditionGrade}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {find.customTags && find.customTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {find.customTags.slice(0, 4).map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onNavigateToMap(find.latitude, find.longitude)}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>

                      <button
                        onClick={() => onOpenShareModal(find)}
                        className="text-xs font-semibold text-stone-300 hover:text-amber-400 flex items-center space-x-1 cursor-pointer transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                    </div>

                    {find.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete find "${find.title}" from Firestore?`)) {
                            onDeleteFind(find.id!);
                          }
                        }}
                        className="text-stone-500 hover:text-rose-400 p-1.5 transition cursor-pointer"
                        title="Delete find"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
