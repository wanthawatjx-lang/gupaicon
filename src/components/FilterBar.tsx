import React, { useState } from 'react';
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
  const t = translations[lang];

  const filterOptions: { id: DateFilter; label: string }[] = [
    { id: 'all', label: t.filters.all },
    { id: 'today', label: t.filters.today },
    { id: 'week', label: t.filters.thisWeek },
    { id: 'month', label: t.filters.thisMonth },
  ];

  const isFiltered =
    dateFilter !== 'all' ||
    availableOnly ||
    searchQuery.trim().length > 0 ||
    selectedGenre !== 'all';

  return (
    <div className="absolute top-16 left-3 right-16 sm:right-auto sm:max-w-2xl z-450 pointer-events-auto flex flex-col gap-1.5">
      {/* Primary Bar: Search Input + Quick Date Pills + Filter Toggle */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/95 border border-neutral-800/90 backdrop-blur-md shadow-xl overflow-x-auto no-scrollbar">
        {/* Search input with clean clear icon */}
        <div className="relative flex items-center min-w-[140px] sm:min-w-[180px] bg-neutral-900/90 rounded-xl px-2.5 py-1.5 border border-neutral-800/80 focus-within:border-lime-400/80 transition-colors">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาศิลปิน / ร้าน...' : 'Search artist / venue...'}
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="text-neutral-400 hover:text-white p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
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
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-neutral-100 text-black shadow-xs font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Tickets Available Only Toggle Chip */}
        <button
          type="button"
          onClick={onAvailableOnlyToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
            availableOnly
              ? 'bg-emerald-950 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-semibold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title={t.filters.ticketsOnly}
          aria-label={t.filters.ticketsOnly}
        >
          <Ticket
            className={`w-3.5 h-3.5 shrink-0 ${
              availableOnly ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          />
          <span className="whitespace-nowrap hidden sm:inline">{t.filters.ticketsOnly}</span>
        </button>

        {/* Expand Genre Filter Chips Toggle */}
        <button
          type="button"
          onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
            selectedGenre !== 'all' || showFiltersDrawer
              ? 'bg-lime-950/80 border-lime-500/80 text-lime-300 font-semibold'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
          title={lang === 'th' ? 'เลือกแนวเพลง' : 'Genre Filters'}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
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
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 hover:bg-red-900 text-xs font-semibold cursor-pointer shrink-0 active:scale-95"
            title={t.filters.clearFilters}
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">{t.filters.clearFilters}</span>
          </button>
        )}
      </div>

      {/* Genre Filter Sub-row */}
      {showFiltersDrawer && availableGenres.length > 0 && (
        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-neutral-950/90 border border-neutral-800/80 backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-1">
          <span className="text-[10px] text-neutral-400 uppercase font-mono px-2 shrink-0">
            {lang === 'th' ? 'แนวเพลง:' : 'Genre:'}
          </span>
          <button
            type="button"
            onClick={() => onGenreChange('all')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              selectedGenre === 'all'
                ? 'bg-lime-400 text-black font-bold'
                : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {lang === 'th' ? 'ทั้งหมด' : 'All'}
          </button>
          {availableGenres.map((g) => {
            const isSelected = selectedGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                type="button"
                onClick={() => onGenreChange(isSelected ? 'all' : g)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
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
