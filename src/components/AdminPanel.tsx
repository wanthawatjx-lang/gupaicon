import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut, isUserAdmin, ADMIN_EMAIL } from '../firebase';
import { Venue, VenueFormData } from '../types/venue';
import { Promoter, PromoterFormData } from '../types/promoter';
import { ConcertEvent, EventFormData, EventStatus } from '../types/event';
import { createVenue, updateVenue, deleteVenue, seedSampleVenues } from '../services/venueService';
import { createPromoter, updatePromoter, deletePromoter, seedSamplePromoters } from '../services/promoterService';
import { createEvent, updateEvent, updateEventStatus, deleteEvent, seedSampleEvents } from '../services/eventService';
import { STATUS_MAP } from '../utils/statusUtils';
import { formatBangkokDateTime, parseTimestampToDate } from '../utils/dateUtils';
import {
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Instagram,
  MapPin,
  X,
  AlertTriangle,
  Database,
  CheckCircle2,
  RefreshCw,
  Search,
  BadgeCheck,
  Calendar,
  Layers,
  Music2,
  Users,
} from 'lucide-react';

interface AdminPanelProps {
  user: User | null;
  venues: Venue[];
  promoters: Promoter[];
  events: ConcertEvent[];
  onClose: () => void;
  editingVenueInitial?: Venue | null;
}

