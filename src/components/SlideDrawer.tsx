import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export const SlideDrawer: React.FC<SlideDrawerProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  subtitle,
  badge,
  children
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] overflow-hidden pointer-events-auto">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer sheet: Bottom-sheet on mobile (<sm), Right-sidebar on sm+ */}
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] md:w-[520px] max-h-[90vh] sm:max-h-full bg-stone-950/98 sm:bg-stone-950/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-stone-800 shadow-2xl flex flex-col rounded-t-[28px] sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag / Touch Handle Indicator */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-stone-700/80 active:bg-stone-500 cursor-grab" />
        </div>

        {/* Sticky Header */}
        <div className="px-5 py-3.5 border-b border-stone-800/90 flex items-center justify-between shrink-0 bg-stone-950/80 backdrop-blur">
          <div className="flex items-center space-x-2.5 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-stone-100 truncate">{title}</h2>
                {badge}
              </div>
              {subtitle && (
                <p className="text-[11px] text-stone-400 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-750 text-stone-400 hover:text-stone-100 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ml-2"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
