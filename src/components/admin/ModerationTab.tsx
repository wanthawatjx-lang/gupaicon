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
} from 'lucide-react';

interface ReportedTargetContent {
  exists: boolean;
  authorUid?: string;
  authorName?: string;
  body?: string;
  meetUpNote?: string;
}

export const ModerationTab: React.FC = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [targetContents, setTargetContents] = useState<Record<string, ReportedTargetContent>>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inline confirmation / form states (avoiding window.confirm / window.prompt)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [banFormReportId, setBanFormReportId] = useState<string | null>(null);
  const [banUidInput, setBanUidInput] = useState<string>('');
  const [banReasonInput, setBanReasonInput] = useState<string>('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await fetchContentReports();
      setReports(list);

      // Fetch reported post/comment content so admin sees what was reported
      const contentMap: Record<string, ReportedTargetContent> = {};
      await Promise.all(
        list.map(async (report) => {
          if (report.targetType === 'chat' || !report.targetPath) return;
          try {
            const snap = await getDoc(doc(db, report.targetPath));
            if (snap.exists()) {
              const data = snap.data();
              contentMap[report.id] = {
                exists: true,
                authorUid: data.authorUid,
                authorName: data.authorName,
                body: data.body,
                meetUpNote: data.meetUpNote,
              };
            } else {
              contentMap[report.id] = { exists: false };
            }
          } catch {
            contentMap[report.id] = { exists: false };
          }
        })
      );
      setTargetContents(contentMap);
    } catch (err) {
      console.error('Failed to load content reports:', err);
      setErrorMessage('Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDismiss = async (reportId: string) => {
    setSubmittingId(reportId);
    setErrorMessage(null);
    try {
      await deleteContentReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setActionMessage('Report dismissed');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to dismiss report:', err);
      setErrorMessage('Failed to dismiss report.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteContent = async (report: ContentReport) => {
    setSubmittingId(report.id);
    setErrorMessage(null);
    try {
      await deleteDoc(doc(db, report.targetPath)).catch(() => {});
      await deleteContentReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setConfirmDeleteId(null);
      setActionMessage(`Content deleted at ${report.targetPath}`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete reported content:', err);
      setErrorMessage('Failed to delete reported content.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleOpenBanForm = (report: ContentReport) => {
    const prefilledUid = targetContents[report.id]?.authorUid || '';
    setBanFormReportId(report.id);
    setBanUidInput(prefilledUid);
    setBanReasonInput(`Violation reported under: ${report.reason}`);
    setConfirmDeleteId(null);
  };

  const handleConfirmBan = async (report: ContentReport) => {
    const cleanUid = banUidInput.trim();
    if (!cleanUid) {
      setErrorMessage('Please enter the UID to ban.');
      return;
    }
    const reason = banReasonInput.trim() || 'Violation of community safety rules';

    setSubmittingId(report.id);
    setErrorMessage(null);
    try {
      await banUser(cleanUid, reason);
      if (report.targetType !== 'chat') {
        await deleteDoc(doc(db, report.targetPath)).catch(() => {});
      }
      await deleteContentReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setBanFormReportId(null);
      setActionMessage(`User ${cleanUid} successfully banned.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to ban user:', err);
      setErrorMessage('Failed to ban user. Check permissions.');
    } finally {
      setSubmittingId(null);
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

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
          {errorMessage}
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
          {reports.map((report) => {
            const target = targetContents[report.id];
            const isBusy = submittingId === report.id;
            return (
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

                <div className="space-y-1.5 font-mono text-[11px] text-neutral-300 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-850 break-all">
                  <div>Path: <span className="text-lime-400">{report.targetPath}</span></div>
                  <div>Reporter UID: <span className="text-neutral-400">{report.reporterUid}</span></div>

                  {/* Reported Post or Comment Body */}
                  {report.targetType !== 'chat' && target && (
                    <div className="mt-2 pt-2 border-t border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                        Reported Content:
                      </div>
                      {target.exists ? (
                        <div className="font-sans space-y-1 bg-black/40 p-2.5 rounded-lg border border-neutral-800">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400 font-mono">
                            <span className="font-bold text-white">{target.authorName || 'Unknown'}</span>
                            <span>UID: {target.authorUid}</span>
                          </div>
                          <p className="text-xs text-neutral-200 whitespace-pre-wrap break-words">
                            {target.body || '(empty)'}
                          </p>
                          {target.meetUpNote && (
                            <p className="text-[11px] text-neutral-400">
                              Meet-up note: {target.meetUpNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 italic font-sans">
                          Content already deleted or unavailable.
                        </p>
                      )}
                    </div>
                  )}

                  {report.excerpt && (
                    <div className="mt-2 pt-2 border-t border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                        Copied Message Excerpt:
                      </div>
                      <pre className="text-neutral-200 whitespace-pre-wrap font-sans text-xs bg-black/40 p-2 rounded-lg border border-neutral-800 max-h-40 overflow-y-auto">
                        {report.excerpt}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Inline Confirm Delete */}
                {confirmDeleteId === report.id && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/70 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-red-200">
                      Permanently delete this reported content and close report?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContent(report)}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Ban Form */}
                {banFormReportId === report.id && (
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/70 space-y-2">
                    <div className="text-xs font-bold text-red-300">
                      Ban User Permanently
                    </div>
                    <input
                      type="text"
                      value={banUidInput}
                      onChange={(e) => setBanUidInput(e.target.value)}
                      placeholder="Target User UID"
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-white"
                    />
                    <input
                      type="text"
                      value={banReasonInput}
                      onChange={(e) => setBanReasonInput(e.target.value)}
                      placeholder="Ban reason"
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setBanFormReportId(null)}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmBan(report)}
                        disabled={isBusy || !banUidInput.trim()}
                        className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        Confirm Ban & Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-850">
                  {report.targetType !== 'chat' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(report.id);
                        setBanFormReportId(null);
                      }}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-red-300 hover:text-red-200 border border-neutral-700 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete content</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenBanForm(report)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Ban user</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismiss(report.id)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 ml-auto cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
