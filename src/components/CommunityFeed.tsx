import React, { useState, useEffect } from 'react';
import {
  Users,
  Share2,
  ShieldAlert,
  Coins,
  MapPin,
  Search,
  ThumbsUp
} from 'lucide-react';
import { MetalFind, isPreciousTreasureCandidate } from '../types';
import { SAMPLE_SPECIMENS } from '../data/sampleFinds';
import { getAllLocalFinds, updateLocalFind } from '../lib/offlineDb';

interface CommunityFeedProps {
  onOpenShareModal: (find: MetalFind) => void;
  className?: string;
}

const HERITAGE_ARCHIVE_FINDS: MetalFind[] = SAMPLE_SPECIMENS.map((specimen, idx) => ({
  id: `td_archive_${specimen.id}`,
  userId: 'uk-archaeology-archive',
  userDisplayName: 'TerraDetect UK Heritage Archive',
  title: specimen.title,
  depth: specimen.suggestedDepth,
  targetVdi: specimen.suggestedVdi,
  metalType: specimen.metalType,
  customTags: specimen.tags,
  notes: specimen.notes,
  latitude: 51.1789 + idx * 0.04,
  longitude: -1.8262 + idx * 0.03,
  generalLocation: 'Wiltshire / Hampshire Chalklands',
  imageUrl: specimen.imageUrl,
  isPublic: true,
  likesCount: 18 + idx * 9,
  nearScheduledMonument: false,
  createdAt: new Date(Date.now() - (idx + 1) * 86400000 * 2).toISOString(),
  updatedAt: new Date().toISOString()
}));

const LIKES_STORAGE_KEY = 'terradetect_community_kudos';

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ onOpenShareModal, className }) => {
  const [publicFinds, setPublicFinds] = useState<MetalFind[]>(HERITAGE_ARCHIVE_FINDS);
  const [selectedMetal, setSelectedMetal] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(LIKES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    getAllLocalFinds()
      .then(localRecords => {
        const sharedByOwner = localRecords.filter(f => f.isPublic);
        const merged = [...sharedByOwner, ...HERITAGE_ARCHIVE_FINDS];
        const deduplicated = Array.from(
          new Map(merged.map(item => [item.id || item.title, item])).values()
        );
        deduplicated.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPublicFinds(deduplicated);
      })
      .catch(() => {});
  }, []);

  const handleKudos = async (findId?: string) => {
    if (!findId || likedMap[findId]) return;

    const updatedLikes = { ...likedMap, [findId]: true };
    setLikedMap(updatedLikes);
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
    } catch {
      // Ignore storage quota warnings
    }

    setPublicFinds(prev =>
      prev.map(f => (f.id === findId ? { ...f, likesCount: (f.likesCount || 0) + 1 } : f))
    );

    if (findId.startsWith('td_find_') || findId.startsWith('td_restored_')) {
      const target = publicFinds.find(f => f.id === findId);
      if (target) {
        updateLocalFind(findId, { likesCount: (target.likesCount || 0) + 1 }).catch(() => {});
      }
    }
  };

  const filteredFinds = publicFinds.filter(find => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch =
      find.title.toLowerCase().includes(queryLower) ||
      find.generalLocation?.toLowerCase().includes(queryLower) ||
      find.userDisplayName?.toLowerCase().includes(queryLower) ||
      find.customTags?.some(t => t.toLowerCase().includes(queryLower));

    const matchesMetal =
      selectedMetal === 'ALL' ||
      find.metalType.toLowerCase() === selectedMetal.toLowerCase();

    return matchesSearch && matchesMetal;
  });

  return (
    <div className={className || 'max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-stone-100'}>
      {/* Feed Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-950/30">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-stone-100">UK Detectorist Showcase</h2>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                British Field Archive
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Explore verified historical ground finds and discoveries shared from your Local Vault.
            </p>
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 font-mono text-xs flex items-center space-x-2 shrink-0">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-stone-300">
            <strong>{publicFinds.length}</strong> Archive &amp; Vault Finds
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
            placeholder="Search finds, counties, rulers, or periods..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

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
        </select>
      </div>

      {/* Finds Stream */}
      {filteredFinds.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-3">
          <Coins className="w-12 h-12 mx-auto text-stone-600" />
          <h4 className="text-base font-bold text-stone-300">No Matching Discoveries</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your filter or check "Include in Showcase" when logging a find in your Local Vault.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFinds.map(find => {
            const isTreasure = isPreciousTreasureCandidate(find);
            const isLiked = find.id ? Boolean(likedMap[find.id]) : false;

            return (
              <div
                key={find.id}
                className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl transition hover:border-stone-700"
              >
                {/* Post Author Bar */}
                <div className="px-6 py-4 bg-stone-950/70 border-b border-stone-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-400">
                      {find.userDisplayName ? find.userDisplayName[0].toUpperCase() : 'D'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-100">
                        {find.userDisplayName || 'Detectorist'}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{find.generalLocation || 'United Kingdom (Coordinates Protected)'}</span>
                        <span>•</span>
                        <span>{new Date(find.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {isTreasure && (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>TREASURE ACT</span>
                    </span>
                  )}
                </div>

                {/* Main Content Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-5 bg-stone-950 rounded-2xl aspect-square overflow-hidden border border-stone-800 flex items-center justify-center relative">
                    {find.imageUrl ? (
                      <img
                        src={find.imageUrl}
                        alt={find.title}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <Coins className="w-16 h-16 text-stone-700" />
                    )}
                    <span className="absolute bottom-2.5 left-2.5 bg-stone-900/90 text-stone-200 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur border border-stone-700">
                      {find.metalType} • VDI: {find.targetVdi || 'N/A'}
                    </span>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
                        {find.metalType} Ground Find
                      </span>
                      <h3 className="text-xl font-extrabold text-stone-100 tracking-tight mt-0.5">
                        {find.title}
                      </h3>
                      {find.depth && (
                        <p className="text-xs text-stone-400 mt-1 font-mono">
                          Depth: {find.depth}
                        </p>
                      )}
                    </div>

                    {find.notes && (
                      <p className="text-xs text-stone-300 bg-stone-950/60 p-3 rounded-xl border border-stone-850 italic">
                        "{find.notes}"
                      </p>
                    )}

                    {find.customTags && find.customTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {find.customTags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Interaction Bar */}
                <div className="px-6 py-3.5 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleKudos(find.id)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                        : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-stone-800 hover:border-amber-500/40'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>Tip of the Hat ({find.likesCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenShareModal(find)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800 hover:border-amber-500/40 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Share Find</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
