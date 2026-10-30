/**
 * Map tile constants and configuration
 * Standard OpenStreetMap tiles with dark CSS filter applied only to tiles.
 */
export const MAP_CONFIG = {
  TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  MAX_ZOOM: 19,
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  TILE_FILTER_CSS: 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9) saturate(0.6)',
};
