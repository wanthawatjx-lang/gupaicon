import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RotateCcw } from 'lucide-react';
import { Venue } from '../types/venue';

// Bangkok & Pathum Thani boundary coordinates
// Southwest: [13.40, 100.20] (South Bangkok / Gulf boundary)
// Northeast: [14.30, 100.95] (North Pathum Thani / Ayutthaya boundary)
const BANGKOK_PATHUM_BOUNDS = L.latLngBounds(
  L.latLng(13.40, 100.20),
  L.latLng(14.30, 100.95)
);

const DEFAULT_CENTER: [number, number] = [13.80, 100.55];
const DEFAULT_ZOOM = 11;

interface MapProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  onSelectVenue: (venue: Venue | null) => void;
}

export const Map: React.FC<MapProps> = ({ venues, selectedVenue, onSelectVenue }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

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
      zoomControl: false, // Custom position for mobile friendliness
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

  // Update Markers when venues list or selected venue changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    venues.forEach((venue) => {
      if (typeof venue.lat !== 'number' || typeof venue.lng !== 'number') return;
      if (isNaN(venue.lat) || isNaN(venue.lng)) return;

      const isSelected = selectedVenue?.id === venue.id;

      // Custom Music-Poster Style HTML Pin Icon
      const iconHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 48px; height: 48px;">
          <!-- Pulse ring when selected -->
          ${
            isSelected
              ? '<span class="absolute inline-flex h-11 w-11 rounded-full bg-lime-400/40 animate-ping"></span>'
              : ''
          }
          <!-- Outer Badge -->
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full transition-transform duration-150 ${
            isSelected
              ? 'bg-lime-400 text-black scale-110 shadow-[0_0_20px_rgba(163,230,53,0.8)] ring-2 ring-white'
              : 'bg-neutral-900 text-lime-400 hover:scale-105 border-2 border-lime-400/80 shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
          }">
            <!-- Music Vinyl / Livehouse icon -->
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <!-- Little arrow pointer under circle -->
          <div class="absolute -bottom-1 w-2 h-2 rotate-45 ${
            isSelected ? 'bg-lime-400' : 'bg-neutral-900 border-r border-b border-lime-400/80'
          }"></div>
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
        title: venue.name,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectVenue(venue);
        map.panTo([venue.lat, venue.lng], { animate: true, duration: 0.5 });
      });

      marker.addTo(map);
      markersRef.current[venue.id] = marker;
    });
  }, [venues, selectedVenue, onSelectVenue]);

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
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900/90 text-neutral-200 hover:text-white hover:bg-neutral-800 border border-neutral-700/70 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Reset map view to Bangkok center"
          aria-label="Reset map view"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
