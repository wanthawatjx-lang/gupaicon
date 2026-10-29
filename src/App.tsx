/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isUserAdmin } from './firebase';
import { Venue } from './types/venue';
import { subscribeToVenues, seedSampleVenues } from './services/venueService';
import { Map } from './components/Map';
import { Header } from './components/Header';
import { VenueBottomSheet } from './components/VenueBottomSheet';
import { AdminPanel } from './components/AdminPanel';
import { VenueListDrawer } from './components/VenueListDrawer';

import sampleVenues from '../data/seed/venues.json';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAttemptedAutoSeed, setHasAttemptedAutoSeed] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Check URL hash/path for direct /admin route
  useEffect(() => {
    const checkAdminRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#/admin' || hash === '#admin' || path === '/admin') {
        setIsAdminOpen(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, []);

  // Update URL hash when admin panel opens or closes
  const handleOpenAdmin = () => {
    setEditingVenue(null);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    setEditingVenue(null);
    if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Subscribe to Venues Collection in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToVenues(
      (data) => {
        setVenues(data);
        setLoading(false);

        // If the collection is brand new and empty, and user is an authorized admin, offer/run auto-seed
        if (data.length === 0 && !hasAttemptedAutoSeed && user && isUserAdmin(user.email)) {
          setHasAttemptedAutoSeed(true);
          seedSampleVenues().catch((err) => {
            console.log('Sample seeding note:', err);
          });
        }
      },
      (error) => {
        console.error('Failed to subscribe to venues:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, hasAttemptedAutoSeed]);

  // Active display venues: Firestore data if present, or initial sample data fallback
  const isUsingFallback = !loading && venues.length === 0;
  const activeVenues: Venue[] = venues.length > 0 ? venues : (sampleVenues as Venue[]);

  const handleEditFromSheet = (venue: Venue) => {
    setSelectedVenue(null);
    setEditingVenue(venue);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const isAdmin = user ? isUserAdmin(user.email) : false;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* Top Header */}
      <Header
        venuesCount={activeVenues.length}
        user={user}
        onOpenAdmin={handleOpenAdmin}
        onToggleList={() => setIsListDrawerOpen(!isListDrawerOpen)}
        isListOpen={isListDrawerOpen}
      />

      {/* Full-screen Leaflet Map */}
      <Map
        venues={activeVenues}
        selectedVenue={selectedVenue}
        onSelectVenue={(v) => setSelectedVenue(v)}
      />

      {/* Sample Data Notice Banner if Firestore is not yet populated */}
      {isUsingFallback && (
        <div className="absolute top-16 left-3 z-400 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-amber-500/40 text-amber-300 text-[11px] font-mono shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Sample Venues Preview</span>
            <button
              type="button"
              onClick={handleOpenAdmin}
              className="ml-1 text-white underline hover:text-lime-400 font-semibold cursor-pointer"
            >
              Seed DB
            </button>
          </div>
        </div>
      )}

      {/* Selected Venue Bottom Sheet */}
      <VenueBottomSheet
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        isAdmin={isAdmin}
        onEdit={handleEditFromSheet}
      />

      {/* Venues Quick List Drawer */}
      {isListDrawerOpen && (
        <VenueListDrawer
          venues={activeVenues}
          onSelectVenue={(v) => {
            setSelectedVenue(v);
            setIsListDrawerOpen(false);
          }}
          onClose={() => setIsListDrawerOpen(false)}
        />
      )}

      {/* Admin Panel (/admin) */}
      {isAdminOpen && (
        <AdminPanel
          user={user}
          venues={activeVenues}
          onClose={handleCloseAdmin}
          editingVenueInitial={editingVenue}
        />
      )}
    </div>
  );
}
