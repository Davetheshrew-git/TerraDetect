import React, { useState, useEffect } from 'react';
import {
  Users,
  Heart,
  Share2,
  Sparkles,
  ShieldAlert,
  Coins,
  MapPin,
  Calendar,
  Award,
  Crown,
  Search,
  MessageCircle,
  ThumbsUp
} from 'lucide-react';
import { MetalFind } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';

interface CommunityFeedProps {
  onOpenShareModal: (find: MetalFind) => void;
  className?: string;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ onOpenShareModal, className }) => {
  const [publicFinds, setPublicFinds] = useState<MetalFind[]>([]);
  const [selectedMetal, setSelectedMetal] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const pathForPublic = 'finds';
    const q = query(
      collection(db, pathForPublic),
      where('isPublic', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const list: MetalFind[] = [];
        snapshot.forEach(docSnap => {
          list.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<MetalFind, 'id'>)
          });
        });

        // Sort latest first
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPublicFinds(list);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, pathForPublic);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleKudos = async (findId?: string) => {
    if (!findId || likedMap[findId]) return;

    setLikedMap(prev => ({ ...prev, [findId]: true }));
    try {
      const docRef = doc(db, 'finds', findId);
      await updateDoc(docRef, {
        likesCount: increment(1)
      });
    } catch (err) {
      console.warn('Failed to increment kudos:', err);
    }
  };

  const filteredFinds = publicFinds.filter(find => {
    const matchesSearch =
      find.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      find.generalLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      find.userDisplayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      find.customTags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMetal =
      selectedMetal === 'ALL' ||
      find.metalType.toLowerCase() === selectedMetal.toLowerCase();

    return matchesSearch && matchesMetal;
  });

  return (
    <div className={className || "max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-stone-100"}>
      {/* Feed Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-950/30">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-stone-100">Detectorist Community Feed</h2>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                Live UK Discoveries
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Admire verified ground finds shared by fellow detectorists across the UK.
            </p>
          </div>
        </div>

        {/* Counter */}
        <div className="bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 font-mono text-xs flex items-center space-x-2 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-stone-300">
            <strong>{publicFinds.length}</strong> Community Finds
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
            placeholder="Search community finds, regions, handles, or periods..."
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
          <h4 className="text-base font-bold text-stone-300">No Community Finds Found</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Be the first to share a discovery! Check "Share to Community Feed" when logging your next find.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFinds.map(find => {
            const val = find.aiAnalysis;
            const isLiked = find.id ? likedMap[find.id] : false;

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
                        {find.userDisplayName || 'Anonymous Detectorist'}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{find.generalLocation || 'United Kingdom (Coordinates Protected)'}</span>
                        <span>•</span>
                        <span>{new Date(find.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {val?.isPotentialTreasure && (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>TREASURE ACT</span>
                    </span>
                  )}
                </div>

                {/* Main Content Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Photo Column */}
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

                  {/* Details Column */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-500 font-semibold tracking-wider">
                        {val?.period || 'Historical Ground Specimen'}
                      </span>
                      <h3 className="text-xl font-extrabold text-stone-100 tracking-tight mt-0.5">
                        {find.title}
                      </h3>
                      {val?.ruler && (
                        <p className="text-xs text-stone-300 flex items-center space-x-1.5 mt-1 font-medium">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reign / Ruler: {val.ruler}</span>
                        </p>
                      )}
                    </div>

                    {/* AI Valuation Cardlet */}
                    {val && (
                      <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-stone-400 block">
                            Auction Range
                          </span>
                          <span className="text-lg font-extrabold text-amber-400 font-mono">
                            £{val.estimatedValueMin?.toLocaleString()} – £{val.estimatedValueMax?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-stone-400 block">
                            Condition Grade
                          </span>
                          <span className="text-sm font-bold text-stone-200 font-mono">
                            {val.conditionGrade}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Field Notes */}
                    {find.notes && (
                      <p className="text-xs text-stone-300 bg-stone-950/60 p-3 rounded-xl border border-stone-850 italic">
                        "{find.notes}"
                      </p>
                    )}

                    {/* Tags */}
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
                    onClick={() => handleKudos(find.id)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                        : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-stone-800 hover:border-amber-500/40'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>Tip of the Hat ({ (find.likesCount || 0) + (isLiked ? 1 : 0) })</span>
                  </button>

                  <button
                    onClick={() => onOpenShareModal(find)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800 hover:border-amber-500/40 transition"
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
