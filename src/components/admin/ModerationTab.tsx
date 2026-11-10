import React, { useState, useEffect } from 'react';
import { ContentReport } from '../../types/community';
import {
  fetchContentReports,
  deleteContentReport,
  banUser,
} from '../../services/communityService';
import { db } from '../../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import {
  ShieldAlert,
  Trash2,
  UserX,
  CheckCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const ModerationTab: React.FC = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const list = await fetchContentReports();
      setReports(list);
    } catch (err) {
      console.error('Failed to load content reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDismiss = async (reportId: string) => {
    try {
      await deleteContentReport(reportId);
      setReports(reports.filter((r) => r.id !== reportId));
      setActionMessage('Report dismissed');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    }
  };

  const handleDeleteContent = async (report: ContentReport) => {
    if (!window.confirm(`Delete content at path "${report.targetPath}"?`)) return;
    try {
      await deleteDoc(doc(db, report.targetPath)).catch(() => {});
      await deleteContentReport(report.id);
      setReports(reports.filter((r) => r.id !== report.id));
      setActionMessage(`Content deleted at ${report.targetPath}`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete reported content:', err);
    }
  };

  const handleBanAuthor = async (report: ContentReport) => {
    // Try to find authorUid from the reported document
    let authorUid = '';
    try {
      const snap = await getDoc(doc(db, report.targetPath));
      if (snap.exists()) {
        authorUid = snap.data()?.authorUid || '';
      }
    } catch (err) {
      console.warn('Could not read reported doc for authorUid:', err);
    }

    const targetUid = prompt(
      `Enter or confirm UID to BAN permanently from community posting:`,
      authorUid
    );
    if (!targetUid || !targetUid.trim()) return;

    const reason = prompt('Reason for ban:', `Violation reported under: ${report.reason}`) || 'Violation of community safety rules';

    try {
      await banUser(targetUid.trim(), reason);
      // Also delete the reported content and report
      await deleteDoc(doc(db, report.targetPath)).catch(() => {});
      await deleteContentReport(report.id);
      setReports(reports.filter((r) => r.id !== report.id));
      setActionMessage(`User ${targetUid} successfully banned.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to ban user:', err);
      alert('Failed to ban user. Check permissions.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Community Moderation Queue</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Reports submitted by community members for review and action.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-mono text-neutral-300 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs font-mono text-neutral-500">
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 text-neutral-400 text-xs space-y-2">
          <CheckCircle className="w-8 h-8 text-lime-400 mx-auto" />
          <p className="font-semibold text-neutral-200">Moderation Queue Clear</p>
          <p className="text-neutral-500">No active reports from users.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {report.reason}
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  Target: {report.targetType}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-neutral-300 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-850 break-all">
                <div>Path: <span className="text-lime-400">{report.targetPath}</span></div>
                <div>Reporter UID: <span className="text-neutral-400">{report.reporterUid}</span></div>
                {report.excerpt && (
                  <div className="mt-2 pt-2 border-t border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Copied Message Excerpt:</div>
                    <pre className="text-neutral-200 whitespace-pre-wrap font-sans text-xs bg-black/40 p-2 rounded-lg border border-neutral-800 max-h-40 overflow-y-auto">
                      {report.excerpt}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => handleDeleteContent(report)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-300 hover:text-red-200 border border-neutral-700 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete content</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBanAuthor(report)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 font-semibold cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Ban user</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDismiss(report.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 ml-auto cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
