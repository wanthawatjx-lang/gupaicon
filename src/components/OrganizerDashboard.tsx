import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { ConcertEvent, EventFormData, EventStatus } from '../types/event';
import { Venue } from '../types/venue';
import { Promoter } from '../types/promoter';
import { OrganizerRecord } from '../types/organizer';
import {
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
} from '../services/eventService';
import { STATUS_MAP } from '../utils/statusUtils';
import {
  formatBangkokDateTime,
  formatRelativeTime,
  parseTimestampToDate,
  formatDateForInput,
} from '../utils/dateUtils';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Ticket,
  Trash2,
  X,
  AlertCircle,
  Instagram,
  CheckCircle2,
} from 'lucide-react';

interface OrganizerDashboardProps {
  user: User | null;
  organizerRecord: OrganizerRecord | null;
  promoters: Promoter[];
  venues: Venue[];
  events: ConcertEvent[];
  onBack: () => void;
  onOpenOrganizerRequest: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  user,
  organizerRecord,
  promoters,
  venues,
  events,
  onBack,
  onOpenOrganizerRequest,
}) => {
  const [editingEvent, setEditingEvent] = useState<ConcertEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [artistsInput, setArtistsInput] = useState('');
  const [venueId, setVenueId] = useState('');
  const [startAtIso, setStartAtIso] = useState('');
  const [priceText, setPriceText] = useState('');
  const [genresInput, setGenresInput] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [igPostUrl, setIgPostUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [status, setStatus] = useState<EventStatus>('available');

  // Promoter associated with this organizer
  const assignedPromoter = useMemo(() => {
    if (!organizerRecord) return null;
    return promoters.find((p) => p.id === organizerRecord.promoterId) || null;
  }, [organizerRecord, promoters]);

  // Venues map
  const venueMap = useMemo(() => {
    const map = new Map<string, string>();
    venues.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [venues]);

  // List ONLY events for their own promoterId (Requirement 3)
  const myEvents = useMemo(() => {
    if (!organizerRecord) return [];
    return events
      .filter((e) => e.promoterId === organizerRecord.promoterId)
      .sort((a, b) => {
        return (
          parseTimestampToDate(b.startAt).getTime() -
          parseTimestampToDate(a.startAt).getTime()
        );
      });
  }, [events, organizerRecord]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleStartCreate = () => {
    setTitle('');
    setArtistsInput('');
    setVenueId(venues[0]?.id || '');
    setStartAtIso(formatDateForInput(new Date(Date.now() + 86400000 * 3)));
    setPriceText('350 THB');
    setGenresInput('Indie Pop, Shoegaze');
    setTicketUrl('https://ticketmelon.com');
    setIgPostUrl('https://instagram.com');
    setPosterUrl('');
    setStatus('available');
    setActionError(null);
    setIsCreatingEvent(true);
  };

  const handleStartEdit = (event: ConcertEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setArtistsInput(event.artists.join(', '));
    setVenueId(event.venueId);
    setStartAtIso(formatDateForInput(parseTimestampToDate(event.startAt)));
    setPriceText(event.priceText);
    setGenresInput(event.genres.join(', '));
    setTicketUrl(event.ticketUrl);
    setIgPostUrl(event.igPostUrl);
    setPosterUrl(event.posterUrl || '');
    setStatus(event.status);
    setActionError(null);
  };

  const handleCloseForm = () => {
    setEditingEvent(null);
    setIsCreatingEvent(false);
    setActionError(null);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerRecord) return;

    if (!title.trim() || !venueId) {
      setActionError('Title and Venue are required.');
      return;
    }

    setIsSaving(true);
    setActionError(null);

    const formData: EventFormData = {
      title: title.trim(),
      artists: artistsInput.split(',').map((s) => s.trim()).filter(Boolean),
      venueId: venueId.trim(),
      promoterId: organizerRecord.promoterId, // Locked to organizer's assigned promoter
      startAtIso,
      priceText: priceText.trim(),
      genres: genresInput.split(',').map((s) => s.trim()).filter(Boolean),
      ticketUrl: ticketUrl.trim(),
      igPostUrl: igPostUrl.trim(),
      posterUrl: posterUrl.trim() || undefined,
      status,
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, formData, 'organizer');
        showToast('Event updated successfully');
      } else {
        await createEvent(formData, undefined, 'organizer');
        showToast('New event published');
      }
      handleCloseForm();
    } catch (err: any) {
      console.error('Save event error:', err);
      setActionError('Failed to save event. Please check required permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  // One-tap status updates (Requirement 3: sets status, statusUpdatedAt = server time, statusSource = "organizer")
  const handleOneTapStatus = async (eventId: string, newStatus: EventStatus) => {
    try {
      await updateEventStatus(eventId, newStatus, 'organizer');
      showToast(`Status changed to ${STATUS_MAP[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      console.error('One-tap status update error:', err);
      setActionError('Could not update status.');
    }
  };

  const handleDelete = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) return;
    try {
      await deleteEvent(eventId);
      showToast('Event deleted');
    } catch (err: any) {
      console.error('Delete event error:', err);
      setActionError('Failed to delete event.');
    }
  };

  // Access check
  if (!user || !organizerRecord) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-5">
          <BadgeCheck className="w-12 h-12 text-lime-400 mx-auto opacity-70" />
          <div>
            <h2 className="text-xl font-bold text-white font-display">Organizer Portal</h2>
            <p className="text-xs text-neutral-400 mt-2 font-mono leading-relaxed">
              This dashboard is reserved for verified promoters and collective organizers.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onOpenOrganizerRequest}
              className="w-full py-3 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 transition-colors cursor-pointer shadow-md"
            >
              Apply for Organizer Verification
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold text-xs hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              ← Return to Live Concert Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Map</span>
          </button>
          <div className="h-4 w-px bg-neutral-800" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-sky-400" />
            Organizer Console
          </span>
        </div>

        {assignedPromoter && (
          <a
            href={`#/promoter/${assignedPromoter.id}`}
            className="text-xs font-mono text-neutral-400 hover:text-lime-300 inline-flex items-center gap-1"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto w-full px-4 pt-6 space-y-6">
        {/* Toast */}
        {successToast && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Action Error */}
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Organizer Header Card */}
        <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-sm bg-sky-950 text-sky-400 border border-sky-800/50 font-mono text-[10px] font-bold uppercase">
                Verified Organizer
              </span>
              <span className="text-xs font-mono text-neutral-500">{user.email}</span>
            </div>
            <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
              {assignedPromoter?.name || 'Assigned Collective'}
              <BadgeCheck className="w-5 h-5 text-sky-400 shrink-0" />
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Status changes you make are stamped with <strong>Verified by organizer</strong> badge.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartCreate}
            className="py-3 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-lime-950/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Concert</span>
          </button>
        </div>

        {/* Modal Form for Create / Edit */}
        {(isCreatingEvent || editingEvent) && (
          <div className="fixed inset-0 z-1100 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={handleCloseForm}
            />
            <div className="relative z-10 w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
                <h3 className="text-base font-bold text-white font-display">
                  {editingEvent ? 'Edit Concert' : 'Publish Concert'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
                {/* Event Title */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Bangkok Shoegaze Night Vol. 4"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Artists */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Artists / Lineup (comma-separated) *
                  </label>
                  <input
                    type="text"
                    required
                    value={artistsInput}
                    onChange={(e) => setArtistsInput(e.target.value)}
                    placeholder="e.g. Death Becomes Her, Plastic Plastic, Desktop Error"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Venue dropdown */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Venue *
                  </label>
                  <select
                    required
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  >
                    <option value="" disabled>
                      Select Venue
                    </option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Start Date & Time (Asia/Bangkok) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAtIso}
                    onChange={(e) => setStartAtIso(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Ticket Price *
                  </label>
                  <input
                    type="text"
                    required
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    placeholder="e.g. 450 THB / 500 at door"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Genres (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={genresInput}
                    onChange={(e) => setGenresInput(e.target.value)}
                    placeholder="e.g. Indie Rock, Post-Punk, Dream Pop"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Ticket URL */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Ticket Link URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    placeholder="https://ticketmelon.com/event/..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* IG Post URL */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Instagram Post URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={igPostUrl}
                    onChange={(e) => setIgPostUrl(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Poster URL (Optional direct URL) */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Poster Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  />
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-300 mb-1">
                    Ticket Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:border-lime-400 focus:outline-hidden"
                  >
                    <option value="available">Available (Green)</option>
                    <option value="low">Low Tickets (Yellow)</option>
                    <option value="sold_out">Sold Out (Red)</option>
                    <option value="not_open">Not Open Yet (Grey)</option>
                    <option value="cancelled">Cancelled (Grey)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingEvent ? 'Save Changes' : 'Publish Concert'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Event List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Your Concerts ({myEvents.length})
            </h2>
            <span className="text-xs font-mono text-neutral-500">
              One-tap buttons update ticket availability instantly
            </span>
          </div>

          {myEvents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-neutral-950 border border-dashed border-neutral-800 text-neutral-400 text-xs font-mono space-y-3">
              <Sparkles className="w-8 h-8 text-neutral-600 mx-auto" />
              <p>No concerts posted under your promoter profile yet.</p>
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 cursor-pointer"
              >
                Publish First Concert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myEvents.map((event) => {
                const venueName = venueMap.get(event.venueId) || 'Unknown Venue';
                const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.not_open;

                return (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800/90 shadow-lg space-y-4"
                  >
                    {/* Top row: Title, Venue, Edit & Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-mono text-lime-400 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatBangkokDateTime(event.startAt)}</span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-400">{venueName}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white font-display line-clamp-1">
                          {event.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                          {event.artists.join(', ')} • {event.priceText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(event)}
                          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Edit Concert"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id, event.title)}
                          className="p-2 text-rose-400/70 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Delete Concert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Current Status Badge & Update Time */}
                    <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-neutral-900">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">Live Status:</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-bold uppercase tracking-wider ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className="text-neutral-500">
                        Updated {formatRelativeTime(event.statusUpdatedAt)}
                      </span>
                    </div>

                    {/* One-Tap Status Buttons (Requirement 3) */}
                    <div>
                      <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
                        One-Tap Status Change:
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {/* Available */}
                        <button
                          type="button"
                          onClick={() => handleOneTapStatus(event.id, 'available')}
                          className={`py-2 px-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                            event.status === 'available'
                              ? 'bg-emerald-950 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/50'
                          }`}
                        >
                          Available
                        </button>

                        {/* Low */}
                        <button
                          type="button"
                          onClick={() => handleOneTapStatus(event.id, 'low')}
                          className={`py-2 px-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                            event.status === 'low'
                              ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/50'
                          }`}
                        >
                          Low
                        </button>

                        {/* Sold out */}
                        <button
                          type="button"
                          onClick={() => handleOneTapStatus(event.id, 'sold_out')}
                          className={`py-2 px-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                            event.status === 'sold_out'
                              ? 'bg-rose-950 border-rose-400 text-rose-200 ring-1 ring-rose-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/50'
                          }`}
                        >
                          Sold Out
                        </button>

                        {/* Not open */}
                        <button
                          type="button"
                          onClick={() => handleOneTapStatus(event.id, 'not_open')}
                          className={`py-2 px-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                            event.status === 'not_open'
                              ? 'bg-neutral-800 border-neutral-500 text-white'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          Not Open
                        </button>

                        {/* Cancelled */}
                        <button
                          type="button"
                          onClick={() => handleOneTapStatus(event.id, 'cancelled')}
                          className={`py-2 px-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                            event.status === 'cancelled'
                              ? 'bg-neutral-800 border-neutral-500 text-neutral-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
