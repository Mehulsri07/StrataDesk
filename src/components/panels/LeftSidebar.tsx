import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, ChevronRight, Clock, Ruler, Droplets } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { MapMode } from '@/types';

export default function LeftSidebar() {
  const { state, dispatch, setActiveBorewell } = useApp();

  const handleNewBorewell = () => {
    dispatch({ type: 'SET_ACTIVE_BOREWELL', id: null });
    dispatch({ type: 'SET_MAP_MODE', mode: 'pinpoint' as MapMode });
  };

  return (
    <AnimatePresence>
      {state.sidebarOpen && (
        <motion.aside
          initial={{ x: -380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed left-0 top-14 bottom-0 w-[340px] z-40 flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(0,18,51,0.97) 0%, rgba(0,8,20,0.99) 100%)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(0, 119, 182, 0.25)',
            boxShadow: '4px 0 32px rgba(0, 8, 20, 0.6)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(0, 119, 182, 0.2)' }}>
            <div>
              <h2 className="text-frost font-bold text-sm tracking-wide">Borewell Records</h2>
              <p className="text-mist/50 text-[10px] mt-0.5">{state.borewells.length} sites registered</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleNewBorewell}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
                color: '#000814',
                boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Site
            </motion.button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {state.borewells.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(0, 119, 182, 0.1)', border: '1px solid rgba(0, 119, 182, 0.2)' }}>
                  <MapPin className="w-7 h-7" style={{ color: '#0077B6' }} />
                </div>
                <p className="text-mist/60 text-sm font-medium">No borewell sites yet</p>
                <p className="text-mist/30 text-xs mt-1.5 leading-relaxed">
                  Click "New Site" then tap the map to place your first borewell
                </p>
              </div>
            )}

            {state.borewells.map(bw => {
              const isActive = bw.id === state.activeBorewellId;
              return (
                <motion.button
                  key={bw.id}
                  onClick={() => setActiveBorewell(bw.id)}
                  layout
                  className="w-full text-left p-4 rounded-2xl transition-all duration-200 group"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(2,62,138,0.6) 0%, rgba(0,119,182,0.2) 100%)'
                      : 'rgba(0, 18, 51, 0.5)',
                    border: isActive
                      ? '1px solid rgba(0, 180, 216, 0.4)'
                      : '1px solid rgba(0, 119, 182, 0.15)',
                    boxShadow: isActive ? '0 4px 20px rgba(0, 119, 182, 0.2)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, #D4AF37, #FFD700)'
                              : '#0077B6',
                            boxShadow: isActive ? '0 0 8px rgba(212, 175, 55, 0.6)' : 'none',
                          }}
                        />
                        <span className="text-sm font-semibold truncate"
                          style={{ color: isActive ? '#CAF0F8' : '#90E0EF' }}>
                          {bw.name}
                        </span>
                      </div>
                      <p className="text-[11px] truncate ml-4" style={{ color: 'rgba(144, 224, 239, 0.5)' }}>
                        {bw.location || 'No location set'}
                      </p>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 transition-transform mt-0.5"
                      style={{
                        color: isActive ? '#00B4D8' : 'rgba(144, 224, 239, 0.3)',
                        transform: isActive ? 'rotate(90deg)' : 'none',
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(0, 119, 182, 0.15)' }}>
                    <StatChip icon={<Ruler className="w-3 h-3" />} value={`${bw.totalDepth} ft`} />
                    <StatChip icon={<Droplets className="w-3 h-3" />} value={bw.waterLevel ? `${bw.waterLevel} ft` : 'N/A'} />
                    <StatChip icon={<Clock className="w-3 h-3" />} value={`${bw.layers.length} layers`} />
                  </div>

                  {/* Layer preview bar */}
                  {bw.layers.length > 0 && (
                    <div className="flex h-1.5 mt-3 rounded-full overflow-hidden gap-px">
                      {bw.layers.map((l, i) => (
                        <div
                          key={i}
                          className="h-full"
                          style={{
                            width: `${((l.endDepth - l.startDepth) / bw.totalDepth) * 100}%`,
                            background: l.color,
                            minWidth: 2,
                          }}
                        />
                      ))}
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

function StatChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: '#00B4D8' }}>{icon}</span>
      <span className="text-[10px] font-medium" style={{ color: 'rgba(144, 224, 239, 0.7)' }}>{value}</span>
    </div>
  );
}
