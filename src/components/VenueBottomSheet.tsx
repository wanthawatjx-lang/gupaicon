import React, { useEffect, useRef } from 'react';
import { Venue } from '../types/venue';
import { MapPin, Instagram, ExternalLink, X, Edit3, Compass } from 'lucide-react';

interface VenueBottomSheetProps {
  venue: Venue | null;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (venue: Venue) => void;
}

export const VenueBottomSheet: React.FC<VenueBottomSheetProps> = ({
  venue,
  onClose,
  isAdmin = false,
  onEdit,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!venue) return null;

  const isSample = venue.name.toUpperCase().startsWith('SAMPLE');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-1000 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-labelledby="sheet-venue-title"
        className="fixed bottom-0 left-0 right-0 z-1001 max-w-lg mx-auto bg-neutral-950 border-t border-x border-neutral-800 rounded-t-2xl shadow-2xl overflow-hidden pb-8 pt-3 px-5 animate-in slide-in-from-bottom duration-200"
      >
        {/* Pull handle bar */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
        </div>

        {/* Top bar with tags and close */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-lime-400 text-black font-mono text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              Livehouse
            </span>
            {isSample && (
              <span className="px-2 py-0.5 rounded-sm bg-neutral-800 text-amber-300 border border-amber-400/30 font-mono text-[10px] uppercase font-medium">
                Sample Data
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(venue)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Edit Venue"
                aria-label="Edit Venue"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close bottom sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Venue Title */}
        <h2
          id="sheet-venue-title"
          className="text-2xl font-bold tracking-tight text-white mb-2 leading-tight"
        >
          {venue.name}
        </h2>

        {/* Address */}
        <div className="flex items-start gap-2 text-neutral-300 text-sm mb-5 leading-snug">
          <MapPin className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
          <span>{venue.address}</span>
        </div>

        {/* Coordinates Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 mb-6 bg-neutral-900/90 border border-neutral-800/80 px-3 py-1.5 rounded-md w-fit">
          <Compass className="w-3.5 h-3.5 text-neutral-500" />
          <span>
            {venue.lat.toFixed(4)}° N, {venue.lng.toFixed(4)}° E
          </span>
        </div>

        {/* Action Buttons (Large Touch Targets for mobile 390px) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Maps Link */}
          <a
            href={venue.mapsUrl || `https://maps.google.com/?q=${venue.lat},${venue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Maps</span>
          </a>

          {/* Instagram Link */}
          <a
            href={venue.igUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram</span>
          </a>
        </div>
      </div>
    </>
  );
};
