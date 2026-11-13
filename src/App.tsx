/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, isUserAdmin } from './firebase';
import { Venue } from './types/venue';
import { Promoter } from './types/promoter';
import { ConcertEvent, DateFilter } from './types/event';
import { fetchVenues } from './services/venueService';
import { fetchPromoters } from './services/promoterService';
import { fetchEvents } from './services/eventService';
import { Map } from './components/Map';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ListView } from './components/ListView';
import { VenueBottomSheet } from './components/VenueBottomSheet';
import { EventDetailSheet } from './components/EventDetailSheet';
import { VenueListDrawer } from './components/VenueListDrawer';
import { Footer } from './components/Footer';
import { StatusBanners } from './components/StatusBanners';
import { ChooseProfileModal } from './components/community/ChooseProfileModal';
import { StartChatModal } from './components/chat/StartChatModal';
import { UserProfile } from './types/community';
import { fetchUserProfile } from './services/communityService';
import { normalizeStatus } from './utils/statusUtils';
import { Language, getInitialLanguage, saveLanguagePreference, translations } from './i18n';
import {
  isDateToday,
  isDateThisWeek,
  isDateThisMonth,
  isEventUpcoming,
} from './utils/dateUtils';
import { Map as MapIcon, List as ListIcon, Lock, ArrowLeft, RefreshCw } from 'lucide-react';

import sampleVenues from '../data/seed/venues.json';
import samplePromoters from '../data/seed/promoters.json';
import sampleEvents from '../data/seed/events.json';

