import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ConcertEvent, CrowdReport } from '../../types/event';
import { deleteAllEventReports } from '../../services/reportService';
import { Trash2 } from 'lucide-react';

interface EventReportsBadgeProps {
  eventId: string;
}

export const EventReportsBadge: React.FC<EventReportsBadgeProps> = ({ eventId }) => {
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const colRef = collection(db, `events/${eventId}/reports`);
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const windowMs = 90 * 60 * 1000;
      const recentCount = snapshot.docs.filter((doc) => {
        const data = doc.data();
        const time = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
        return now - time <= windowMs;
      }).length;
      setReportsCount(recentCount);
    }, () => setReportsCount(0));

    return () => unsubscribe();
  }, [eventId]);

  const handleDeleteAllReports = async () => {
    if (!window.confirm('Delete all crowd reports for this event?')) return;
    setIsDeleting(true);
    try {
      await deleteAllEventReports(eventId);
      setReportsCount(0);
    } catch (err) {
      console.error('Failed to delete reports:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/60">
      <span className="text-[11px] font-mono text-neutral-400">
        💬 {reportsCount} report{reportsCount === 1 ? '' : 's'} in last 90m
      </span>
      {reportsCount > 0 && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleDeleteAllReports}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 text-[10px] font-mono cursor-pointer transition-colors"
          title="Delete all reports for spam cleanup"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete all reports</span>
        </button>
      )}
    </div>
  );
};
