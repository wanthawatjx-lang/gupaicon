import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RotateCcw, Sparkles, Calendar, Ticket, ChevronRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import { User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Venue } from '../types/venue';
import { ConcertEvent } from '../types/event';
import { getVenueUrgentStatus, getStatusLabel, getStatusSymbol } from '../utils/statusUtils';
import { formatBangkokDateTime } from '../utils/dateUtils';
import { MAP_CONFIG } from '../constants/mapConfig';
import { Language } from '../i18n';

// Bangkok & Pathum Thani boundary coordinates
const BANGKOK_PATHUM_BOUNDS = L.latLngBounds(
  L.latLng(13.40, 100.20),
  L.latLng(14.30, 100.95)
);

const DEFAULT_CENTER: [number, number] = [13.80, 100.55];
const DEFAULT_ZOOM = 11;
const CLUSTER_ZOOM_THRESHOLD = 11;

interface AiEventPreview {
  vibeSummary: string;
  lineupHighlights: string[];
  crowdAtmosphere: string;
  practicalTip: string;
}

interface MapProps {
  venues: Venue[];
  events?: ConcertEvent[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue | null) => void;
  onSelectEvent?: (event: ConcertEvent) => void;
  onClearFilters?: () => void;
  lang?: Language;
  user?: User | null;
}

