import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { EventDraft } from '../../types/draft';
import { Venue } from '../../types/venue';
import { subscribeToEventDrafts, updateEventDraft, approveEventDraft, rejectEventDraft, deleteEventDraft } from '../../services/draftService';
import { Language, translations } from '../../i18n';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Edit,
  Trash2,
  CheckCheck,
  RefreshCw,
  MapPin,
  Calendar,
  Tag,
  Music2,
  X,
} from 'lucide-react';

interface AiReviewAdminProps {
  user: User | null;
  venues: Venue[];
  lang: Language;
}

export const AiReviewAdmin: React.FC<AiReviewAdminProps> = ({ user, venues, lang }) => {
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ discoveredCount: number; savedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit draft modal state
  const [editingDraft, setEditingDraft] = useState<EventDraft | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<EventDraft>>({});

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEventDrafts(
      (data) => {
        setDrafts(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  const handleRunDiscovery = async () => {
    if (!user) {
      setError('You must be signed in as admin to run discovery.');
      return;
    }
    setIsDiscovering(true);
    setError(null);
    setSuccess(null);
    setDiscoverResult(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Discovery failed on server.');
      }

      setDiscoverResult({
        discoveredCount: data.discoveredCount || 0,
        savedCount: data.savedCount || 0,
      });
      setSuccess(`Discovery completed! Discovered ${data.discoveredCount} items, saved ${data.savedCount} new pending drafts.`);
    } catch (err: any) {
      console.error('Discovery run error:', err);
      setError(err?.message || 'Failed to execute discovery.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleApprove = async (draft: EventDraft) => {
    if (!draft.matchedVenueId) {
      alert('Please select a matched venue before approving this event draft.');
      return;
    }
    setError(null);
    try {
      await approveEventDraft(draft);
      setSuccess(`Approved event "${draft.title}" and published to live events.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve draft.');
    }
  };

  const handleReject = async (draftId: string) => {
    if (!confirm('Are you sure you want to reject and discard this draft?')) return;
    setError(null);
    try {
      await rejectEventDraft(draftId);
      setSuccess('Draft rejected and discarded.');
    } catch (err: any) {
      setError(err?.message || 'Failed to reject draft.');
    }
  };

  const handleApproveAllValid = async () => {
    const validDrafts = drafts.filter((d) => d.confidence >= 0.8 && (!d.warnings || d.warnings.length === 0) && d.matchedVenueId);
    if (validDrafts.length === 0) {
      alert('No valid drafts found matching criteria (confidence >= 0.8, no warnings, matched venue).');
      return;
    }

    if (!confirm(`Are you sure you want to approve all ${validDrafts.length} valid event drafts?`)) return;

    setError(null);
    let approvedCount = 0;
    try {
      for (const d of validDrafts) {
        await approveEventDraft(d);
        approvedCount++;
      }
      setSuccess(`Successfully approved ${approvedCount} valid event drafts!`);
    } catch (err: any) {
      setError(err?.message || `Approved ${approvedCount} drafts before error occurred.`);
    }
  };

  const handleOpenEdit = (draft: EventDraft) => {
    setEditingDraft(draft);
    setEditFormData({
      title: draft.title,
      artists: draft.artists,
      venueName: draft.venueName,
      startAt: draft.startAt,
      priceText: draft.priceText || '',
      genres: draft.genres,
      ticketUrl: draft.ticketUrl || '',
      matchedVenueId: draft.matchedVenueId || '',
      notes: draft.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;
    setError(null);
    try {
      await updateEventDraft(editingDraft.id, editFormData);
      setSuccess('Draft updated successfully.');
      setEditingDraft(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update draft.');
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lime-400" />
            AI Event Discovery & Review
          </h2>
          <p className="text-sm text-neutral-400">Discover upcoming concerts via AI search grounding and review drafts before publishing.</p>
        </div>

        <div className="flex items-center gap-3">
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={handleApproveAllValid}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-lime-400 font-bold text-sm rounded-xl border border-lime-500/30 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              Approve All Valid (Confidence ≥ 0.8)
            </button>
          )}
          <button
            type="button"
            onClick={handleRunDiscovery}
            disabled={isDiscovering}
            className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-lime-400/20 disabled:opacity-50"
          >
            {isDiscovering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isDiscovering ? 'Searching & Discovering...' : 'Find Events Now'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-950/50 border border-red-500/30 text-red-300 text-sm rounded-xl">{error}</div>}
      {success && <div className="p-3 bg-lime-950/50 border border-lime-500/30 text-lime-300 text-sm rounded-xl">{success}</div>}

      {discoverResult && (
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center gap-4 font-mono text-sm text-neutral-200">
          <span className="px-2.5 py-1 rounded-lg bg-lime-950 text-lime-400 border border-lime-500/30 font-bold">
            {discoverResult.discoveredCount} found
          </span>
          <span>•</span>
          <span className="text-white font-bold">{discoverResult.savedCount} new pending drafts saved</span>
        </div>
      )}

      {/* Drafts List */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-neutral-400">
          Pending Drafts ({drafts.length})
        </h3>

        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-sm">Loading event drafts...</div>
        ) : drafts.length === 0 ? (
          <div className="p-16 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-500 text-sm">
            No pending AI drafts. Click "Find Events Now" to run discovery using active sources.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {drafts.map((draft) => {
              const matchedVenue = venues.find((v) => v.id === draft.matchedVenueId);
              const confPercent = Math.round(draft.confidence * 100);
              const confColor =
                draft.confidence >= 0.8
                  ? 'bg-lime-950 text-lime-400 border-lime-500/30'
                  : draft.confidence >= 0.6
                  ? 'bg-yellow-950 text-yellow-400 border-yellow-500/30'
                  : 'bg-red-950 text-red-400 border-red-500/30';

              return (
                <div key={draft.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md border font-mono text-xs font-bold ${confColor}`}>
                          Confidence: {confPercent}%
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono text-xs">
                          Source: {draft.sourceName}
                        </span>
                        {draft.sourceUrl && (
                          <a
                            href={draft.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-lime-400 hover:underline font-mono inline-flex items-center gap-1"
                          >
                            {getDomain(draft.sourceUrl)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-white">{draft.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(draft)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(draft.id)}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(draft)}
                        disabled={!draft.matchedVenueId}
                        className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-lime-400/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>

                  {/* Warnings */}
                  {draft.warnings && draft.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {draft.warnings.map((w, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2 border-t border-neutral-800">
                    <div>
                      <span className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-0.5">Artists</span>
                      <span className="text-neutral-200 font-medium">{draft.artists?.join(', ') || 'None specified'}</span>
                    </div>

                    <div>
                      <span className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-0.5">Date & Time</span>
                      <span className="text-neutral-200 font-mono text-xs">{draft.startAt}</span>
                    </div>

                    <div>
                      <span className="block text-xs font-mono uppercase tracking-wider text-neutral-500 mb-0.5">Price & Ticket</span>
                      <span className="text-neutral-200 font-medium">{draft.priceText || 'Free / Unspecified'}</span>
                    </div>
                  </div>

                  {/* Venue Assignment */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-lime-400 shrink-0" />
                      <div>
                        <span className="text-xs text-neutral-400 block font-mono">AI Extracted Venue: <strong className="text-white">{draft.venueName}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={draft.matchedVenueId || ''}
                        onChange={async (e) => {
                          const newVenueId = e.target.value || null;
                          await updateEventDraft(draft.id, { matchedVenueId: newVenueId });
                        }}
                        className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-lime-400 font-medium w-full sm:w-64"
                      >
                        <option value="">-- Select matched venue --</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {draft.notes && (
                    <p className="text-xs text-neutral-400 font-mono bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-850">
                      <strong>AI Notes:</strong> {draft.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Draft Modal */}
      {editingDraft && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-1100 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Edit Event Draft</h3>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Artists (comma separated)</label>
                <input
                  type="text"
                  value={editFormData.artists?.join(', ') || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, artists: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Start Date & Time (ISO)</label>
                <input
                  type="text"
                  value={editFormData.startAt || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, startAt: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-lime-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Price Text</label>
                <input
                  type="text"
                  value={editFormData.priceText || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, priceText: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Ticket URL</label>
                <input
                  type="url"
                  value={editFormData.ticketUrl || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, ticketUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">Matched Venue</label>
                <select
                  value={editFormData.matchedVenueId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, matchedVenueId: e.target.value || null })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-lime-400"
                >
                  <option value="">-- Select venue --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 text-sm rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-lime-400 text-neutral-950 font-bold text-sm rounded-xl cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
