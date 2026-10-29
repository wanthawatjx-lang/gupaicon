import React, { useState } from 'react';
import { Venue } from '../types/venue';
import { MapPin, X, Search, ChevronRight } from 'lucide-react';

interface VenueListDrawerProps {
  venues: Venue[];
  onSelectVenue: (venue: Venue) => void;
  onClose: () => void;
}

export const VenueListDrawer: React.FC<VenueListDrawerProps> = ({
  venues,
  onSelectVenue,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filtered = venues.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.address.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-1000"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-full max-w-sm bg-neutral-950 border-r border-neutral-800 z-1001 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              Venues ({venues.length})
            </h3>
            <p className="text-xs text-neutral-400">Bangkok & Pathum Thani livehouses</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or district..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No matching venues found.
            </div>
          ) : (
            filtered.map((venue) => {
              const isSample = venue.name.toUpperCase().startsWith('SAMPLE');
              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => {
                    onSelectVenue(venue);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/60 hover:border-lime-400/50 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold text-white group-hover:text-lime-300 transition-colors truncate">
                        {venue.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-400 truncate">
                      <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span className="truncate">{venue.address}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-lime-400 shrink-0 transition-colors" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