type AdminTab = 'events' | 'venues' | 'promoters';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  venues,
  promoters,
  events,
  onClose,
  editingVenueInitial = null,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(editingVenueInitial ? 'venues' : 'events');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Venue form state
  const [isVenueFormOpen, setIsVenueFormOpen] = useState(Boolean(editingVenueInitial));
  const [editingVenueId, setEditingVenueId] = useState<string | null>(
    editingVenueInitial ? editingVenueInitial.id : null
  );
  const [venueFormData, setVenueFormData] = useState<VenueFormData>({
    name: editingVenueInitial?.name || '',
    lat: editingVenueInitial?.lat ?? 13.80,
    lng: editingVenueInitial?.lng ?? 100.55,
    address: editingVenueInitial?.address || '',
    igUrl: editingVenueInitial?.igUrl || '',
    mapsUrl: editingVenueInitial?.mapsUrl || '',
  });

  // Promoter form state
  const [isPromoterFormOpen, setIsPromoterFormOpen] = useState(false);
  const [editingPromoterId, setEditingPromoterId] = useState<string | null>(null);
  const [promoterFormData, setPromoterFormData] = useState<PromoterFormData>({
    name: '',
    igUrl: '',
    verified: false,
  });

  // Event form state
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: '',
    artists: [''],
    venueId: venues[0]?.id || '',
    promoterId: promoters[0]?.id || '',
    startAtIso: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    priceText: '350 THB',
    genres: ['Indie Rock'],
    ticketUrl: '',
    igPostUrl: '',
    posterUrl: '',
    status: 'available',
  });

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'venue' | 'promoter' | 'event';
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating map for one-tap feedback
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Submitting / Seeding loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeedingAll, setIsSeedingAll] = useState(false);

  const isAdmin = user ? isUserAdmin(user.email) : false;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMessage('Signed out successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign out.');
    }
  };

  // --- Seed All Sample Data ---
  const handleSeedAll = async () => {
    setIsSeedingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const venuesCount = await seedSampleVenues();
      const promotersCount = await seedSamplePromoters();
      const eventsCount = await seedSampleEvents();
      setSuccessMessage(
        `Seeded ${venuesCount} venues, ${promotersCount} promoters, and ${eventsCount} events successfully!`
      );
    } catch (err: any) {
      console.error('Seed all error:', err);
      setErrorMessage(err?.message || 'Failed to seed sample data. Verify admin permissions.');
    } finally {
      setIsSeedingAll(false);
    }
  };

  // --- One-tap Event Status Switcher (Requirement 6) ---
  const handleQuickStatusChange = async (eventId: string, newStatus: EventStatus) => {
    setStatusUpdatingId(eventId);
    setErrorMessage(null);
    try {
      await updateEventStatus(eventId, newStatus);
      setSuccessMessage(`Updated event status to "${STATUS_MAP[newStatus].label}"`);
    } catch (err: any) {
      console.error('Failed to update event status:', err);
      setErrorMessage(err?.message || 'Failed to update event status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // --- Venue Form Actions ---
  const handleOpenAddVenue = () => {
    setEditingVenueId(null);
    setVenueFormData({
      name: '',
      lat: 13.80,
      lng: 100.55,
      address: '',
      igUrl: '',
      mapsUrl: '',
    });
    setErrorMessage(null);
    setIsVenueFormOpen(true);
  };

  const handleOpenEditVenue = (v: Venue) => {
    setEditingVenueId(v.id);
    setVenueFormData({
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      address: v.address,
      igUrl: v.igUrl,
      mapsUrl: v.mapsUrl,
    });
    setErrorMessage(null);
    setIsVenueFormOpen(true);
  };

  const handleVenueFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueFormData.name.trim()) return setErrorMessage('Venue name is required.');
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingVenueId) {
        await updateVenue(editingVenueId, venueFormData);
        setSuccessMessage(`Updated venue "${venueFormData.name}"!`);
      } else {
        await createVenue(venueFormData);
        setSuccessMessage(`Created venue "${venueFormData.name}"!`);
      }
      setIsVenueFormOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save venue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Promoter Form Actions ---
  const handleOpenAddPromoter = () => {
    setEditingPromoterId(null);
    setPromoterFormData({ name: '', igUrl: '', verified: false });
    setErrorMessage(null);
    setIsPromoterFormOpen(true);
  };

  const handleOpenEditPromoter = (p: Promoter) => {
    setEditingPromoterId(p.id);
    setPromoterFormData({ name: p.name, igUrl: p.igUrl, verified: p.verified });
    setErrorMessage(null);
    setIsPromoterFormOpen(true);
  };

  const handlePromoterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoterFormData.name.trim()) return setErrorMessage('Promoter name is required.');
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingPromoterId) {
        await updatePromoter(editingPromoterId, promoterFormData);
        setSuccessMessage(`Updated promoter "${promoterFormData.name}"!`);
      } else {
        await createPromoter(promoterFormData);
        setSuccessMessage(`Created promoter "${promoterFormData.name}"!`);
      }
      setIsPromoterFormOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save promoter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Event Form Actions ---
  const handleOpenAddEvent = () => {
    setEditingEventId(null);
    setEventFormData({
      title: '',
      artists: [''],
      venueId: venues[0]?.id || '',
      promoterId: promoters[0]?.id || '',
      startAtIso: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      priceText: '350 THB',
      genres: ['Indie Rock'],
      ticketUrl: '',
      igPostUrl: '',
      posterUrl: '',
      status: 'available',
    });
    setErrorMessage(null);
    setIsEventFormOpen(true);
  };

  const handleOpenEditEvent = (ev: ConcertEvent) => {
    setEditingEventId(ev.id);
    const dateObj = parseTimestampToDate(ev.startAt);
    const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setEventFormData({
      title: ev.title,
      artists: ev.artists.length > 0 ? ev.artists : [''],
      venueId: ev.venueId,
      promoterId: ev.promoterId,
      startAtIso: localIso,
      priceText: ev.priceText,
      genres: ev.genres.length > 0 ? ev.genres : ['Indie'],
      ticketUrl: ev.ticketUrl,
      igPostUrl: ev.igPostUrl,
      posterUrl: ev.posterUrl || '',
      status: ev.status,
    });
    setErrorMessage(null);
    setIsEventFormOpen(true);
  };

  const handleEventFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim()) return setErrorMessage('Event title is required.');
    if (!eventFormData.venueId) return setErrorMessage('Venue selection is required.');
    if (!eventFormData.promoterId) return setErrorMessage('Promoter selection is required.');

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, eventFormData);
        setSuccessMessage(`Updated event "${eventFormData.title}"!`);
      } else {
        await createEvent(eventFormData);
        setSuccessMessage(`Created event "${eventFormData.title}"!`);
      }
      setIsEventFormOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Deletion Execution ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      if (deleteTarget.type === 'venue') {
        await deleteVenue(deleteTarget.id);
      } else if (deleteTarget.type === 'promoter') {
        await deletePromoter(deleteTarget.id);
      } else if (deleteTarget.type === 'event') {
        await deleteEvent(deleteTarget.id);
      }
      setSuccessMessage(`Deleted ${deleteTarget.type} successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete item.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1150 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col min-h-screen sm:min-h-0 sm:max-h-[94vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400 text-black flex items-center justify-center font-bold shadow-md">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                Admin Console
              </h1>
              <p className="text-[11px] text-neutral-400">gupaicon livehouse database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close admin modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* If NOT logged in */}
          {!user && (
            <div className="py-12 px-4 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 font-display">Restricted Area</h2>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                Management of livehouse venues, promoters, and events requires Google Authentication.
                Only authorized admin (<span className="text-lime-400 font-mono">{ADMIN_EMAIL}</span>)
                is permitted to write.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* If Logged in BUT NOT Admin */}
          {user && !isAdmin && (
            <div className="py-10 px-4 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800 flex items-center justify-center mx-auto mb-4 text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Unauthorized Account</h2>
              <p className="text-neutral-300 text-xs mb-1">
                Signed in as: <strong className="text-white font-mono">{user.email}</strong>
              </p>
              <p className="text-neutral-400 text-xs mb-6">
                Only <span className="text-lime-400 font-mono font-bold">{ADMIN_EMAIL}</span> is
                authorized to modify livehouse data.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 mx-auto py-2.5 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* If Logged in AND IS Admin */}
          {user && isAdmin && (
            <div>
              {/* Admin Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-neutral-400">Admin:</span>
                  <span className="font-mono text-lime-400 font-bold">{user.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSeedAll}
                    disabled={isSeedingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer"
                    title="Seed 3 sample venues, 2 sample promoters, and 4 sample events"
                  >
                    {isSeedingAll ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-lime-400" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-lime-400" />
                    )}
                    <span>Seed All Samples</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs (Events / Venues / Promoters) */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-900/80 border border-neutral-800 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('events');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'events'
                      ? 'bg-lime-400 text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Music2 className="w-3.5 h-3.5" />
                  <span>Events ({events.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('venues');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'venues'
                      ? 'bg-lime-400 text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Venues ({venues.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('promoters');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'promoters'
                      ? 'bg-lime-400 text-black shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Promoters ({promoters.length})</span>
                </button>
              </div>

              {/* ==================== TAB 1: EVENTS ==================== */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  {/* Actions Header */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleOpenAddEvent}
                      className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Event</span>
                    </button>

                    <div className="relative w-full max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events or artists..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  {/* Event Form (Create / Edit) */}
                  {isEventFormOpen && (
                    <div className="p-4 rounded-2xl bg-neutral-900/90 border border-lime-400/50 shadow-2xl animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                        <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-lime-400" />
                          {editingEventId ? 'Edit Event' : 'Create Concert Event'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsEventFormOpen(false)}
                          className="text-neutral-400 hover:text-white p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleEventFormSubmit} className="space-y-3">
                        {/* Title */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Event Title <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={eventFormData.title}
                            onChange={(e) =>
                              setEventFormData({ ...eventFormData, title: e.target.value })
                            }
                            placeholder="e.g. Bangkok Math Rock Night Vol. 1"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* Dropdowns for Venue and Promoter (Requirement 6) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Venue Dropdown */}
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Venue <span className="text-lime-400">*</span>
                            </label>
                            <select
                              required
                              value={eventFormData.venueId}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, venueId: e.target.value })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            >
                              <option value="">Select a venue...</option>
                              {venues.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Promoter Dropdown */}
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Promoter / Collective <span className="text-lime-400">*</span>
                            </label>
                            <select
                              required
                              value={eventFormData.promoterId}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, promoterId: e.target.value })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            >
                              <option value="">Select a promoter...</option>
                              {promoters.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.verified ? '✓' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Date/Time and Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Start Date & Time (Bangkok) <span className="text-lime-400">*</span>
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={eventFormData.startAtIso}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, startAtIso: e.target.value })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-lime-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Price Text <span className="text-lime-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={eventFormData.priceText}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, priceText: e.target.value })
                              }
                              placeholder="e.g. 350 THB (door: 450 THB)"
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                        </div>

                        {/* Artists (Comma separated) */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Artists / Lineup (comma-separated) <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={eventFormData.artists.join(', ')}
                            onChange={(e) =>
                              setEventFormData({
                                ...eventFormData,
                                artists: e.target.value.split(',').map((s) => s.trim()),
                              })
                            }
                            placeholder="e.g. Band A, Band B, Guest DJ"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* Genres (Comma separated) */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Genres (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={eventFormData.genres.join(', ')}
                            onChange={(e) =>
                              setEventFormData({
                                ...eventFormData,
                                genres: e.target.value.split(',').map((s) => s.trim()),
                              })
                            }
                            placeholder="e.g. Math Rock, Post-Rock, Shoegaze"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* URLs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Ticket URL
                            </label>
                            <input
                              type="url"
                              value={eventFormData.ticketUrl}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, ticketUrl: e.target.value })
                              }
                              placeholder="https://ticketmelon.com/..."
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Instagram Post URL
                            </label>
                            <input
                              type="url"
                              value={eventFormData.igPostUrl}
                              onChange={(e) =>
                                setEventFormData({ ...eventFormData, igPostUrl: e.target.value })
                              }
                              placeholder="https://instagram.com/p/..."
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                        </div>

                        {/* Poster URL */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Poster Image URL (optional)
                          </label>
                          <input
                            type="url"
                            value={eventFormData.posterUrl}
                            onChange={(e) =>
                              setEventFormData({ ...eventFormData, posterUrl: e.target.value })
                            }
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* Initial Status */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Status
                          </label>
                          <select
                            value={eventFormData.status}
                            onChange={(e) =>
                              setEventFormData({
                                ...eventFormData,
                                status: e.target.value as EventStatus,
                              })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          >
                            <option value="available">Available (Tickets on sale)</option>
                            <option value="low">Low (Tickets running out)</option>
                            <option value="sold_out">Sold out</option>
                            <option value="not_open">Not open yet</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEventFormOpen(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{editingEventId ? 'Save Event' : 'Create Event'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Events List with One-Tap Status Switcher */}
                  <div className="space-y-3">
                    {events
                      .filter(
                        (ev) =>
                          ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ev.artists.some((a) =>
                            a.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                      )
                      .map((ev) => {
                        const hostVenue = venues.find((v) => v.id === ev.venueId);
                        const hostPromoter = promoters.find((p) => p.id === ev.promoterId);
                        const statusInfo = STATUS_MAP[ev.status] || STATUS_MAP.not_open;
                        const isUpdatingThis = statusUpdatingId === ev.id;

                        return (
                          <div
                            key={ev.id}
                            className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white truncate">{ev.title}</h4>
                                {ev.title.toUpperCase().startsWith('SAMPLE') && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-[9px] font-mono text-amber-300">
                                    SAMPLE
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono">
                                <span>{formatBangkokDateTime(ev.startAt)}</span>
                                <span>•</span>
                                <span className="text-lime-400 truncate max-w-[140px]">
                                  {hostVenue?.name || 'Unknown Venue'}
                                </span>
                                <span>•</span>
                                <span className="text-neutral-300 truncate max-w-[120px]">
                                  {hostPromoter?.name || 'Independent'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-neutral-400">
                                <span className="truncate max-w-[240px]">
                                  {ev.artists.join(', ')}
                                </span>
                                <span>({ev.priceText})</span>
                              </div>
                            </div>

                            {/* One-Tap Status Selector + Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
                              {/* One-Tap Status Select Dropdown (Requirement 6) */}
                              <div className="relative">
                                <select
                                  value={ev.status}
                                  disabled={isUpdatingThis}
                                  onChange={(e) =>
                                    handleQuickStatusChange(ev.id, e.target.value as EventStatus)
                                  }
                                  className={`text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl border appearance-none pr-7 cursor-pointer transition-all ${statusInfo.badgeClass}`}
                                >
                                  <option value="available">● Available</option>
                                  <option value="low">● Low</option>
                                  <option value="sold_out">● Sold out</option>
                                  <option value="not_open">● Not open</option>
                                  <option value="cancelled">● Cancelled</option>
                                </select>
                                {isUpdatingThis && (
                                  <RefreshCw className="w-3 h-3 animate-spin text-lime-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                )}
                              </div>

                              {/* Edit & Delete */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditEvent(ev)}
                                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Edit Event"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({ type: 'event', id: ev.id, title: ev.title })
                                }
                                className="p-2 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Delete Event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ==================== TAB 2: VENUES ==================== */}
              {activeTab === 'venues' && (
                <div className="space-y-4">
                  {/* Actions Header */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleOpenAddVenue}
                      className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Venue</span>
                    </button>

                    <div className="relative w-full max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search venues..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  {/* Venue Form */}
                  {isVenueFormOpen && (
                    <div className="p-4 rounded-2xl bg-neutral-900/90 border border-lime-400/50 shadow-2xl animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                        <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-lime-400" />
                          {editingVenueId ? 'Edit Venue' : 'Create Venue'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsVenueFormOpen(false)}
                          className="text-neutral-400 hover:text-white p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleVenueFormSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Venue Name <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={venueFormData.name}
                            onChange={(e) =>
                              setVenueFormData({ ...venueFormData, name: e.target.value })
                            }
                            placeholder="e.g. De Commune / Speakerbox"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Latitude <span className="text-lime-400">*</span>
                            </label>
                            <input
                              type="number"
                              step="any"
                              required
                              value={venueFormData.lat}
                              onChange={(e) =>
                                setVenueFormData({
                                  ...venueFormData,
                                  lat: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Longitude <span className="text-lime-400">*</span>
                            </label>
                            <input
                              type="number"
                              step="any"
                              required
                              value={venueFormData.lng}
                              onChange={(e) =>
                                setVenueFormData({
                                  ...venueFormData,
                                  lng: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Address / Area <span className="text-lime-400">*</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={venueFormData.address}
                            onChange={(e) =>
                              setVenueFormData({ ...venueFormData, address: e.target.value })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Instagram URL
                            </label>
                            <input
                              type="url"
                              value={venueFormData.igUrl}
                              onChange={(e) =>
                                setVenueFormData({ ...venueFormData, igUrl: e.target.value })
                              }
                              placeholder="https://instagram.com/..."
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">
                              Maps URL
                            </label>
                            <input
                              type="url"
                              value={venueFormData.mapsUrl}
                              onChange={(e) =>
                                setVenueFormData({ ...venueFormData, mapsUrl: e.target.value })
                              }
                              placeholder="https://maps.google.com/?q=..."
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsVenueFormOpen(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{editingVenueId ? 'Save Venue' : 'Create Venue'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Venues List */}
                  <div className="space-y-2">
                    {venues
                      .filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((venue) => (
                        <div
                          key={venue.id}
                          className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate">{venue.name}</h4>
                            <p className="text-xs text-neutral-400 truncate">{venue.address}</p>
                            <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                              {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditVenue(venue)}
                              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ type: 'venue', id: venue.id, title: venue.name })
                              }
                              className="p-2 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ==================== TAB 3: PROMOTERS ==================== */}
              {activeTab === 'promoters' && (
                <div className="space-y-4">
                  {/* Actions Header */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleOpenAddPromoter}
                      className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-xs hover:bg-lime-300 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Promoter</span>
                    </button>

                    <div className="relative w-full max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search promoters..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400"
                      />
                    </div>
                  </div>

                  {/* Promoter Form */}
                  {isPromoterFormOpen && (
                    <div className="p-4 rounded-2xl bg-neutral-900/90 border border-lime-400/50 shadow-2xl animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                        <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-lime-400" />
                          {editingPromoterId ? 'Edit Promoter' : 'Create Promoter'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsPromoterFormOpen(false)}
                          className="text-neutral-400 hover:text-white p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handlePromoterFormSubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Promoter Name <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={promoterFormData.name}
                            onChange={(e) =>
                              setPromoterFormData({ ...promoterFormData, name: e.target.value })
                            }
                            placeholder="e.g. Loud Wave Collective / DIY Sounds"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Instagram URL
                          </label>
                          <input
                            type="url"
                            value={promoterFormData.igUrl}
                            onChange={(e) =>
                              setPromoterFormData({ ...promoterFormData, igUrl: e.target.value })
                            }
                            placeholder="https://instagram.com/promoter_handle"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* Verified Checkbox */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="promoter-verified"
                            checked={promoterFormData.verified}
                            onChange={(e) =>
                              setPromoterFormData({
                                ...promoterFormData,
                                verified: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-lime-400 rounded cursor-pointer"
                          />
                          <label
                            htmlFor="promoter-verified"
                            className="text-xs text-neutral-200 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Verified Promoter (shows blue/verified checkmark badge)</span>
                            <BadgeCheck className="w-4 h-4 text-sky-400" />
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsPromoterFormOpen(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{editingPromoterId ? 'Save Promoter' : 'Create Promoter'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Promoters List */}
                  <div className="space-y-2">
                    {promoters
                      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((promoter) => (
                        <div
                          key={promoter.id}
                          className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-white truncate">
                                {promoter.name}
                              </h4>
                              {promoter.verified && (
                                <span title="Verified Promoter" className="inline-flex items-center">
                                  <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 font-mono truncate">
                              {promoter.igUrl || 'No IG linked'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPromoter(promoter)}
                              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'promoter',
                                  id: promoter.id,
                                  title: promoter.name,
                                })
                              }
                              className="p-2 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-1200 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-red-900/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
              <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Confirm Deletion
              </h4>
              <p className="text-neutral-300 text-xs mb-1">
                Are you sure you want to delete this {deleteTarget.type}?
              </p>
              <p className="text-white text-xs font-bold font-mono mb-5 truncate">
                "{deleteTarget.title}"
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
