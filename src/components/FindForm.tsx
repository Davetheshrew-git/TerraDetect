import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  MapPin,
  Save,
  Loader2,
  Tag,
  ShieldAlert,
  Info,
  Layers,
  X,
  Compass,
  Check,
  Globe,
  WifiOff,
  Cloud
} from 'lucide-react';
import { MetalFind, COMMON_METALS, POPULAR_TAGS } from '../types';
import { SAMPLE_SPECIMENS, SampleSpecimen } from '../data/sampleFinds';
import { ProximityCheckResult } from '../lib/geoUtils';
import { saveLocalFind } from '../lib/offlineDb';

interface FindFormProps {
  currentPin: { lat: number; lng: number; accuracy?: number } | null;
  onUpdatePin: (lat: number, lng: number) => void;
  proximityResult: ProximityCheckResult | null;
  onSaveFind: (findData: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  userId?: string;
  userDisplayName?: string;
  isOnline?: boolean;
  onOfflineQueued?: () => void;
  prefillData?: {
    title?: string;
    metalType?: string;
    depth?: string;
    targetVdi?: string;
    notes?: string;
    customTags?: string[];
    imageBase64?: string;
  } | null;
  onSaved?: () => void;
}

export const FindForm: React.FC<FindFormProps> = ({
  currentPin,
  onUpdatePin,
  proximityResult,
  onSaveFind,
  userId,
  userDisplayName,
  isOnline,
  onOfflineQueued,
  prefillData,
  onSaved
}) => {
  // Form states
  const [title, setTitle] = useState('');
  const [depth, setDepth] = useState('6 inches');
  const [targetVdi, setTargetVdi] = useState('84');
  const [metalType, setMetalType] = useState('Silver');
  const [customTags, setCustomTags] = useState<string[]>(['Hammered Coin', 'Roman']);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [generalLocation, setGeneralLocation] = useState('Wiltshire, UK');
  const [isPublic, setIsPublic] = useState(true);
  const [imageBase64, setImageBase64] = useState<string>('');

  // Submission states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedOfflineNotice, setSavedOfflineNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set prefill data if supplied
  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.metalType) setMetalType(prefillData.metalType);
      if (prefillData.depth) setDepth(prefillData.depth);
      if (prefillData.targetVdi) setTargetVdi(prefillData.targetVdi);
      if (prefillData.notes) setNotes(prefillData.notes);
      if (prefillData.customTags) setCustomTags(prefillData.customTags);
      if (prefillData.imageBase64) setImageBase64(prefillData.imageBase64);
    }
  }, [prefillData]);

  // Set default sample specimen on mount if empty
  useEffect(() => {
    if (!imageBase64 && !prefillData && SAMPLE_SPECIMENS.length > 0) {
      applySample(SAMPLE_SPECIMENS[0]);
    }
  }, [prefillData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const applySample = (specimen: SampleSpecimen) => {
    setTitle(specimen.title);
    setDepth(specimen.suggestedDepth);
    setTargetVdi(specimen.suggestedVdi);
    setMetalType(specimen.metalType);
    setCustomTags(specimen.tags);
    setNotes(specimen.notes);
    setImageBase64(specimen.imageUrl);
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags([...customTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('Please enter a title for this find.');
      return;
    }

    const lat = currentPin ? currentPin.lat : 51.1789;
    const lng = currentPin ? currentPin.lng : -1.8262;

    setIsSaving(true);
    try {
      const findPayload: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'device-owner',
        userDisplayName: userDisplayName || 'Detectorist (Device Vault)',
        title: title.trim(),
        depth,
        targetVdi,
        metalType,
        customTags,
        notes: notes.trim(),
        latitude: lat,
        longitude: lng,
        accuracy: currentPin?.accuracy || 5,
        generalLocation: generalLocation.trim() || 'United Kingdom',
        imageUrl: imageBase64,
        isPublic,
        likesCount: 0,
        nearScheduledMonument: proximityResult?.isWithinWarningDistance || false,
        nearestMonumentName: proximityResult?.nearestMonumentName || undefined,
        nearestMonumentDistance: proximityResult?.distanceMeters || undefined
      };

      await onSaveFind(findPayload);
      setSaveSuccess(true);
      if (onSaved) setTimeout(onSaved, 900);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving find to local vault:', err);
      setFormError('Could not save find. Please check device storage permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-stone-100 pb-12">
      {/* Form Error Banner */}
      {formError && (
        <div className="bg-rose-500/20 border border-rose-500/50 rounded-xl p-3.5 text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3.5 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>Find saved safely to your device's private local vault!</span>
        </div>
      )}

      {/* Monument proximity alert card inside form */}
      {proximityResult?.isWithinWarningDistance && (
        <div
          className={`border rounded-xl p-3 text-xs flex items-start space-x-2.5 ${
            proximityResult.isInsideMonument
              ? 'bg-rose-950/80 border-rose-600 text-rose-200'
              : 'bg-amber-950/80 border-amber-500 text-amber-200'
          }`}
        >
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold block uppercase tracking-wide">
              {proximityResult.isInsideMonument
                ? 'Inside Scheduled Monument'
                : `Within ${proximityResult.distanceMeters}m of Scheduled Monument`}
            </span>
            <span className="opacity-90">
              {proximityResult.nearestMonumentName}. Location tagged with legal warning.
            </span>
          </div>
        </div>
      )}

      {/* 1. Photo Upload & Visual Record Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-stone-200 flex items-center space-x-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Find Photograph &amp; Visual Record</span>
          </label>
          <span className="text-[11px] text-stone-400">Coins, Tokens, Brooches, Axes</span>
        </div>

        {/* Photo preview / upload dropzone */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-700 hover:border-amber-500/80 rounded-2xl aspect-square flex flex-col items-center justify-center p-3 cursor-pointer bg-stone-950/70 overflow-hidden relative group transition"
            >
              {imageBase64 ? (
                <>
                  <img
                    src={imageBase64}
                    alt="Find preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-medium transition">
                    <Upload className="w-5 h-5 mb-1 text-amber-400" />
                    <span>Change Photo</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-stone-400 p-3">
                  <Upload className="w-7 h-7 mx-auto mb-2 text-stone-500 group-hover:text-amber-400" />
                  <p className="text-xs font-medium">Click or Drop Photo</p>
                  <p className="text-[10px] text-stone-500 mt-1">JPEG, PNG, WebP</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Quick preset selector */}
          <div className="sm:col-span-2 flex flex-col justify-center space-y-2">
            <span className="text-xs font-mono uppercase text-stone-400 font-semibold block">
              Quick Specimen Presets:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {SAMPLE_SPECIMENS.map(sample => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => applySample(sample)}
                  className="text-left bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/60 p-2.5 rounded-xl transition group cursor-pointer"
                >
                  <p className="font-semibold text-stone-200 group-hover:text-amber-400 line-clamp-1">
                    {sample.title}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                    VDI: {sample.suggestedVdi} • {sample.metalType}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Select a preset to fill sample detector readings, or type your custom find details below.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Find Details Form Fields */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-sm font-bold text-stone-200 border-b border-stone-800 pb-2">
          Find Metadata &amp; Ground Context
        </h4>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Find Title / Designation *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Silver Denarius of Hadrian, Bronze Age Palstave"
            className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Depth & VDI & Metal Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Depth */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Recovery Depth
            </label>
            <input
              type="text"
              value={depth}
              onChange={e => setDepth(e.target.value)}
              placeholder="e.g. 6 inches / 15 cm"
              className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 font-mono transition"
            />
          </div>

          {/* Target VDI / ID */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Target VDI / ID</span>
              <span className="text-[10px] font-mono text-amber-400">Scale 0–99</span>
            </label>
            <input
              type="text"
              value={targetVdi}
              onChange={e => setTargetVdi(e.target.value)}
              placeholder="e.g. 84 (High Silver)"
              className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 font-mono transition"
            />
          </div>

          {/* Metal Type */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Metal Type
            </label>
            <select
              value={metalType}
              onChange={e => setMetalType(e.target.value)}
              className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 transition"
            >
              {COMMON_METALS.map(metal => (
                <option key={metal} value={metal}>
                  {metal}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* General Location & Community Share Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              General Location / County (Privacy Safe)
            </label>
            <input
              type="text"
              value={generalLocation}
              onChange={e => setGeneralLocation(e.target.value)}
              placeholder="e.g. Wiltshire, UK or Norfolk, UK"
              className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              Exact GPS coordinates remain strictly private in your vault.
            </span>
          </div>

          <div className="flex items-center space-x-3 bg-stone-950/70 border border-stone-800 rounded-xl p-3">
            <input
              type="checkbox"
              id="isPublicCheck"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <label htmlFor="isPublicCheck" className="text-xs text-stone-200 cursor-pointer">
              <strong className="block text-stone-100 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Share to Community Feed</span>
              </strong>
              <span className="text-stone-400 text-[11px]">
                Allow fellow detectorists to admire this find
              </span>
            </label>
          </div>
        </div>

        {/* GPS Coordinates & Accuracy */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Exact GPS Coordinates</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {currentPin ? `Acc: ±${Math.round(currentPin.accuracy || 5)}m` : 'Click map to place pin'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-300">
              <span className="text-[10px] text-stone-500 block">Latitude</span>
              {currentPin ? currentPin.lat.toFixed(6) : '51.178900'}
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-300">
              <span className="text-[10px] text-stone-500 block">Longitude</span>
              {currentPin ? currentPin.lng.toFixed(6) : '-1.826200'}
            </div>
          </div>
        </div>

        {/* Custom Tags */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Custom Tags</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {customTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-medium"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(newTagInput);
                }
              }}
              placeholder="Type tag & press enter (e.g. Tudor, Celtic, Fibula)"
              className="grow bg-stone-950 border border-stone-750 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => handleAddTag(newTagInput)}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1.5 rounded-xl border border-stone-700 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Field Notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5">
            Field Notes, Soil Conditions &amp; Detector Settings
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Ploughed loam soil, heavy iron trash nearby, Minelab Manticore in All-Terrain High-Conductors mode..."
            className="w-full bg-stone-950 border border-stone-750 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm sm:text-base bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xl shadow-amber-950/40 transition active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Persisting Find...</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>Save Find to Device Vault</span>
          </>
        )}
      </button>
    </form>
  );
};
