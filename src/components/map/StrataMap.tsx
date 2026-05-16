import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Navigation, Target } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { MapMode, SearchResult } from '@/types';

const PIN_SVG = `<svg width="48" height="60" viewBox="0 0 48 60">
  <ellipse cx="24" cy="56" rx="10" ry="3" fill="#000000" opacity="0.4" filter="blur(2px)"/>
  <path d="M24 0 C10 0 0 10 0 24 C0 38 24 58 24 58 C24 58 48 38 48 24 C48 10 38 0 24 0Z" fill="#1a1d27" stroke="#c9933a" stroke-width="2"/>
  <path d="M24 4 C14 4 6 12 6 22 C6 28 10 36 16 42 C20 46 24 50 24 50 C24 50 28 46 32 42 C38 36 42 28 42 22 C42 12 34 4 24 4Z" fill="#21253a"/>
  <circle cx="24" cy="22" r="8" fill="#d4a853"/>
  <circle cx="24" cy="22" r="4" fill="#ffffff"/>
  <line x1="24" y1="14" x2="24" y2="30" stroke="#0f1117" stroke-width="1.5"/>
  <line x1="16" y1="22" x2="32" y2="22" stroke="#0f1117" stroke-width="1.5"/>
</svg>`;

const ACTIVE_PIN_SVG = `<svg width="48" height="60" viewBox="0 0 48 60">
  <ellipse cx="24" cy="56" rx="12" ry="4" fill="#000000" opacity="0.4" filter="blur(3px)"/>
  <path d="M24 0 C10 0 0 10 0 24 C0 38 24 58 24 58 C24 58 48 38 48 24 C48 10 38 0 24 0Z" fill="#21253a" stroke="#d4a853" stroke-width="2.5" style="filter: drop-shadow(0 0 8px rgba(212,168,83,0.5))"/>
  <path d="M24 4 C14 4 6 12 6 22 C6 28 10 36 16 42 C20 46 24 50 24 50 C24 50 28 46 32 42 C38 36 42 28 42 22 C42 12 34 4 24 4Z" fill="#c9933a"/>
  <circle cx="24" cy="22" r="8" fill="#f0ddb0"/>
  <circle cx="24" cy="22" r="4" fill="#ffffff"/>
  <line x1="24" y1="14" x2="24" y2="30" stroke="#0f1117" stroke-width="1.5"/>
  <line x1="16" y1="22" x2="32" y2="22" stroke="#0f1117" stroke-width="1.5"/>
</svg>`;

const borewellIcon = L.divIcon({
  className: 'borewell-pin',
  html: PIN_SVG,
  iconSize: [48, 60],
  iconAnchor: [24, 60],
  popupAnchor: [0, -55],
});

const activeBorewellIcon = L.divIcon({
  className: 'borewell-pin active',
  html: ACTIVE_PIN_SVG,
  iconSize: [48, 60],
  iconAnchor: [24, 60],
  popupAnchor: [0, -55],
});

