import {
  useState, useCallback, useMemo,
  useEffect, useRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import { MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Store & API
import { useApp } from '@/store/AppContext'
import { api } from '@/lib/api'

// Components
import { CrossSection } from '@/components/cross-section'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { SectionSidebar } from '@/components/dashboard/SectionSidebar'
import { BorewellCard } from '@/components/dashboard/BorewellCard'

// Utils & adapters
import { fetchElevations } from '@/components/dashboard/utils'
import { borewellToCSInput } from '@/lib/adapters'
import type { Borewell } from '@/types'

export default function MapDashboardPage() {
  const { state, dispatch } = useApp()

  // ── Elevation-fetched tracking (local UI state only) ──────────────────────
  // We track which borewell IDs have had elevation fetched this session.
  // The actual groundElevationMSL lives on the canonical Borewell in AppContext.
  const [elevationFetched, setElevationFetched] = useState<Set<string>>(new Set())
  const [loadingElevation, setLoadingElevation] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [orderedList, setOrderedList] = useState<Borewell[]>([])
  const [showCrossSection, setShowCrossSection] = useState(false)
  const [sectionTitle, setSectionTitle] = useState("Section A-A'")

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map())
  const hasFit = useRef(false)

  // Borewells come directly from AppContext — no local shadow state
  const borewells = state.borewells

  // ── Map Lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, { zoomControl: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    borewells.forEach(bw => {
      const isSelected = selectedIds.has(bw.id)
      const isFocused = focusedId === bw.id
      const marker = L.circleMarker([bw.latitude, bw.longitude], {
        radius: isFocused ? 10 : 8,
        fillColor: isSelected ? '#4fa898' : '#c9933a',
        color: isFocused ? '#f5ead0' : 'rgba(0,0,0,0.4)',
        fillOpacity: 0.8,
        weight: isFocused ? 3 : 1,
      }).on('click', () => setFocusedId(bw.id)).addTo(map)

      markersRef.current.set(bw.id, marker)
    })

    if (!hasFit.current && borewells.length > 0) {
      map.fitBounds(
        borewells.map(bw => [bw.latitude, bw.longitude] as L.LatLngTuple),
        { padding: [48, 48] }
      )
      hasFit.current = true
    }
  }, [borewells, selectedIds, focusedId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleBorewell = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setOrderedList(ol => ol.filter(bw => bw.id !== id))
      } else {
        next.add(id)
        const bw = borewells.find(b => b.id === id)
        if (bw) setOrderedList(ol => [...ol, bw])
      }
      return next
    })
  }, [borewells])

  const handleFetchElevation = useCallback(async () => {
    setLoadingElevation(true)
    try {
      // Build a lightweight list for the elevation fetcher
      const toFetch = borewells.map(bw => ({
        id: bw.id,
        lat: bw.latitude,
        lng: bw.longitude,
        groundElevationMSL: bw.groundElevationMSL ?? undefined,
        elevationFetched: elevationFetched.has(bw.id),
      }))
      const updated = await fetchElevations(toFetch)
      const newFetched = new Set(elevationFetched)
      for (const item of updated) {
        if (item.elevationFetched && item.groundElevationMSL != null) {
          newFetched.add(item.id)
          // Persist to backend + update AppContext
          api.patchBorewell(item.id, { groundElevationMSL: item.groundElevationMSL })
            .then(saved => dispatch({ type: 'UPDATE_BOREWELL', payload: saved }))
            .catch(console.error)
        }
      }
      setElevationFetched(newFetched)
    } finally {
      setLoadingElevation(false)
    }
  }, [borewells, elevationFetched, dispatch])

  const sectionBorewells = useMemo(
    () => orderedList.filter(bw => selectedIds.has(bw.id)),
    [orderedList, selectedIds]
  )

  // Map canonical Borewell[] → CrossSectionInput[] for the cross-section component
  const sectionInputs = useMemo(
    () => sectionBorewells.map(borewellToCSInput),
    [sectionBorewells]
  )

  const unfetchedCount = borewells.filter(bw => !elevationFetched.has(bw.id)).length

  return (
    <div className="flex flex-col h-screen bg-void overflow-hidden font-sans">
      <DashboardHeader
        unfetchedCount={unfetchedCount}
        loadingElevation={loadingElevation}
        onFetchElevation={handleFetchElevation}
      />

      <div className="flex flex-1 min-h-0">
        <SectionSidebar
          selectedIds={selectedIds}
          orderedList={orderedList}
          sectionTitle={sectionTitle}
          showCrossSection={showCrossSection}
          onReorder={setOrderedList}
          onTitleChange={setSectionTitle}
          onToggleGenerate={() => setShowCrossSection(v => !v)}
        />

        <main className="flex-1 relative min-w-0">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </main>

        <aside className="w-[320px] flex-shrink-0 border-l border-surface bg-deep-void flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface flex-shrink-0 bg-surface/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-core" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Borewell Directory</span>
            </div>
            <span className="text-[10px] font-mono text-text-muted bg-void px-2 py-0.5 rounded-full border border-surface">
              {borewells.length} sites
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {borewells.map(bw => (
              <BorewellCard
                key={bw.id}
                bw={bw}
                isSelected={selectedIds.has(bw.id)}
                isFocused={focusedId === bw.id}
                onToggle={() => toggleBorewell(bw.id)}
                onFocus={() => setFocusedId(id => id === bw.id ? null : bw.id)}
              />
            ))}
          </div>

          {selectedIds.size < 2 && (
            <div className="px-4 py-3 border-t border-surface bg-surface/5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-text-muted font-medium">Select 2+ borewells to enable section generation.</span>
            </div>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {showCrossSection && sectionInputs.length >= 2 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-surface bg-void overflow-hidden flex-shrink-0 relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20"
          >
            <button
              onClick={() => setShowCrossSection(false)}
              className="absolute top-4 right-6 z-30 p-2 rounded-xl bg-deep-void/90 border border-surface text-text-muted hover:text-foam hover:border-core/50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 overflow-x-auto">
              <CrossSection
                borewells={sectionInputs}
                width={Math.max(900, sectionInputs.length * 220)}
                height={440}
              />

              <div className="grid grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Selected Sites',       value: `${sectionInputs.length}` },
                  { label: 'Elevation Logic',       value: sectionInputs.every(b => b.groundElevationMSL) ? 'Persisted MSL' : 'Estimated', color: 'text-teal-light' },
                  { label: 'Max Profile Depth',     value: `${Math.max(...sectionInputs.map(b => b.totalDepthFt))} ft`, color: 'text-core' },
                  { label: 'Soil Classifications',  value: `${new Set(sectionInputs.flatMap(b => b.layers.map(l => l.material))).size}`, color: 'text-shallows' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl border border-surface bg-deep-void/50 p-4 hover:border-surface/80 transition-colors">
                    <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1 font-bold">{label}</p>
                    <p className={cn('text-base font-bold font-mono tracking-tight', color || 'text-foam')}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .leaflet-control-attribution { background: rgba(15,17,23,0.7) !important; color: #6b6455 !important; font-size: 9px !important; }
        .leaflet-bar a { background: #1a1d27 !important; color: #a09880 !important; border-color: #212532 !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(169, 214, 229, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(169, 214, 229, 0.2); }
      `}</style>
    </div>
  )
}
