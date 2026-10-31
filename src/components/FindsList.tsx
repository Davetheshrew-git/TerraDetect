import React, { useState, useMemo } from 'react';
import { MetalFind, isPreciousTreasureCandidate } from '../types';
import { exportLocalVaultBackup } from '../lib/offlineDb';
import {
  Coins,
  Search,
  MapPin,
  Trash2,
  ShieldAlert,
  Download,
  Share2,
  Globe,
  Lock,
  HardDrive,
  Check,
  X
} from 'lucide-react';

interface FindsListProps {
  finds: MetalFind[];
  onSelectFind: (find: MetalFind) => void;
  onDeleteFind: (findId: string) => void;
  onNavigateToMap: (lat: number, lng: number) => void;
  onOpenShareModal: (find: MetalFind) => void;
  onOpenVaultModal?: () => void;
  className?: string;
}

export const FindsList: React.FC<FindsListProps> = ({
  finds,
  onDeleteFind,
  onNavigateToMap,
  onOpenShareModal,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetal, setSelectedMetal] = useState<string>('ALL');
  const [filterTreasureOnly, setFilterTreasureOnly] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let preciousCount = 0;
    let monumentWarningCount = 0;

    for (const f of finds) {
      if (isPreciousTreasureCandidate(f)) {
        preciousCount++;
      }
      if (f.nearScheduledMonument) {
        monumentWarningCount++;
      }
    }

    return {
      totalFinds: finds.length,
      preciousCount,
      monumentWarningCount
    };
  }, [finds]);

  const filteredFinds = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return finds.filter(find => {
      const matchesSearch =
        find.title.toLowerCase().includes(q) ||
        find.notes?.toLowerCase().includes(q) ||
        find.customTags?.some(t => t.toLowerCase().includes(q));

      const matchesMetal =
        selectedMetal === 'ALL' ||
        find.metalType.toLowerCase() === selectedMetal.toLowerCase();

      const matchesTreasure = !filterTreasureOnly || isPreciousTreasureCandidate(find);

      return matchesSearch && matchesMetal && matchesTreasure;
    });
  }, [finds, searchQuery, selectedMetal, filterTreasureOnly]);

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
      isPreciousTreasureCandidate(f) ? 'YES' : 'NO',
      f.nearScheduledMonument ? 'YES' : 'NO',
      `"${(f.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvPayload = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvPayload], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TerraDetect_FLO_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={className || 'space-y-6 text-stone-100 max-w-7xl mx-auto px-4 sm:px-6 py-6'}>
      {/* Top Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-stone-400 block mb-1">
            Total Ground Finds
          </span>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {stats.totalFinds}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            100% On-Device Vault
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-amber-400 mb-1 flex items-center space-x-1">
            <Coins className="w-3.5 h-3.5" />
            <span>Precious Metals</span>
          </span>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {stats.preciousCount}
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            Gold &amp; Silver specimens
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-mono uppercase text-rose-400 mb-1 flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Monument Proximity</span>
          </span>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">
            {stats.monumentWarningCount}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Logged within 50m zone
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm space-y-2">
          <span className="text-xs font-mono uppercase text-stone-400 block">
            Vault Backup &amp; FLO
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={finds.length === 0}
              className="py-2 px-2.5 bg-stone-800 hover:bg-stone-750 disabled:opacity-50 text-stone-200 border border-stone-700 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow cursor-pointer"
              title="Export CSV formatted for British Finds Liaison Officer / PAS"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV (FLO)</span>
            </button>
            <button
              type="button"
              onClick={() => exportLocalVaultBackup()}
              disabled={finds.length === 0}
              className="py-2 px-2.5 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 disabled:opacity-50 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow cursor-pointer"
              title="Download complete JSON backup with photos and coordinates"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backup JSON</span>
            </button>
          </div>
          <span className="text-[10px] text-stone-500 block">
            Save securely to phone or PC
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
            placeholder="Search by title, tag, period, or field notes..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
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
            Tap the + button on the map to record your first metallic ground find into your private device vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFinds.map(find => {
            const isTreasure = isPreciousTreasureCandidate(find);
            const isConfirmingDelete = confirmDeleteId === find.id;

            return (
              <div
                key={find.id || `${find.latitude}-${find.longitude}`}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/40 rounded-2xl overflow-hidden transition shadow-lg flex flex-col group"
              >
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
                      <span
                        className="bg-stone-900/90 backdrop-blur border border-emerald-500/40 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center space-x-1"
                        title="Included in Detectorist Showcase"
                      >
                        <Globe className="w-3 h-3" />
                      </span>
                    ) : (
                      <span
                        className="bg-stone-900/90 backdrop-blur border border-stone-700 text-stone-400 text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center space-x-1"
                        title="Private to your device vault"
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {isTreasure && (
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

                <div className="p-4 flex flex-col justify-between grow space-y-3">
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-stone-100 group-hover:text-amber-400 transition line-clamp-1">
                      {find.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-stone-400 mt-1 font-mono">
                      {find.depth && <span>Depth: {find.depth}</span>}
                      <span>
                        GPS: {find.latitude.toFixed(4)}, {find.longitude.toFixed(4)}
                      </span>
                    </div>

                    {find.notes && (
                      <p className="mt-2 text-xs text-stone-300 italic line-clamp-2 bg-stone-950/60 p-2 rounded-lg border border-stone-850">
                        "{find.notes}"
                      </p>
                    )}

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
                        type="button"
                        onClick={() => onNavigateToMap(find.latitude, find.longitude)}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenShareModal(find)}
                        className="text-xs font-semibold text-stone-300 hover:text-amber-400 flex items-center space-x-1 cursor-pointer transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                    </div>

                    {find.id && (
                      <div className="flex items-center space-x-1">
                        {isConfirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteFind(find.id!);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                              title="Confirm deletion from Local Vault"
                            >
                              <Check className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 rounded bg-stone-800 text-stone-400 hover:text-stone-200 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(find.id!)}
                            className="text-stone-500 hover:text-rose-400 p-1.5 transition cursor-pointer"
                            title="Remove from Local Vault"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
