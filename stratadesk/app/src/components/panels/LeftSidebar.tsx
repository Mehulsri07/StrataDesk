import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, ChevronRight, Clock, Ruler, Droplets } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { MapMode } from '@/types';

export default function LeftSidebar() {
  const { state, dispatch, setActiveBorewell } = useApp();

  const handleNewBorewell = () => {
    // Open the right panel so the form is visible
    if (!state.rightPanelOpen) {
      dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
    }
    dispatch({ type: 'SET_ACTIVE_BOREWELL', id: null });
    dispatch({ type: 'SET_PENDING_LATLNG', payload: null });
    dispatch({ type: 'SET_MAP_MODE', mode: 'pinpoint' as MapMode });
  };

  return (
    <AnimatePresence>
      {state.sidebarOpen && (
        <motion.aside
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-14 bottom-0 w-[360px] z-40 flex flex-col overflow-hidden"
          style={{
            background: 'rgba(1, 42, 74, 0.8)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(169, 214, 229, 0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-foam font-semibold text-sm tracking-wide uppercase">Borewells</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewBorewell}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-core/30 text-foam text-xs font-medium hover:bg-core/50 transition-colors border border-core/30"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </motion.button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {state.borewells.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-shallows/30" />
                </div>
                <p className="text-shallows/50 text-sm">No borewells yet</p>
                <p className="text-shallows/30 text-xs mt-1">Click "New" to add one</p>
              </div>
            )}
            {state.borewells.map(bw => {
              const isActive = bw.id === state.activeBorewellId;
              return (
                <motion.button
                  key={bw.id}
                  onClick={() => setActiveBorewell(bw.id)}
                  layout
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-core/30 border border-core/40'
                      : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: isActive ? '#a9d6e5' : '#468faf',
                            boxShadow: isActive ? '0 0 8px rgba(169,214,229,0.4)' : 'none',
                          }}
                        />
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-foam' : 'text-tide'}`}>
                          {bw.name}
                        </span>
                      </div>
                      <p className="text-shallows/60 text-xs mt-1 truncate">{bw.location}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'text-foam rotate-90' : 'text-shallows/30 group-hover:text-shallows/50'}`} />
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-3 h-3 text-reef" />
                      <span className="text-xs text-shallows/70">{bw.totalDepth} ft</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-3 h-3 text-reef" />
                      <span className="text-xs text-shallows/70">{bw.waterLevel ? `${bw.waterLevel} ft` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-reef" />
                      <span className="text-xs text-shallows/70">{bw.layers.length} layers</span>
                    </div>
                  </div>

                  {/* Layer preview bar */}
                  {bw.layers.length > 0 && (
                    <div className="flex h-1.5 mt-3 rounded-full overflow-hidden">
                      {bw.layers.map((l, i) => {
                        const total = l.endDepth - l.startDepth;
                        return (
                          <div
                            key={i}
                            className="h-full"
                            style={{
                              width: `${(total / bw.totalDepth) * 100}%`,
                              background: l.color,
                              minWidth: 2,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