export default function StrataMap() {
  const { state, dispatch, setActiveBorewell, setPendingLatLng, toggleCrossSection, showToast } = useApp();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapModeRef = useRef<MapMode>(state.mapMode);
  const rightPanelOpenRef = useRef<boolean>(state.rightPanelOpen);
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mapModeRef.current = state.mapMode;
  }, [state.mapMode]);

  useEffect(() => {
    rightPanelOpenRef.current = state.rightPanelOpen;
  }, [state.rightPanelOpen]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([26.8467, 80.9462], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // Click handler
    map.on('click', (e) => {
      if (mapModeRef.current === 'pinpoint') {
        // Set pending location and switch mode — do NOT dispatch SET_ACTIVE_BOREWELL
        // because that action clears pendingLatLng in the reducer.
        setPendingLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
        setSearchQuery('');
        setSearchResults([]);
        dispatch({ type: 'SET_MAP_MODE', mode: 'browse' as MapMode });

        // Open the right panel if it's closed
        if (!rightPanelOpenRef.current) {
          dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
        }

        showToast('Location pinned — fill in the details on the right.', 'success');

        // Temporary pulse marker
        const pulseIcon = L.divIcon({
          className: 'pulse-marker',
          html: `<div style="width:40px;height:40px;background:rgba(201,147,58,0.25);border:2px solid #d4a853;border-radius:50%;animation:pinPulse 1.5s infinite;"></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        const tempMarker = L.marker(e.latlng, { icon: pulseIcon }).addTo(map);
        setTimeout(() => map.removeLayer(tempMarker), 3000);
      }
    });

    mapRef.current = map;

    // Expose on window so App.tsx can call invalidateSize after panel transitions
    (window as unknown as Record<string, unknown>)._leafletMap = map;

    return () => {
      map.remove();
      mapRef.current = null;
      delete (window as unknown as Record<string, unknown>)._leafletMap;
    };
  }, []);

  // Update markers when borewells change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    // Add new markers
    state.borewells.forEach(bw => {
      if (!bw.latitude || !bw.longitude) return;

      const isActive = bw.id === state.activeBorewellId;
      const marker = L.marker([bw.latitude, bw.longitude], {
        icon: isActive ? activeBorewellIcon : borewellIcon,
      }).addTo(map);

      const popupContent = `
        <div style="font-family:'Inter',sans-serif;padding:4px;min-width:200px;color:#e8e3d8;">
          <h3 style="margin:0 0 6px 0;color:#f5ead0;font-size:14px;font-weight:600;">${bw.name || 'Unnamed'}</h3>
          <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">${bw.location || 'No location'}</div>
          <div style="font-size:11px;opacity:0.8;margin-bottom:8px;">Depth: ${bw.totalDepth}ft | Dia: ${bw.diameter}"</div>
          <div style="font-size:10px;opacity:0.5;margin-bottom:10px;">${bw.layers.length} layers</div>
          <div style="display:flex;gap:6px;">
            <button onclick="window._strataSelectBorewell('${bw.id}')" style="flex:1;background:#c9933a;border:none;color:#0f1117;padding:5px 8px;border-radius:4px;cursor:pointer;font-family:'Inter';font-size:11px;font-weight:600;">Select</button>
            <button onclick="window._strataToggleCross('${bw.id}')" style="flex:1;background:rgba(232,227,216,0.08);border:1px solid rgba(232,227,216,0.15);color:#e8e3d8;padding:5px 8px;border-radius:4px;cursor:pointer;font-family:'Inter';font-size:11px;font-weight:500;">${bw.selectedForCrossSection ? 'Remove' : 'Cross-Sec'}</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current[bw.id] = marker;
    });
  }, [state.borewells, state.activeBorewellId]);

  // Expose callbacks to window for popup buttons
  useEffect(() => {
    (window as unknown as Record<string, unknown>)._strataSelectBorewell = (id: string) => {
      setActiveBorewell(id);
      mapRef.current?.closePopup();
    };
    (window as unknown as Record<string, unknown>)._strataToggleCross = (id: string) => {
      toggleCrossSection(id);
      // Removed closePopup() so users can select multiple borewells easily
    };
  }, [setActiveBorewell, toggleCrossSection]);

  // Pan to active borewell
  useEffect(() => {
    const map = mapRef.current;
    const active = state.borewells.find(b => b.id === state.activeBorewellId);
    if (map && active?.latitude && active?.longitude) {
      map.flyTo([active.latitude, active.longitude], 15, { duration: 1.2 });
    }
  }, [state.activeBorewellId]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      searchControllerRef.current?.abort();
      return;
    }
    setSearchLoading(true);
    try {
      searchControllerRef.current?.abort();
      searchControllerRef.current = new AbortController();
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=8&q=${encodeURIComponent(query)}`,
        {
          signal: searchControllerRef.current.signal,
          headers: { 'Accept-Language': 'en-IN,en;q=0.9' },
        }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        showToast('Search failed. Try again.', 'error');
      }
    }
    setSearchLoading(false);
  }, [showToast]);

  const selectSearchResult = useCallback((result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.5 });
    setPendingLatLng({ lat, lng });
    dispatch({ type: 'SET_MAP_MODE', mode: 'browse' as MapMode });
    setSearchQuery('');
    setSearchResults([]);
    showToast(`Navigated to: ${result.display_name.split(',')[0]}`, 'success');
  }, [showToast, setPendingLatLng, dispatch]);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => performSearch(val), 500);
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo([latitude, longitude], 14, { duration: 1.5 });
        showToast('Location found', 'success');
      },
      () => showToast('Could not get location', 'error')
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] w-full max-w-lg px-4 pointer-events-none">
        <div className="relative pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-shallows pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && (setSearchQuery(''), setSearchResults([]))}
              placeholder="Search city, village, road..."
              className="w-full py-2.5 pl-10 pr-24 rounded-xl text-sm text-foam placeholder:text-shallows/50 focus:outline-none focus:ring-2 focus:ring-core/50 transition-all duration-200"
              style={{
                background: 'rgba(15, 17, 23, 0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(232, 227, 216, 0.12)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-10 text-shallows hover:text-foam p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={getUserLocation}
              className="absolute right-2 text-shallows hover:text-foam p-1.5 rounded-lg hover:bg-white/5 transition-all"
              title="My Location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-glass-lg"
                style={{
                  background: 'rgba(22, 25, 32, 0.97)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(232, 227, 216, 0.12)',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectSearchResult(r)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-reef mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-foam text-sm font-medium">{r.display_name.split(',')[0]}</div>
                      <div className="text-shallows text-xs mt-0.5 line-clamp-1">{r.display_name}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {searchLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 py-3 text-center text-shallows text-sm rounded-xl"
              style={{ background: 'rgba(15, 17, 23, 0.92)', backdropFilter: 'blur(16px)' }}
            >
              Searching...
            </div>
          )}
        </div>
      </div>

      {/* Map Mode Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch({ type: 'SET_MAP_MODE', mode: 'browse' as MapMode })}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-glass ${
            state.mapMode === 'browse'
              ? 'bg-core text-foam'
              : 'bg-void/80 text-shallows hover:text-foam border border-white/10'
          }`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          <Navigation className="w-4 h-4" />
          Browse
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch({ type: 'SET_MAP_MODE', mode: 'pinpoint' as MapMode })}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-glass ${
            state.mapMode === 'pinpoint'
              ? 'bg-core text-foam'
              : 'bg-void/80 text-shallows hover:text-foam border border-white/10'
          }`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          <Target className="w-4 h-4" />
          Pinpoint
        </motion.button>
      </div>

      {/* Pinpoint mode indicator */}
      <AnimatePresence>
        {state.mapMode === 'pinpoint' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(201, 147, 58, 0.85)',
              backdropFilter: 'blur(16px)',
              color: '#0f1117',
              border: '1px solid rgba(212, 168, 83, 0.4)',
            }}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Tap on the map to place a new borewell
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Pinpoint cursor overlay */}
      {state.mapMode === 'pinpoint' && (
        <div className="absolute inset-0 z-[400] pointer-events-none"
          style={{ cursor: 'crosshair' }}
        />
      )}
    </div>
  );
}
