/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isUserAdmin } from './firebase';
import { Venue } from './types/venue';
import { Promoter } from './types/promoter';
import { ConcertEvent, DateFilter } from './types/event';
import { OrganizerRecord, OrganizerRequest } from './types/organizer';
import { subscribeToVenues } from './services/venueService';
import { subscribeToPromoters } from './services/promoterService';
import { subscribeToEvents } from './services/eventService';
import {
  subscribeUserOrganizerRecord,
  subscribeUserOrganizerRequest,
} from './services/organizerService';
import { Map } from './components/Map';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { VenueBottomSheet } from './components/VenueBottomSheet';
import { EventDetailSheet } from './components/EventDetailSheet';
import { AdminPanel } from './components/AdminPanel';
import { VenueListDrawer } from './components/VenueListDrawer';
import { OrganizerRequestModal } from './components/OrganizerRequestModal';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { PromoterPage } from './components/PromoterPage';
import {
  isDateToday,
  isDateThisWeek,
  isDateThisMonth,
  isEventUpcoming,
} from './utils/dateUtils';

import sampleVenues from '../data/seed/venues.json';
import samplePromoters from '../data/seed/promoters.json';
import sampleEvents from '../data/seed/events.json';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Collections state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [events, setEvents] = useState<ConcertEvent[]>([]);

  // Selection state
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConcertEvent | null>(null);

  // Filter state (Requirement 5)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);

  // Modal & Drawer navigation
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [isOrganizerRequestOpen, setIsOrganizerRequestOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // Hash route state
  const [currentRoute, setCurrentRoute] = useState<'map' | 'admin' | 'organizer' | 'promoter'>('map');
  const [routePromoterId, setRoutePromoterId] = useState<string | null>(null);

  // Organizer state for signed-in user
  const [userOrganizerRecord, setUserOrganizerRecord] = useState<OrganizerRecord | null>(null);
  const [userOrganizerRequest, setUserOrganizerRequest] = useState<OrganizerRequest | null>(null);

  // Loading state
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingPromoters, setLoadingPromoters] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user organizer records & requests
  useEffect(() => {
    if (!user) {
      setUserOrganizerRecord(null);
      setUserOrganizerRequest(null);
      return;
    }

    const unsubRec = subscribeUserOrganizerRecord(
      user.uid,
      (rec) => setUserOrganizerRecord(rec),
      (err) => console.warn('User organizer record check:', err)
    );

    const unsubReq = subscribeUserOrganizerRequest(
      user.uid,
      (req) => setUserOrganizerRequest(req),
      (err) => console.warn('User organizer request check:', err)
    );

    return () => {
      unsubRec();
      unsubReq();
    };
  }, [user]);

  // Listen to hash routes (#/admin, #/organizer, #/promoter/:id)
  useEffect(() => {
    const checkHashRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash.startsWith('#/promoter/')) {
        const id = hash.replace('#/promoter/', '').split('?')[0].trim();
        setRoutePromoterId(id);
        setCurrentRoute('promoter');
        setIsAdminOpen(false);
      } else if (hash === '#/organizer' || hash === '#organizer') {
        setCurrentRoute('organizer');
        setIsAdminOpen(false);
        setRoutePromoterId(null);
      } else if (hash === '#/admin' || hash === '#admin' || path === '/admin') {
        setCurrentRoute('admin');
        setIsAdminOpen(true);
        setRoutePromoterId(null);
      } else {
        setCurrentRoute('map');
        setIsAdminOpen(false);
        setRoutePromoterId(null);
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    window.addEventListener('popstate', checkHashRoute);
    return () => {
      window.removeEventListener('hashchange', checkHashRoute);
      window.removeEventListener('popstate', checkHashRoute);
    };
  }, []);

  const handleOpenAdmin = () => {
    setEditingVenue(null);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    setEditingVenue(null);
    if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
      window.location.hash = '';
    }
  };

  const handleNavigateHome = () => {
    window.location.hash = '';
  };

  // 1. Subscribe to Venues Collection
  useEffect(() => {
    setLoadingVenues(true);
    const unsubscribe = subscribeToVenues(
      (data) => {
        setVenues(data);
        setLoadingVenues(false);
      },
      () => setLoadingVenues(false)
    );
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Promoters Collection
  useEffect(() => {
    setLoadingPromoters(true);
    const unsubscribe = subscribeToPromoters(
      (data) => {
        setPromoters(data);
        setLoadingPromoters(false);
      },
      () => setLoadingPromoters(false)
    );
    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Events Collection (Quota-protected query)
  useEffect(() => {
    setLoadingEvents(true);
    const unsubscribe = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoadingEvents(false);
      },
      () => setLoadingEvents(false)
    );
    return () => unsubscribe();
  }, []);

  // Active display collections: live Firestore data or seed samples fallback
  const isUsingFallback =
    !loadingVenues &&
    !loadingEvents &&
    venues.length === 0 &&
    events.length === 0;

  const activeVenues: Venue[] = venues.length > 0 ? venues : (sampleVenues as Venue[]);
  const activePromoters: Promoter[] =
    promoters.length > 0 ? promoters : (samplePromoters as Promoter[]);
  const activeEvents: ConcertEvent[] =
    events.length > 0 ? events : (sampleEvents as ConcertEvent[]);

  // Filtered Events based on Date filter and Available Only toggle
  const filteredEvents = useMemo(() => {
    return activeEvents.filter((event) => {
      if (!isEventUpcoming(event.startAt)) return false;
      if (dateFilter === 'today' && !isDateToday(event.startAt)) return false;
      if (dateFilter === 'week' && !isDateThisWeek(event.startAt)) return false;
      if (dateFilter === 'month' && !isDateThisMonth(event.startAt)) return false;

      if (availableOnly && event.status !== 'available' && event.status !== 'low') {
        return false;
      }

      return true;
    });
  }, [activeEvents, dateFilter, availableOnly]);

  const handleEditFromSheet = (venue: Venue) => {
    setSelectedVenue(null);
    setEditingVenue(venue);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const isAdmin = user ? isUserAdmin(user.email) : false;
  const isApprovedOrganizer = Boolean(userOrganizerRecord);

  // Find host promoter and host venue for selectedEvent
  const selectedEventPromoter = useMemo(() => {
    if (!selectedEvent) return undefined;
    return activePromoters.find((p) => p.id === selectedEvent.promoterId);
  }, [selectedEvent, activePromoters]);

  const selectedEventVenueName = useMemo(() => {
    if (!selectedEvent) return undefined;
    return activeVenues.find((v) => v.id === selectedEvent.venueId)?.name;
  }, [selectedEvent, activeVenues]);

  // Route: Promoter Profile Page (#/promoter/:id)
  if (currentRoute === 'promoter' && routePromoterId) {
    return (
      <PromoterPage
        promoterId={routePromoterId}
        promoters={activePromoters}
        events={activeEvents}
        venues={activeVenues}
        onSelectEvent={(event) => setSelectedEvent(event)}
        onBack={handleNavigateHome}
      />
    );
  }

  // Route: Organizer Dashboard (#/organizer)
  if (currentRoute === 'organizer') {
    return (
      <OrganizerDashboard
        user={user}
        organizerRecord={userOrganizerRecord}
        promoters={activePromoters}
        venues={activeVenues}
        events={activeEvents}
        onBack={handleNavigateHome}
        onOpenOrganizerRequest={() => setIsOrganizerRequestOpen(true)}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* Top Header */}
      <Header
        venuesCount={activeVenues.length}
        user={user}
        isApprovedOrganizer={isApprovedOrganizer}
        onOpenAdmin={handleOpenAdmin}
        onOpenOrganizerDashboard={() => {
          window.location.hash = '/organizer';
        }}
        onOpenOrganizerRequest={() => setIsOrganizerRequestOpen(true)}
        onToggleList={() => setIsListDrawerOpen(!isListDrawerOpen)}
        isListOpen={isListDrawerOpen}
      />

      {/* Filter Bar (Today / This week / This month / All + Tickets available only) */}
      <FilterBar
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        availableOnly={availableOnly}
        onAvailableOnlyToggle={() => setAvailableOnly(!availableOnly)}
      />

      {/* Full-screen Leaflet Map with Urgent Event Status Pins */}
      <Map
        venues={activeVenues}
        events={filteredEvents}
        selectedVenue={selectedVenue}
        onSelectVenue={(v) => {
          setSelectedVenue(v);
          setSelectedEvent(null);
        }}
      />

      {/* Sample Data Notice Banner if Firestore is not yet populated */}
      {isUsingFallback && (
        <div className="absolute top-28 left-3 z-400 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-amber-500/40 text-amber-300 text-[11px] font-mono shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Sample Livehouse Preview</span>
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

      {/* Selected Venue Bottom Sheet (Venue details + Upcoming events list) */}
      <VenueBottomSheet
        venue={selectedVenue}
        events={filteredEvents}
        onSelectEvent={(event) => setSelectedEvent(event)}
        onClose={() => setSelectedVenue(null)}
        isAdmin={isAdmin}
        onEdit={handleEditFromSheet}
      />

      {/* Event Detail Sheet (Artists, Promoter link, Bangkok time, Buy tickets, View IG post, Crowd Report) */}
      <EventDetailSheet
        event={selectedEvent}
        promoter={selectedEventPromoter}
        venueName={selectedEventVenueName}
        user={user}
        onClose={() => setSelectedEvent(null)}
        onOpenVenue={() => {
          if (selectedEvent) {
            const v = activeVenues.find((item) => item.id === selectedEvent.venueId);
            if (v) setSelectedVenue(v);
          }
        }}
      />

      {/* Venues Quick List Drawer with Urgent Status Indicators */}
      {isListDrawerOpen && (
        <VenueListDrawer
          venues={activeVenues}
          events={filteredEvents}
          onSelectVenue={(v) => {
            setSelectedVenue(v);
            setSelectedEvent(null);
            setIsListDrawerOpen(false);
          }}
          onClose={() => setIsListDrawerOpen(false)}
        />
      )}

      {/* Organizer Application & Status Modal */}
      <OrganizerRequestModal
        isOpen={isOrganizerRequestOpen}
        onClose={() => setIsOrganizerRequestOpen(false)}
        user={user}
        currentRequest={userOrganizerRequest}
        isApprovedOrganizer={isApprovedOrganizer}
      />

      {/* Extended Admin Panel */}
      {isAdminOpen && (
        <AdminPanel
          user={user}
          venues={activeVenues}
          promoters={activePromoters}
          events={activeEvents}
          onClose={handleCloseAdmin}
          editingVenueInitial={editingVenue}
        />
      )}
    </div>
  );
}