export const Map: React.FC<MapProps> = ({
  venues,
  events = [],
  selectedVenue,
  onSelectVenue,
  onSelectEvent,
  onClearFilters,
  lang = 'th',
  user = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Quick Map Event Preview state
  const [previewEvent, setPreviewEvent] = useState<ConcertEvent | null>(null);
  const [aiPreview, setAiPreview] = useState<AiEventPreview | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Automatically select the first upcoming event for preview when selectedVenue changes
  useEffect(() => {
    if (selectedVenue) {
      const venueEvents = events.filter((e) => e.venueId === selectedVenue.id);
      if (venueEvents.length > 0) {
        setPreviewEvent(venueEvents[0]);
      } else {
        setPreviewEvent(null);
      }
      setAiPreview(null);
      setAiError(null);
    } else {
      setPreviewEvent(null);
      setAiPreview(null);
      setAiError(null);
    }
  }, [selectedVenue, events]);

  // Fetch AI Event Vibe preview using the server-side geminiClient route
  const handleFetchAiPreview = async (event: ConcertEvent) => {
    if (!user) return;
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/event-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          lang,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error ||
            (lang === 'th'
              ? 'ไม่สามารถดึงข้อมูล AI Vibe ได้ กรุณาลองใหม่อีกครั้ง'
              : 'Failed to load AI vibe preview. Please try again.')
        );
      }

      if (data.success && data.preview) {
        setAiPreview(data.preview);
      } else {
        throw new Error(data.error || 'Preview unavailable');
      }
    } catch (err: any) {
      setAiError(err?.message || (lang === 'th' ? 'ไม่สามารถดึงข้อมูล AI Vibe ได้' : 'Could not fetch AI preview'));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: BANGKOK_PATHUM_BOUNDS,
      maxBoundsViscosity: 0.9,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer(MAP_CONFIG.TILE_URL, {
      attribution: MAP_CONFIG.ATTRIBUTION,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    map.on('click', () => {
      onSelectVenue(null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Markers and Cluster on zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    const updateMarkers = () => {
      markersLayer.clearLayers();

      const currentZoom = map.getZoom();
      const validVenues = venues.filter(
        (v) =>
          typeof v.lat === 'number' &&
          typeof v.lng === 'number' &&
          !isNaN(v.lat) &&
          !isNaN(v.lng)
      );

      // Distance-based clustering when zoomed out
      if (currentZoom <= CLUSTER_ZOOM_THRESHOLD && validVenues.length > 2) {
        const clusters: {
          venues: Venue[];
          centerLat: number;
          centerLng: number;
        }[] = [];

        validVenues.forEach((venue) => {
          const pt = map.latLngToLayerPoint([venue.lat, venue.lng]);
          let added = false;

          for (const cluster of clusters) {
            const clusterPt = map.latLngToLayerPoint([cluster.centerLat, cluster.centerLng]);
            const dist = pt.distanceTo(clusterPt);

            if (dist < 45) {
              cluster.venues.push(venue);
              cluster.centerLat =
                cluster.venues.reduce((acc, v) => acc + v.lat, 0) / cluster.venues.length;
              cluster.centerLng =
                cluster.venues.reduce((acc, v) => acc + v.lng, 0) / cluster.venues.length;
              added = true;
              break;
            }
          }

          if (!added) {
            clusters.push({
              venues: [venue],
              centerLat: venue.lat,
              centerLng: venue.lng,
            });
          }
        });

        clusters.forEach((cluster) => {
          if (cluster.venues.length > 1) {
            const clusterEvents = events.filter((e) =>
              cluster.venues.some((v) => v.id === e.venueId)
            );
            const { color, upcomingCount } = getVenueUrgentStatus(clusterEvents);

            const clusterHtml = `
              <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 48px; height: 48px;" aria-label="Cluster of ${cluster.venues.length} venues, ${upcomingCount} shows">
                <div class="relative flex items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-transform duration-150 hover:scale-110 active:scale-95" style="background-color: #121214; border: 2.5px solid ${color}; box-shadow: 0 0 16px ${color}77;">
                  <span class="text-xs font-mono font-bold text-white">${cluster.venues.length}</span>
                  ${
                    upcomingCount > 0
                      ? `<span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold text-black border border-black" style="background-color: ${color};">${upcomingCount}</span>`
                      : ''
                  }
                </div>
              </div>
            `;

            const clusterIcon = L.divIcon({
              className: 'custom-venue-pin',
              html: clusterHtml,
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            });

            const marker = L.marker([cluster.centerLat, cluster.centerLng], {
              icon: clusterIcon,
              title: `${cluster.venues.length} venues (${upcomingCount} shows)`,
            });

            marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              map.setView([cluster.centerLat, cluster.centerLng], currentZoom + 2, {
                animate: true,
              });
            });

            marker.addTo(markersLayer);
            return;
          }

          renderSingleVenueMarker(cluster.venues[0]);
        });

        return;
      }

      // Normal individual markers
      validVenues.forEach((venue) => {
        renderSingleVenueMarker(venue);
      });
    };

    const renderSingleVenueMarker = (venue: Venue) => {
      const isSelected = selectedVenue?.id === venue.id;
      const venueEvents = events.filter((e) => e.venueId === venue.id);
      const { status, color, upcomingCount, symbol } = getVenueUrgentStatus(venueEvents);
      const statusLabel = getStatusLabel(status, lang);

      const iconHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 48px; height: 48px;" role="button" aria-label="${venue.name}: ${statusLabel} (${upcomingCount} shows)" tabindex="0">
          ${
            isSelected
              ? `<span class="absolute inline-flex h-12 w-12 rounded-full opacity-60 animate-ping" style="background-color: ${color}"></span>`
              : ''
          }
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full transition-transform duration-150 ${
            isSelected
              ? 'scale-115 shadow-2xl ring-2 ring-white'
              : 'hover:scale-105 shadow-lg'
          }" style="background-color: #0d0d0f; border: 2.5px solid ${color}; box-shadow: 0 0 14px ${color}66;">
            <span class="text-xs font-bold leading-none select-none" style="color: ${color}">${symbol || '•'}</span>
            ${
              upcomingCount > 0
                ? `<span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-mono font-bold text-black border border-black" style="background-color: ${color};">${upcomingCount}</span>`
                : ''
            }
          </div>
          <div class="absolute -bottom-1 w-2.5 h-2.5 rotate-45" style="background-color: #0d0d0f; border-right: 2px solid ${color}; border-bottom: 2px solid ${color};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: iconHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([venue.lat, venue.lng], {
        icon: customIcon,
        title: `${venue.name} • ${symbol} ${statusLabel} (${upcomingCount} shows)`,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectVenue(venue);
        map.panTo([venue.lat, venue.lng], { animate: true, duration: 0.5 });
      });

      marker.addTo(markersLayer);
    };

    updateMarkers();

    map.on('zoomend', updateMarkers);
    return () => {
      map.off('zoomend', updateMarkers);
    };
  }, [venues, events, selectedVenue, onSelectVenue, lang]);

  // Center on selected venue
  useEffect(() => {
    if (selectedVenue && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedVenue.lat, selectedVenue.lng], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedVenue]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      onSelectVenue(null);
    }
  };

  const selectedVenueEvents = selectedVenue
    ? events.filter((e) => e.venueId === selectedVenue.id)
    : [];

  return (
    <div className="relative w-full h-full">
      {/* Full-screen Leaflet container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Recenter button floating on map */}
      <div className="absolute top-16 right-3 z-500">
        <button
          type="button"
          onClick={handleResetView}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-900/90 text-neutral-200 hover:text-white hover:bg-neutral-800 border border-neutral-700/70 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title={lang === 'th' ? 'รีเซ็ตมุมมองแผนที่' : 'Reset map view'}
          aria-label={lang === 'th' ? 'รีเซ็ตมุมมองแผนที่' : 'Reset map view'}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Empty State Overlay when no markers match the active filter */}
      {venues.length === 0 && (
        <div className="absolute inset-x-4 top-36 sm:top-28 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-500 pointer-events-auto">
          <div className="p-4 rounded-2xl bg-neutral-950/95 border border-neutral-800 text-center shadow-2xl backdrop-blur-md">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white mb-1">
              {lang === 'th' ? 'ไม่พบร้านหรือคอนเสิร์ตที่ตรงกับตัวกรอง' : 'No matching venues found'}
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              {lang === 'th'
                ? 'ลองเปลี่ยนวันที่ ค้นหาคำอื่น หรือรีเซ็ตตัวกรองเพื่อดูสถานที่ทั้งหมด'
                : 'Try adjusting your date range, search query, or clear filters.'}
            </p>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs cursor-pointer shadow-md active:scale-95 transition-all"
              >
                {lang === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Interactive Event Preview Card on Selected Marker */}
      {selectedVenue && (
        <div className="absolute top-36 sm:top-28 left-3 right-3 sm:left-4 sm:right-auto sm:w-[380px] z-500 pointer-events-auto animate-in fade-in slide-in-from-top-2">
          <div className="p-3.5 rounded-2xl bg-neutral-950/95 border border-neutral-800/90 shadow-2xl backdrop-blur-md flex flex-col gap-2.5">
            {/* Header: Venue Name & Close */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-lime-400 tracking-wider">
                  {lang === 'th' ? 'สถานที่ที่เลือก' : 'Selected Venue'}
                </span>
                <h3 className="text-sm font-bold text-white leading-tight">{selectedVenue.name}</h3>
                <p className="text-[11px] text-neutral-400 truncate max-w-[280px]">
                  {selectedVenue.address || (lang === 'th' ? 'กรุงเทพฯ / ปทุมธานี' : 'Bangkok / Pathum Thani')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectVenue(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Preview Body: Loaded vs Empty State */}
            {previewEvent ? (
              <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-neutral-100 line-clamp-1">{previewEvent.title}</h4>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-lime-400/10 text-lime-400 border border-lime-400/30">
                    {previewEvent.status === 'sold_out' ? 'SOLD OUT' : 'UPCOMING'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-300">
                  <Calendar className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span>{formatBangkokDateTime(previewEvent.startAt, lang)}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {previewEvent.artists.slice(0, 3).map((a) => (
                    <span
                      key={a}
                      className="px-1.5 py-0.5 rounded-md bg-neutral-800 text-[10px] text-neutral-300 font-medium"
                    >
                      {a}
                    </span>
                  ))}
                  {previewEvent.artists.length > 3 && (
                    <span className="text-[10px] text-neutral-500 self-center">
                      +{previewEvent.artists.length - 3}
                    </span>
                  )}
                </div>

                {/* AI Vibe Check Section */}
                {!user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                      } catch (err) {
                        console.error('Sign in failed:', err);
                      }
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700/80 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                    <span className="text-[11px]">
                      {lang === 'th' ? 'เข้าสู่ระบบเพื่อดู AI preview' : 'Sign in to see the AI preview'}
                    </span>
                  </button>
                ) : aiPreview ? (
                  <div className="mt-1 p-2 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs flex flex-col gap-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-lime-400 font-semibold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'บรรยากาศและ Vibe โดย AI:' : 'AI Vibe Breakdown:'}</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 italic leading-relaxed">
                      "{aiPreview.vibeSummary}"
                    </p>
                    <div className="text-[10px] text-neutral-400 bg-neutral-900/60 p-1.5 rounded-md border border-neutral-850">
                      💡 <strong className="text-neutral-300">{lang === 'th' ? 'ทริปไปคอน:' : 'Tip:'}</strong>{' '}
                      {aiPreview.practicalTip}
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="mt-1 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-[11px] text-red-300 flex items-center justify-between">
                    <span>{aiError}</span>
                    <button
                      type="button"
                      onClick={() => handleFetchAiPreview(previewEvent)}
                      className="flex items-center gap-1 text-[10px] font-bold text-white hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {lang === 'th' ? 'ลองใหม่' : 'Retry'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFetchAiPreview(previewEvent)}
                    disabled={isLoadingAi}
                    className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700/80 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-lime-400" />
                        <span className="text-[11px]">
                          {lang === 'th' ? 'กำลังวิเคราะห์ Vibe...' : 'Analyzing Vibe...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                        <span className="text-[11px]">
                          {lang === 'th' ? 'เช็ค Vibe งานนี้ (Gemini AI)' : 'Check Vibe (Gemini AI)'}
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* Open Full Event Details action */}
                {onSelectEvent && (
                  <button
                    type="button"
                    onClick={() => onSelectEvent(previewEvent)}
                    className="mt-1 flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-750 text-xs font-semibold text-lime-400 hover:text-lime-300 transition-colors cursor-pointer"
                  >
                    <span>{lang === 'th' ? 'ดูรายละเอียดงานเต็ม' : 'View Full Event Details'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 text-center text-xs text-neutral-400">
                {lang === 'th'
                  ? 'ยังไม่มีการแสดงที่ตรงกับตัวกรองในร้านนี้'
                  : 'No upcoming shows matching current filter for this venue.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
