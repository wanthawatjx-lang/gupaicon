import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RotateCcw } from 'lucide-react';
import { Venue } from '../types/venue';
import { ConcertEvent } from '../types/event';
import { getVenueUrgentStatus, getStatusLabel, getStatusSymbol } from '../utils/statusUtils';
import { Language } from '../i18n';

// Bangkok & Pathum Thani boundary coordinates
const BANGKOK_PATHUM_BOUNDS = L.latLngBounds(
  L.latLng(13.40, 100.20),
  L.latLng(14.30, 100.95)
);

const DEFAULT_CENTER: [number, number] = [13.80, 100.55];
const DEFAULT_ZOOM = 11;
const CLUSTER_ZOOM_THRESHOLD = 11; // cluster at zoom 11 and below

interface MapProps {
  venues: Venue[];
  events?: ConcertEvent[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue | null) => void;
  lang?: Language;
}

export const Map: React.FC<MapProps> = ({
  venues,
  events = [],
  selectedVenue,
  onSelectVenue,
  lang = 'th',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
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

    // Add Zoom Control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Dark Matter tiles powered by OpenStreetMap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Create a LayerGroup for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Close bottom sheet on background click
    map.on('click', () => {
      onSelectVenue(null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Markers and Cluster on zoom out
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

      // If zoomed out, perform distance-based clustering
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

            // Group if within 45px of each other
            if (dist < 45) {
              cluster.venues.push(venue);
              // Recalculate cluster centroid
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

        // Draw clusters or single markers
        clusters.forEach((cluster) => {
          if (cluster.venues.length > 1) {
            // Cluster of multiple venues
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
              // Zoom into the cluster
              map.setView([cluster.centerLat, cluster.centerLng], currentZoom + 2, {
                animate: true,
              });
            });

            marker.addTo(markersLayer);
            return;
          }

          // Single venue inside cluster loop
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

      // Color + Icon + Symbol accessibility display
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
            <!-- Symbol + Icon for Color Blind & Accessibility -->
            <span class="text-xs font-bold leading-none select-none" style="color: ${color}">${symbol || '•'}</span>

            <!-- Upcoming Shows Badge -->
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

    // Re-render when map zoom changes (for cluster aggregation)
    map.on('zoomend', updateMarkers);
    return () => {
      map.off('zoomend', updateMarkers);
    };
  }, [venues, events, selectedVenue, onSelectVenue, lang]);

  // Center on selected venue if it changes externally
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
    </div>
  );
};
