import React, { useState, useEffect } from 'react';
import { DateFilter } from '../types/event';
import { Ticket, Search, X, SlidersHorizontal } from 'lucide-react';
import { Language, translations } from '../i18n';

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  availableOnly: boolean;
  onAvailableOnlyToggle: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  availableGenres: string[];
  onClearFilters: () => void;
  lang: Language;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dateFilter,
  onDateFilterChange,
  availableOnly,
  onAvailableOnlyToggle,
  searchQuery,
  onSearchQueryChange,
  selectedGenre,
  onGenreChange,
  availableGenres = [],
  onClearFilters,
  lang,
}) => {
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const t = translations[lang];

  // Sync external clear-filter updates into local input
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce search filter updates (250ms) for smooth mobile typing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchQueryChange(localSearch);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchQueryChange]);

  const filterOptions: { id: DateFilter; label: string }[] = [
    { id: 'all', label: t.filters.all },
    { id: 'today', label: t.filters.today },
    { id: 'week', label: t.filters.thisWeek },
    { id: 'month', label: t.filters.thisMonth },
  ];

  const isFiltered =
    dateFilter !== 'all' ||
    availableOnly ||
    localSearch.trim().length > 0 ||
    selectedGenre !== 'all';

  return (
    <div className="absolute top-[68px] sm:top-20 left-2.5 right-14 sm:left-4 sm:right-auto sm:max-w-2xl z-450 pointer-events-auto flex flex-col gap-1.5">
      {/* Primary Bar: Search Input + Quick Date Chips + Filter Toggle */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/95 border border-neutral-800/90 backdrop-blur-md shadow-xl overflow-x-auto no-scrollbar">
        {/* Search input with clean clear icon */}
        <div className="relative flex items-center min-w-[135px] sm:min-w-[180px] min-h-[44px] bg-neutral-900/90 rounded-xl px-2.5 border border-neutral-800/80 focus-within:border-lime-400/80 transition-colors">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t.app.searchPlaceholder}
            aria-label={t.app.searchPlaceholder}
            className="w-full bg-transparent text-xs text-white placeholder-neutral-400 focus:outline-none"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchQueryChange('');
              }}
              className="text-neutral-400 hover:text-white p-1.5 cursor-pointer"
              aria-label={t.filters.clearFilters}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filters Segmented Chips */}
        <div className="flex items-center bg-neutral-900/90 p-0.5 rounded-xl border border-neutral-800/80 shrink-0">
          {filterOptions.map((opt) => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDateFilterChange(opt.id)}
                className={`min-h-[40px] px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-neutral-100 text-black shadow-xs font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Tickets Available Only Toggle */}
        <button
          type="button"
          onClick={onAvailableOnlyToggle}
          className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
            availableOnly
              ? 'bg-emerald-950 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-semibold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800/80'
          }`}
          title={t.filters.ticketsOnly}
          aria-label={t.filters.ticketsOnly}
          aria-pressed={availableOnly}
        >
          <Ticket
            className={`w-4 h-4 shrink-0 ${
              availableOnly ? 'text-emerald-400' : 'text-neutral-400'
            }`}
          />
          <span className="whitespace-nowrap hidden sm:inline">{t.filters.ticketsOnly}</span>
        </button>

        {/* Expand Genre Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
          className={`flex items-center justify-center gap-1 min-h-[44px] px-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
            selectedGenre !== 'all' || showFiltersDrawer
              ? 'bg-lime-950/80 border-lime-500/80 text-lime-300 font-semibold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800/80'
          }`}
          title={lang === 'th' ? 'เลือกแนวเพลง' : 'Genre Filters'}
          aria-label={lang === 'th' ? 'เลือกแนวเพลง' : 'Genre Filters'}
          aria-expanded={showFiltersDrawer}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">
            {selectedGenre === 'all'
              ? (lang === 'th' ? 'แนวเพลง' : 'Genre')
              : selectedGenre}
          </span>
        </button>

        {/* Reset Filter Button if active */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              onClearFilters();
            }}
            className="flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 hover:bg-red-900 text-xs font-semibold cursor-pointer shrink-0 active:scale-95"
            title={t.filters.clearFilters}
            aria-label={t.filters.clearFilters}
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.filters.clearFilters}</span>
          </button>
        )}
      </div>

      {/* Genre Filter Sub-row */}
      {showFiltersDrawer && availableGenres.length > 0 && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-neutral-950/95 border border-neutral-800/80 backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-1">
          <span className="text-[11px] text-neutral-400 uppercase font-mono px-2 shrink-0">
            {lang === 'th' ? 'แนวเพลง:' : 'Genre:'}
          </span>
          <button
            type="button"
            onClick={() => onGenreChange('all')}
            className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              selectedGenre === 'all'
                ? 'bg-lime-400 text-black font-bold'
                : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {t.filters.all}
          </button>
          {availableGenres.map((g) => {
            const isSelected = selectedGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                type="button"
                onClick={() => onGenreChange(isSelected ? 'all' : g)}
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-lime-400 text-black font-bold shadow-xs'
                    : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
