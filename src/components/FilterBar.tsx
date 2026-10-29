import React from 'react';
import { DateFilter } from '../types/event';
import { Ticket } from 'lucide-react';

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  availableOnly: boolean;
  onAvailableOnlyToggle: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dateFilter,
  onDateFilterChange,
  availableOnly,
  onAvailableOnlyToggle,
}) => {
  const filterOptions: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
  ];

  return (
    <div className="absolute top-16 left-3 right-16 sm:right-auto sm:max-w-md z-450 pointer-events-auto">
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md shadow-xl">
        {/* Date Filters Segmented Buttons */}
        <div className="flex items-center bg-neutral-900/90 p-0.5 rounded-xl border border-neutral-800/80">
          {filterOptions.map((opt) => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDateFilterChange(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
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

        {/* Tickets Available Only Toggle */}
        <button
          type="button"
          onClick={onAvailableOnlyToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
            availableOnly
              ? 'bg-emerald-950 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
          title="Filter only events with Available or Low tickets"
        >
          <Ticket className={`w-3.5 h-3.5 ${availableOnly ? 'text-emerald-400' : 'text-neutral-500'}`} />
          <span className="whitespace-nowrap">Tickets only</span>
        </button>
      </div>
    </div>
  );
};