// Lazy-loaded heavy overlays for faster mobile initial load
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);
const PrivacyPage = lazy(() =>
  import('./components/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const BuddyBoardPage = lazy(() =>
  import('./components/community/BuddyBoardPage').then((m) => ({ default: m.BuddyBoardPage }))
);
const ProfilePage = lazy(() =>
  import('./components/community/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const MessagesPage = lazy(() =>
  import('./components/chat/MessagesPage').then((m) => ({ default: m.MessagesPage }))
);

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

  // Community & Buddy Board navigation and state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBuddiesPageOpen, setIsBuddiesPageOpen] = useState(false);
  const [isProfilePageOpen, setIsProfilePageOpen] = useState(false);

  // Direct Messaging navigation and target state
  const [isMessagesPageOpen, setIsMessagesPageOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [startChatTarget, setStartChatTarget] = useState<{
    targetUid: string;
    targetName: string;
    targetEmoji?: string;
  } | null>(null);

  // Loading state & Firestore error tracking
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [firestoreError, setFirestoreError] = useState(false);
  const [firestoreErrorType, setFirestoreErrorType] = useState<'permission' | 'generic' | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  // Monitor Auth State, fetch user profile, and prompt first-time profile creation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
        if (currentUser) {
          try {
            const p = await fetchUserProfile(currentUser.uid);
            setUserProfile(p);
            // Prompt "Choose your name" on first sign-in if no profile exists
            if (!p) {
              setIsProfileModalOpen(true);
            }
          } catch {
            // Ignore transient profile check failure on startup
          }
        } else {
          setUserProfile(null);
        }
      },
      () => {
        setUser(null);
        setUserProfile(null);
        setAuthReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Bounded one-time initial load for Venues, Promoters, and Upcoming Events
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const loadInitialCollections = async () => {
      setLoadingVenues(true);
      setLoadingEvents(true);
      setFirestoreError(false);
      setFirestoreErrorType(null);

      try {
        const [vData, pData, eData] = await Promise.all([
          fetchVenues(),
          fetchPromoters(),
          fetchEvents(),
        ]);
        if (cancelled) return;
        setVenues(vData);
        setPromoters(pData);
        setEvents(eData);
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message || err?.code || '').toLowerCase();
        setFirestoreError(true);
        setFirestoreErrorType(msg.includes('permission') ? 'permission' : 'generic');
      } finally {
        if (!cancelled) {
          setLoadingVenues(false);
          setLoadingEvents(false);
        }
      }
    };

    loadInitialCollections();
    return () => {
      cancelled = true;
    };
  }, [authReady, retryKey]);

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

      if (hash === '#/buddies' || hash === '#buddies' || path === '/buddies') {
        setIsBuddiesPageOpen(true);
      } else {
        setIsBuddiesPageOpen(false);
      }

      if (hash === '#/me' || hash === '#me' || path === '/me') {
        setIsProfilePageOpen(true);
      } else {
        setIsProfilePageOpen(false);
      }

      if (hash.startsWith('#/messages') || path.startsWith('/messages')) {
        setIsMessagesPageOpen(true);
        // Extract optional chatId query parameter: #/messages?chatId=...
        const queryIdx = hash.indexOf('chatId=');
        if (queryIdx !== -1) {
          const cid = hash.substring(queryIdx + 7).split('&')[0];
          setActiveChatId(cid);
        }
      } else {
        setIsMessagesPageOpen(false);
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

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn('Google sign-in failed:', err);
    }
  };

  const handleStartChat = (targetUid: string, targetName: string, targetEmoji?: string) => {
    if (!user) {
      handleGoogleSignIn();
      return;
    }
    if (!userProfile || !userProfile.ageConfirmed) {
      setIsProfileModalOpen(true);
      return;
    }
    setStartChatTarget({ targetUid, targetName, targetEmoji });
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

  const selectedEventVenue = useMemo(() => {
    if (!selectedEvent) return undefined;
    return activeVenues.find((v) => v.id === selectedEvent.venueId);
  }, [selectedEvent, activeVenues]);

  const selectedEventVenueName = useMemo(() => {
    return selectedEventVenue?.name;
  }, [selectedEventVenue]);

  const t = translations[lang];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none font-sans">
      {/* Top Header with TH/EN Toggle, Buddies, Profile, and Admin Button */}
      <Header
        venuesCount={activeVenues.length}
        eventsCount={filteredEvents.length}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenAdmin={handleOpenAdmin}
        onToggleList={() => setIsListDrawerOpen(!isListDrawerOpen)}
        isListOpen={isListDrawerOpen}
        isAdminSignedIn={isAdmin}
        onOpenBuddies={() => {
          setIsBuddiesPageOpen(true);
          window.location.hash = '/buddies';
        }}
        onOpenProfile={() => {
          if (!userProfile) {
            setIsProfileModalOpen(true);
          } else {
            setIsProfilePageOpen(true);
            window.location.hash = '/me';
          }
        }}
        onOpenMessages={() => {
          setIsMessagesPageOpen(true);
          window.location.hash = '/messages';
        }}
        profileEmoji={userProfile?.avatarEmoji}
        isSignedIn={Boolean(user)}
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
      <div className="fixed bottom-[76px] sm:bottom-6 left-1/2 -translate-x-1/2 z-600 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleViewMode}
          className="flex items-center gap-2.5 px-5 py-2.5 min-h-[44px] rounded-full bg-neutral-900/95 hover:bg-neutral-850 text-white font-bold text-xs tracking-wider uppercase border border-neutral-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer hover:border-lime-400 group"
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

      {/* Event Detail Sheet (Artists, Promoter link, Bangkok time, Buy tickets, View IG post, Buddy section) */}
      <EventDetailSheet
        event={selectedEvent}
        promoter={selectedEventPromoter}
        venue={selectedEventVenue}
        venueName={selectedEventVenueName}
        user={user}
        profile={userProfile}
        onProfileUpdated={setUserProfile}
        onOpenBuddyBoard={() => {
          setSelectedEvent(null);
          setIsBuddiesPageOpen(true);
          window.location.hash = '/buddies';
        }}
        onStartChat={handleStartChat}
        isAdmin={isAdmin}
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
        availableGenres={availableGenres}
        lang={lang}
      />

      {/* Offline & Firestore Error Banners */}
      <StatusBanners
        lang={lang}
        hasError={firestoreError}
        errorType={firestoreErrorType}
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

      {/* Privacy Policy Page Modal (Lazy-loaded) */}
      {isPrivacyOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-1000 bg-neutral-950/95 flex items-center justify-center text-xs font-mono text-neutral-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
              <span>{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</span>
            </div>
          }
        >
          <PrivacyPage lang={lang} onBack={handleClosePrivacy} />
        </Suspense>
      )}

      {/* Buddy Board Page (#/buddies, Lazy-loaded) */}
      {isBuddiesPageOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-1000 bg-neutral-950/95 flex items-center justify-center text-xs font-mono text-neutral-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
              <span>{t.community.loadingBuddies}</span>
            </div>
          }
        >
          <BuddyBoardPage
            user={user}
            profile={userProfile}
            events={activeEvents}
            onOpenEvent={(evtId) => {
              const ev = activeEvents.find((e) => e.id === evtId);
              if (ev) {
                setSelectedEvent(ev);
                setIsBuddiesPageOpen(false);
                window.location.hash = `/event/${evtId}`;
              }
            }}
            onBack={() => {
              setIsBuddiesPageOpen(false);
              window.location.hash = viewMode === 'list' ? '/list' : '';
            }}
            onRequestProfile={() => setIsProfileModalOpen(true)}
            onStartChat={handleStartChat}
            lang={lang}
            isAdmin={isAdmin}
          />
        </Suspense>
      )}

      {/* Profile Page (#/me, Lazy-loaded) */}
      {isProfilePageOpen && (
        user ? (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-1000 bg-neutral-950/95 flex items-center justify-center text-xs font-mono text-neutral-300 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
                <span>{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</span>
              </div>
            }
          >
            <ProfilePage
              user={user}
              profile={userProfile}
              onProfileUpdated={setUserProfile}
              onBack={() => {
                setIsProfilePageOpen(false);
                window.location.hash = viewMode === 'list' ? '/list' : '';
              }}
              availableGenres={availableGenres}
              lang={lang}
            />
          </Suspense>
        ) : (
          <div className="fixed inset-0 z-1000 bg-neutral-950 text-white flex flex-col items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-4">
              <Lock className="w-8 h-8 text-lime-400 mx-auto" />
              <h1 className="text-base font-bold text-white">{t.community.profileTitle}</h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t.community.signInToViewProfile}
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[44px]"
              >
                {t.community.signIn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfilePageOpen(false);
                  window.location.hash = viewMode === 'list' ? '/list' : '';
                }}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.community.backToMap}</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Direct Messages Page (#/messages, Lazy-loaded) */}
      {isMessagesPageOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-2000 bg-black/95 flex items-center justify-center text-xs font-mono text-neutral-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
              <span>{t.chat.loading}</span>
            </div>
          }
        >
          <MessagesPage
            user={user}
            userProfile={userProfile}
            lang={lang}
            initialChatId={activeChatId}
            onBackToMap={() => {
              setIsMessagesPageOpen(false);
              setActiveChatId(null);
              window.location.hash = viewMode === 'list' ? '/list' : '';
            }}
            onOpenProfileSetup={() => setIsProfileModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Start Chat Request Modal */}
      {startChatTarget && userProfile && (
        <StartChatModal
          isOpen={Boolean(startChatTarget)}
          onClose={() => setStartChatTarget(null)}
          callerProfile={userProfile}
          targetUid={startChatTarget.targetUid}
          targetName={startChatTarget.targetName}
          targetEmoji={startChatTarget.targetEmoji}
          lang={lang}
          onChatStarted={(cid) => {
            setActiveChatId(cid);
            setIsMessagesPageOpen(true);
            window.location.hash = `#/messages?chatId=${cid}`;
            setStartChatTarget(null);
          }}
        />
      )}

      {/* Initial / Prompted "Choose your name" Modal */}
      {isProfileModalOpen && user && (
        <ChooseProfileModal
          user={user}
          existingProfile={userProfile}
          isOpen={true}
          onClose={() => setIsProfileModalOpen(false)}
          onProfileSaved={(p) => {
            setUserProfile(p);
            setIsProfileModalOpen(false);
          }}
          availableGenres={availableGenres.length > 0 ? availableGenres : undefined}
          lang={lang}
        />
      )}

      {/* Admin Panel (Lazy-loaded, English console strictly restricted to wanthawatjx@gmail.com) */}
      {isAdminOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-2000 bg-neutral-950/95 flex items-center justify-center text-xs font-mono text-neutral-300 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-400" />
              <span>Loading Admin Console...</span>
            </div>
          }
        >
          <AdminPanel
            user={user}
            venues={activeVenues}
            promoters={activePromoters}
            events={activeEvents}
            onClose={handleCloseAdmin}
            editingVenueInitial={editingVenue}
            onDataChanged={handleRetry}
          />
        </Suspense>
      )}
    </div>
  );
}
