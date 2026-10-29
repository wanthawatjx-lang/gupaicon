import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut, isUserAdmin, ADMIN_EMAILS } from '../firebase';
import { Venue, VenueFormData } from '../types/venue';
import { createVenue, updateVenue, deleteVenue, seedSampleVenues } from '../services/venueService';
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
  Search
} from 'lucide-react';

interface AdminPanelProps {
  user: User | null;
  venues: Venue[];
  onClose: () => void;
  editingVenueInitial?: Venue | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  venues,
  onClose,
  editingVenueInitial = null,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(Boolean(editingVenueInitial));
  const [editingVenueId, setEditingVenueId] = useState<string | null>(
    editingVenueInitial ? editingVenueInitial.id : null
  );
  const [formData, setFormData] = useState<VenueFormData>({
    name: editingVenueInitial?.name || '',
    lat: editingVenueInitial?.lat ?? 13.80,
    lng: editingVenueInitial?.lng ?? 100.55,
    address: editingVenueInitial?.address || '',
    igUrl: editingVenueInitial?.igUrl || '',
    mapsUrl: editingVenueInitial?.mapsUrl || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);

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

  const handleOpenAddForm = () => {
    setEditingVenueId(null);
    setFormData({
      name: '',
      lat: 13.80,
      lng: 100.55,
      address: '',
      igUrl: '',
      mapsUrl: '',
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (venue: Venue) => {
    setEditingVenueId(venue.id);
    setFormData({
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      address: venue.address,
      igUrl: venue.igUrl,
      mapsUrl: venue.mapsUrl,
    });
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.name.trim()) {
      setErrorMessage('Venue name is required.');
      return;
    }
    if (isNaN(Number(formData.lat)) || isNaN(Number(formData.lng))) {
      setErrorMessage('Valid numeric coordinates (Latitude and Longitude) are required.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Venue address is required.');
      return;
    }

    // Default map URL if empty
    let mapsUrl = formData.mapsUrl.trim();
    if (!mapsUrl) {
      mapsUrl = `https://maps.google.com/?q=${formData.lat},${formData.lng}`;
    }

    let igUrl = formData.igUrl.trim();
    if (!igUrl) {
      igUrl = 'https://instagram.com';
    }

    setIsSubmitting(true);
    try {
      if (editingVenueId) {
        await updateVenue(editingVenueId, {
          name: formData.name,
          lat: Number(formData.lat),
          lng: Number(formData.lng),
          address: formData.address,
          igUrl,
          mapsUrl,
        });
        setSuccessMessage(`Updated "${formData.name}" successfully!`);
      } else {
        await createVenue({
          name: formData.name,
          lat: Number(formData.lat),
          lng: Number(formData.lng),
          address: formData.address,
          igUrl,
          mapsUrl,
        });
        setSuccessMessage(`Added "${formData.name}" successfully!`);
      }
      setIsFormOpen(false);
      setEditingVenueId(null);
    } catch (err: any) {
      console.error('Save venue error:', err);
      setErrorMessage(err?.message || 'Failed to save venue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteVenue(deletingId);
      setSuccessMessage('Venue deleted.');
      setDeletingId(null);
    } catch (err: any) {
      console.error('Delete venue error:', err);
      setErrorMessage(err?.message || 'Failed to delete venue.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedVenues = async () => {
    setIsSeeding(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const count = await seedSampleVenues();
      setSuccessMessage(`Successfully seeded ${count} sample venues!`);
    } catch (err: any) {
      console.error('Seed error:', err);
      setErrorMessage(err?.message || 'Failed to seed sample venues. Check admin permissions.');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-1050 bg-black/80 backdrop-blur-md flex flex-col items-center justify-start sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lime-400 text-black flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                Admin Console
              </h1>
              <p className="text-xs text-neutral-400">gupaicon livehouse database</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close admin modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Status Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-lime-950/80 border border-lime-800 text-lime-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* If NOT logged in */}
          {!user && (
            <div className="py-12 px-4 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Restricted Area</h2>
              <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                Management of venues requires Google Authentication. Only authorized admin (
                <span className="text-lime-400 font-mono">wantawachjz@gmail.com</span>) can perform
                writes.
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
                Only <span className="text-lime-400 font-mono font-bold">wantawachjz@gmail.com</span>{' '}
                is permitted to modify venues.
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
              {/* Admin profile bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-neutral-400">Admin:</span>
                  <span className="font-mono text-lime-400 font-medium">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-lime-400 text-black font-semibold text-xs hover:bg-lime-300 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Venue</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSeedVenues}
                    disabled={isSeeding}
                    className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    title="Load sample venues from data/seed/venues.json"
                  >
                    {isSeeding ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-lime-400" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-lime-400" />
                    )}
                    <span>Seed Sample Venues</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search venues..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
              </div>

              {/* Form Modal / Inline Section */}
              {isFormOpen && (
                <div className="mb-6 p-4 rounded-xl bg-neutral-900/90 border border-lime-400/40 shadow-xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lime-400" />
                      {editingVenueId ? 'Edit Venue' : 'Create New Venue'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-neutral-400 hover:text-white p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-3">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Venue Name <span className="text-lime-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. De Commune / Blueprint Livehouse / SAMPLE Rock Bar"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    {/* Coordinates Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Latitude <span className="text-lime-400">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formData.lat}
                          onChange={(e) =>
                            setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="e.g. 13.8050"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
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
                          value={formData.lng}
                          onChange={(e) =>
                            setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="e.g. 100.5500"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
                        />
                      </div>
                    </div>

                    {/* Quick Coord Presets */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-neutral-500 font-mono">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lat: 13.7563, lng: 100.5018 })}
                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                      >
                        BKK Center
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lat: 13.805, lng: 100.55 })}
                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                      >
                        Bang Sue
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, lat: 13.989, lng: 100.617 })}
                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                      >
                        Rangsit
                      </button>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Address / Area <span className="text-lime-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. 888 Thonglor Rd, Watthana, Bangkok 10110"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    {/* IG URL */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        value={formData.igUrl}
                        onChange={(e) => setFormData({ ...formData, igUrl: e.target.value })}
                        placeholder="https://instagram.com/venue_handle"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    {/* Maps URL */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Maps URL (Google / Apple Maps)
                      </label>
                      <input
                        type="url"
                        value={formData.mapsUrl}
                        onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })}
                        placeholder="https://maps.google.com/?q=..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-black bg-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                      >
                        {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{editingVenueId ? 'Save Changes' : 'Create Venue'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Venues List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 px-1">
                  <span>
                    Venues ({filteredVenues.length} of {venues.length})
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    Collection: /venues
                  </span>
                </div>

                {filteredVenues.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                    No venues found. Click "Add Venue" or "Seed Sample Venues" above.
                  </div>
                ) : (
                  filteredVenues.map((venue) => {
                    const isSample = venue.name.toUpperCase().startsWith('SAMPLE');
                    return (
                      <div
                        key={venue.id}
                        className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-white truncate">{venue.name}</h4>
                            {isSample && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-[9px] font-mono text-amber-300">
                                SAMPLE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 truncate mb-1">{venue.address}</p>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500">
                            <span>
                              {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
                            </span>
                            {venue.mapsUrl && (
                              <a
                                href={venue.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-lime-400 flex items-center gap-0.5"
                              >
                                <ExternalLink className="w-3 h-3" /> Maps
                              </a>
                            )}
                            {venue.igUrl && (
                              <a
                                href={venue.igUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-pink-400 flex items-center gap-0.5"
                              >
                                <Instagram className="w-3 h-3" /> IG
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(venue)}
                            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(venue.id)}
                            className="p-2 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <div className="fixed inset-0 z-1100 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-red-900/50 rounded-xl p-5 max-w-sm w-full shadow-2xl">
              <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Confirm Deletion
              </h4>
              <p className="text-neutral-300 text-xs mb-5">
                Are you sure you want to delete this venue? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
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
