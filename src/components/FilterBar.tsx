import React from 'react';
import { DateFilter } from '../types/event';
import { Ticket } from 'lucide-react';
import { Language, translations } from '../i18n';

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  availableOnly: boolean;
  onAvailableOnlyToggle: () => void;
  lang: Language;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dateFilter,
  onDateFilterChange,
  availableOnly,
  onAvailableOnlyToggle,
  lang,
}) => {
  const t = translations[lang];

  const filterOptions: { id: DateFilter; label: string }[] = [
    { id: 'all', label: t.filters.all },
    { id: 'today', label: t.filters.today },
    { id: 'week', label: t.filters.thisWeek },
    { id: 'month', label: t.filters.thisMonth },
  ];

  return (
    <div className="absolute top-16 left-3 right-16 sm:right-auto sm:max-w-lg z-450 pointer-events-auto">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/95 border border-neutral-800/90 backdrop-blur-md shadow-xl overflow-x-auto no-scrollbar">
        {/* Date Filters Segmented Chips */}
        <div className="flex items-center bg-neutral-900/90 p-0.5 rounded-xl border border-neutral-800/80 shrink-0">
          {filterOptions.map((opt) => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDateFilterChange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 active:scale-95 ${
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
          <span className="whitespace-nowrap">{t.filters.ticketsOnly}</span>
        </button>
      </div>
    </div>
  );
};
