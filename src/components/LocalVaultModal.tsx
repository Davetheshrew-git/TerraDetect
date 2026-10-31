import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  Lock,
  Smartphone
} from 'lucide-react';
import {
  exportLocalVaultBackup,
  importLocalVaultBackup,
  clearLocalVault,
  getLocalVaultStats
} from '../lib/offlineDb';
import { MetalFind } from '../types';

interface LocalVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  finds: MetalFind[];
  onVaultUpdated: () => void;
}

export const LocalVaultModal: React.FC<LocalVaultModalProps> = ({
  isOpen,
  onClose,
  finds,
  onVaultUpdated
}) => {
  const [stats, setStats] = useState<{ count: number; estimatedSizeKB: number }>({
    count: finds.length,
    estimatedSizeKB: 0
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStats = async () => {
    const s = await getLocalVaultStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      setImportNotice(null);
      setConfirmClear(false);
    }
  }, [isOpen, finds.length]);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      await exportLocalVaultBackup();
    } catch (err: any) {
      setImportNotice(`Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotice(null);

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const result = await importLocalVaultBackup(text);
        setImportNotice(`Successfully restored ${result.importedCount} find${result.importedCount === 1 ? '' : 's'} to your local device vault!`);
        await refreshStats();
        onVaultUpdated();
      } catch (err: any) {
        setImportNotice(`Import error: ${err?.message || 'Invalid backup file'}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setImportNotice('Failed to read the selected file.');
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const handleClearVault = async () => {
    await clearLocalVault();
    setConfirmClear(false);
    await refreshStats();
    onVaultUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full text-stone-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-950 px-6 py-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-stone-100">Device Local Vault</h3>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  100% On-Device
                </span>
              </div>
              <p className="text-xs text-stone-400">Private, offline storage on your phone or PC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Privacy Guarantee Card */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-stone-200">Zero Cloud Tracking &amp; Total Privacy</h4>
              <p className="text-stone-400 leading-relaxed">
                When you own this app, all recorded finds, exact GPS coordinates, high-resolution photos, and field notes are stored strictly inside your browser's persistent <strong>IndexedDB</strong>. Nothing is transmitted to external cloud servers.
              </p>
            </div>
          </div>

          {/* Storage Meter */}
          <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase text-stone-400 block mb-1">
                Stored Finds
              </span>
              <div className="text-2xl font-black font-mono text-stone-100">
                {stats.count}
              </div>
              <span className="text-[10px] text-stone-500">
                Permanent ground entries
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-stone-400 block mb-1">
                Local Space Used
              </span>
              <div className="text-2xl font-black font-mono text-amber-400">
                {stats.estimatedSizeKB < 1024
                  ? `${stats.estimatedSizeKB} KB`
                  : `${(stats.estimatedSizeKB / 1024).toFixed(1)} MB`}
              </div>
              <span className="text-[10px] text-stone-500">
                Device storage allocated
              </span>
            </div>
          </div>

          {/* Import / Export Action Buttons */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-stone-400 font-bold tracking-wider">
              Vault Backup &amp; Portability
            </h4>

            {/* Export JSON Full Backup */}
            <button
              onClick={handleExportJson}
              disabled={isExporting || stats.count === 0}
              className="w-full py-3 px-4 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-stone-100 border border-stone-800 hover:border-amber-500/50 rounded-2xl text-xs font-bold flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-100">Export Full Backup (.JSON)</div>
                  <div className="text-[11px] text-stone-400 font-normal">
                    Download complete snapshot with all photos, GPS &amp; notes
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Save File
              </span>
            </button>

            {/* Import / Restore JSON Backup */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="vault-file-input"
              />
              <label
                htmlFor="vault-file-input"
                className="w-full py-3 px-4 bg-stone-950 hover:bg-stone-800 text-stone-100 border border-stone-800 hover:border-emerald-500/50 rounded-2xl text-xs font-bold flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-stone-100">Restore from Backup (.JSON)</div>
                    <div className="text-[11px] text-stone-400 font-normal">
                      Load finds into this phone, tablet, or laptop
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {isImporting ? 'Importing...' : 'Select File'}
                </span>
              </label>
            </div>

            {/* Import Notice Banner */}
            {importNotice && (
              <div className="p-3 bg-stone-950 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{importNotice}</span>
              </div>
            )}
          </div>

          {/* Danger Zone: Clear Local Data */}
          <div className="pt-2 border-t border-stone-800">
            {confirmClear ? (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Are you sure you want to delete all {stats.count} local finds?</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  This cannot be undone unless you previously exported a JSON backup.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleClearVault}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                  >
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium cursor-pointer transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={stats.count === 0}
                className="w-full py-2.5 text-xs font-semibold text-stone-400 hover:text-rose-400 disabled:opacity-30 transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Local Finds</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
