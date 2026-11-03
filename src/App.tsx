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
import { subscribeToVenues } from './services/venueService';
import { subscribeToPromoters } from './services/promoterService';
import { subscribeToEvents } from './services/eventService';
import { Map } from './components/Map';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ListView } from './components/ListView';
import { VenueBottomSheet } from './components/VenueBottomSheet';
import { EventDetailSheet } from './components/EventDetailSheet';
import { AdminPanel } from './components/AdminPanel';
import { VenueListDrawer } from './components/VenueListDrawer';
import { Footer } from './components/Footer';
import { PrivacyPage } from './components/PrivacyPage';
import { StatusBanners } from './components/StatusBanners';
import { normalizeStatus } from './utils/statusUtils';
import { Language, getInitialLanguage, saveLanguagePreference, translations } from './i18n';
import {
  isDateToday,
  isDateThisWeek,
  isDateThisMonth,
  isEventUpcoming,
} from './utils/dateUtils';
import { Map as MapIcon, List as ListIcon } from 'lucide-react';

import sampleVenues from '../data/seed/venues.json';
import samplePromoters from '../data/seed/promoters.json';
import sampleEvents from '../data/seed/events.json';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Language state (TH / EN) - Default TH
  const [lang, setLang] = useState<Language>(getInitialLanguage());

  const handleToggleLang = () => {
    const nextLang: Language = lang === 'th' ? 'en' : 'th';
    setLang(nextLang);
    saveLanguagePreference(nextLang);
  };

  // View mode: 'map' or 'list'
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Collections state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [events, setEvents] = useState<ConcertEvent[]>([]);

  // Selection state
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ConcertEvent | null>(null);

  // Filter state (Requirement 4 + Map Marker Filtering)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Modal & Drawer navigation
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // Loading state & Firestore error tracking
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingPromoters, setLoadingPromoters] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [firestoreError, setFirestoreError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 1. Subscribe to Venues Collection
  useEffect(() => {
    setLoadingVenues(true);
    const unsubscribe = subscribeToVenues(
      (data) => {
        setVenues(data);
        setLoadingVenues(false);
      },
      () => {
        setLoadingVenues(false);
        setFirestoreError(true);
      }
    );
    return () => unsubscribe();
  }, [retryKey]);

  // 2. Subscribe to Promoters Collection
  useEffect(() => {
    setLoadingPromoters(true);
    const unsubscribe = subscribeToPromoters(
      (data) => {
        setPromoters(data);
        setLoadingPromoters(false);
      },
      () => {
        setLoadingPromoters(false);
        setFirestoreError(true);
      }
    );
    return () => unsubscribe();
  }, [retryKey]);

  // 3. Subscribe to Events Collection (Bounded query with limit 80)
  useEffect(() => {
    setLoadingEvents(true);
    const unsubscribe = subscribeToEvents(
      (data) => {
        setEvents(data);
        setLoadingEvents(false);
      },
      () => {
        setLoadingEvents(false);
        setFirestoreError(true);
      }
    );
    return () => unsubscribe();
  }, [retryKey]);

  // Active display collections: live Firestore data or seed samples fallback
  const activeVenues: Venue[] = venues.length > 0 ? venues : (sampleVenues as Venue[]);
  const activePromoters: Promoter[] =
    promoters.length > 0 ? promoters : (samplePromoters as Promoter[]);
  const activeEvents: ConcertEvent[] =
    events.length > 0 ? events : (sampleEvents as ConcertEvent[]);

  // Listen to hash routes (#/admin, #/privacy, #/list, #/event/{id})
  useEffect(() => {
    const handleHashRouting = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash === '#/admin' || hash === '#admin' || path === '/admin') {
        setIsAdminOpen(true);
      } else {
        setIsAdminOpen(false);
      }

      if (hash === '#/privacy' || hash === '#privacy' || path === '/privacy') {
        setIsPrivacyOpen(true);
      } else {
        setIsPrivacyOpen(false);
      }

      if (hash === '#/list' || hash === '#list') {
        setViewMode('list');
      } else if (hash === '#/' || hash === '' || hash === '#') {
        setViewMode('map');
      }

      // Check direct link: #/event/{id}
      const eventMatch = hash.match(/^#\/event\/(.+)$/);
      if (eventMatch && eventMatch[1]) {
        const eventId = eventMatch[1];
        const targetEvt = activeEvents.find((e) => e.id === eventId);
        if (targetEvt) {
          setSelectedEvent(targetEvt);
          const venue = activeVenues.find((v) => v.id === targetEvt.venueId);
          if (venue) setSelectedVenue(venue);
        }
      }
    };

    handleHashRouting();
    window.addEventListener('hashchange', handleHashRouting);
    window.addEventListener('popstate', handleHashRouting);
    return () => {
      window.removeEventListener('hashchange', handleHashRouting);
      window.removeEventListener('popstate', handleHashRouting);
    };
  }, [activeEvents, activeVenues]);

  const handleOpenAdmin = () => {
    setEditingVenue(null);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    setEditingVenue(null);
    if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
      window.location.hash = viewMode === 'list' ? '/list' : '';
    }
  };

  const handleOpenPrivacy = () => {
    setIsPrivacyOpen(true);
    window.location.hash = '/privacy';
  };

  const handleClosePrivacy = () => {
    setIsPrivacyOpen(false);
    if (window.location.hash === '#/privacy' || window.location.hash === '#privacy') {
      window.location.hash = viewMode === 'list' ? '/list' : '';
    }
  };

  const handleRetry = () => {
    setFirestoreError(false);
    setRetryKey((k) => k + 1);
  };

  const handleToggleViewMode = () => {
    const nextMode = viewMode === 'map' ? 'list' : 'map';
    setViewMode(nextMode);
    window.location.hash = nextMode === 'list' ? '/list' : '';
  };

  // Collect unique genres from active events
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    activeEvents.forEach((e) => {
      e.genres?.forEach((g) => {
        if (g && g.trim()) genreSet.add(g.trim());
      });
    });
    return Array.from(genreSet).slice(0, 10);
  }, [activeEvents]);

  // Filtered Events based on Date, Ticket Availability, Search query, and Genre
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const genreFilter = selectedGenre.toLowerCase();

    return activeEvents.filter((event) => {
      if (!isEventUpcoming(event.startAt)) return false;
      if (dateFilter === 'today' && !isDateToday(event.startAt)) return false;
      if (dateFilter === 'week' && !isDateThisWeek(event.startAt)) return false;
      if (dateFilter === 'month' && !isDateThisMonth(event.startAt)) return false;

      const norm = normalizeStatus(event.status);
      if (availableOnly && norm !== 'available' && norm !== 'low') {
        return false;
      }

      // Genre filter check
      if (genreFilter !== 'all') {
        const hasGenre = event.genres?.some((g) => g.toLowerCase() === genreFilter);
        if (!hasGenre) return false;
      }

      // Search keyword filter (matches title, artist names, genre, or host venue)
      if (q) {
        const venue = activeVenues.find((v) => v.id === event.venueId);
        const venueName = (venue?.name || '').toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(q);
        const artistMatch = event.artists?.some((a) => a.toLowerCase().includes(q));
        const genreMatch = event.genres?.some((g) => g.toLowerCase().includes(q));
        const venueMatch = venueName.includes(q);
        if (!titleMatch && !artistMatch && !genreMatch && !venueMatch) {
          return false;
        }
      }

      return true;
    });
  }, [activeEvents, activeVenues, dateFilter, availableOnly, searchQuery, selectedGenre]);

  // Marker Filtering: Filter venues displayed on the map
  const isAnyFilterActive =
    dateFilter !== 'all' ||
    availableOnly ||
    searchQuery.trim().length > 0 ||
    selectedGenre !== 'all';

  const filteredVenues = useMemo(() => {
    if (!isAnyFilterActive) {
      return activeVenues;
    }
    const q = searchQuery.trim().toLowerCase();
    const venueIdsWithFilteredEvents = new Set(filteredEvents.map((e) => e.venueId));

    return activeVenues.filter((venue) => {
      if (venueIdsWithFilteredEvents.has(venue.id)) return true;
      if (q && venue.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [activeVenues, filteredEvents, isAnyFilterActive, searchQuery]);

  const handleClearFilters = () => {
    setDateFilter('all');
    setAvailableOnly(false);
    setSearchQuery('');
    setSelectedGenre('all');
  };

  const handleEditFromSheet = (venue: Venue) => {
    setSelectedVenue(null);
    setEditingVenue(venue);
    setIsAdminOpen(true);
    window.location.hash = '/admin';
  };

  const isAdmin = user ? isUserAdmin(user.email, user.emailVerified) : false;

  // Find host promoter and host venue for selectedEvent
  const selectedEventPromoter = useMemo(() => {
    if (!selectedEvent) return undefined;
    return activePromoters.find((p) => p.id === selectedEvent.promoterId);
  }, [selectedEvent, activePromoters]);

  const selectedEventVenueName = useMemo(() => {
    if (!selectedEvent) return undefined;
    return activeVenues.find((v) => v.id === selectedEvent.venueId)?.name;
  }, [selectedEvent, activeVenues]);

  const t = translations[lang];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none font-sans">
      {/* Top Header with TH/EN Toggle and Admin Button */}
      <Header
        venuesCount={activeVenues.length}
        eventsCount={filteredEvents.length}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAdmin={handleOpenAdmin}
        onToggleList={() => setIsListDrawerOpen(!isListDrawerOpen)}
        isListOpen={isListDrawerOpen}
        isAdminSignedIn={isAdmin}
      />

      {/* Filter Bar with Date, Tickets, Search & Genre marker filtering */}
      <FilterBar
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        availableOnly={availableOnly}
        onAvailableOnlyToggle={() => setAvailableOnly(!availableOnly)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        availableGenres={availableGenres}
        onClearFilters={handleClearFilters}
        lang={lang}
      />

      {/* Main View Area: Map or List */}
      <main className="w-full h-full relative">
        {viewMode === 'map' ? (
          <Map
            venues={filteredVenues}
            events={filteredEvents}
            selectedVenue={selectedVenue}
            onSelectVenue={(v) => {
              setSelectedVenue(v);
            }}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
            onClearFilters={handleClearFilters}
            lang={lang}
            user={user}
          />
        ) : (
          <ListView
            events={filteredEvents}
            venues={activeVenues}
            promoters={activePromoters}
            loading={loadingEvents}
            onSelectEvent={(evt) => setSelectedEvent(evt)}
            onClearFilters={handleClearFilters}
            lang={lang}
          />
        )}
      </main>

      {/* Floating Switch Button between Map and List View (Requirement 4) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-600 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleViewMode}
          className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-neutral-900/95 hover:bg-neutral-850 text-white font-bold text-xs tracking-wider uppercase border border-neutral-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer hover:border-lime-400 group"
          aria-label={viewMode === 'map' ? t.app.listView : t.app.mapView}
        >
          {viewMode === 'map' ? (
            <>
              <ListIcon className="w-4 h-4 text-lime-400 group-hover:scale-110 transition-transform" />
              <span>{t.app.listView}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-[10px] font-mono text-lime-400 border border-neutral-700">
                {filteredEvents.length}
              </span>
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4 text-lime-400 group-hover:scale-110 transition-transform" />
              <span>{t.app.mapView}</span>
            </>
          )}
        </button>
      </div>

      {/* Venue Bottom Sheet (3 Snap levels: peek / half / full) */}
      <VenueBottomSheet
        venue={selectedVenue}
        events={filteredEvents}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          window.location.hash = `/event/${event.id}`;
        }}
        onClose={() => setSelectedVenue(null)}
        isAdmin={isAdmin}
        onEdit={handleEditFromSheet}
        lang={lang}
      />

      {/* Event Detail Sheet (Artists, Promoter link, Bangkok time, Buy tickets, View IG post) */}
      <EventDetailSheet
        event={selectedEvent}
        promoter={selectedEventPromoter}
        venueName={selectedEventVenueName}
        user={user}
        onClose={() => {
          setSelectedEvent(null);
          if (window.location.hash.startsWith('#/event/')) {
            window.location.hash = viewMode === 'list' ? '/list' : '';
          }
        }}
        onOpenVenue={() => {
          if (selectedEvent) {
            const v = activeVenues.find((item) => item.id === selectedEvent.venueId);
            if (v) setSelectedVenue(v);
          }
        }}
        lang={lang}
      />

      {/* Offline & Firestore Error Banners */}
      <StatusBanners
        lang={lang}
        hasError={firestoreError}
        onRetry={handleRetry}
      />

      {/* Venues Quick Drawer */}
      {isListDrawerOpen && (
        <VenueListDrawer
          venues={activeVenues}
          events={filteredEvents}
          loading={loadingVenues}
          onSelectVenue={(v) => {
            setSelectedVenue(v);
            setSelectedEvent(null);
            setIsListDrawerOpen(false);
          }}
          onClose={() => setIsListDrawerOpen(false)}
          lang={lang}
        />
      )}

      {/* Small Disclaimer Footer with Privacy Policy link */}
      <Footer lang={lang} onOpenPrivacy={handleOpenPrivacy} />

      {/* Privacy Policy Page Modal */}
      {isPrivacyOpen && (
        <PrivacyPage lang={lang} onBack={handleClosePrivacy} />
      )}

      {/* Admin Panel (English console strictly restricted to wanthawatjx@gmail.com) */}
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
