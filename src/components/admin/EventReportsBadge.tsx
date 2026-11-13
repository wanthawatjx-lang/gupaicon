import React, { useState, useEffect } from 'react';
import { fetchEventReports, deleteAllEventReports } from '../../services/reportService';
import { parseTimestampToDate } from '../../utils/dateUtils';
import { Trash2 } from 'lucide-react';

interface EventReportsBadgeProps {
  eventId: string;
}

export const EventReportsBadge: React.FC<EventReportsBadgeProps> = ({ eventId }) => {
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchEventReports(eventId)
      .then((reports) => {
        if (!active) return;
        const now = Date.now();
        const windowMs = 90 * 60 * 1000;
        const recentCount = reports.filter((r) => {
          const time = parseTimestampToDate(r.createdAt).getTime();
          return now - time <= windowMs;
        }).length;
        setReportsCount(recentCount);
      })
      .catch(() => {
        if (active) setReportsCount(0);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  const handleDeleteAllReports = async () => {
    setIsDeleting(true);
    try {
      await deleteAllEventReports(eventId);
      setReportsCount(0);
      setConfirming(false);
    } catch {
      // Keep UI clean without exposing internals
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-neutral-800/60">
      <span className="text-[11px] font-mono text-neutral-400">
        💬 {reportsCount} report{reportsCount === 1 ? '' : 's'} in last 90m
      </span>
      {reportsCount > 0 && !confirming && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 text-[10px] font-mono cursor-pointer transition-colors"
          title="Delete all reports for spam cleanup"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete all reports</span>
        </button>
      )}
      {confirming && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteAllReports}
            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono font-bold cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Confirm delete'}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirming(false)}
            className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
