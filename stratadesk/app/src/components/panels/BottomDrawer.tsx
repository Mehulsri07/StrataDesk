import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, BarChart3, Layers, Check } from 'lucide-react';
import { useApp } from '@/store/AppContext';

export default function BottomDrawer() {
  const { state, dispatch, toggleCrossSection } = useApp();

  const selected = state.borewells.filter(b => b.selectedForCrossSection);
  const totalBorewells = state.borewells.length;
  const totalLayers = state.borewells.reduce((sum, b) => sum + b.layers.length, 0);
  const avgDepth = totalBorewells > 0
    ? (state.borewells.reduce((sum, b) => sum + b.totalDepth, 0) / totalBorewells).toFixed(1)
    : '0';

  const materialCounts: Record<string, number> = {};
  state.borewells.forEach(b => {
    b.layers.forEach(l => {
      materialCounts[l.material] = (materialCounts[l.material] || 0) + (l.endDepth - l.startDepth);
    });
  });
  const topMaterials = Object.entries(materialCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <AnimatePresence>
      {state.bottomDrawerOpen && (
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 bottom-0 z-[60]"
          style={{
            background: 'rgba(15, 17, 23, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(169, 214, 229, 0.12)',
            maxHeight: '40vh',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-reef" />
              <h3 className="text-foam text-sm font-semibold">Site Analytics</h3>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_BOTTOM_DRAWER' })}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-shallows hover:text-foam hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto">
            <div className="grid grid-cols-4 gap-4">
              {/* Metrics */}
              <MetricCard icon={<Layers className="w-5 h-5" />} value={totalBorewells} label="Borewells" />
              <MetricCard icon={<Layers className="w-5 h-5" />} value={totalLayers} label="Total Layers" />
              <MetricCard icon={<TrendingUp className="w-5 h-5" />} value={`${avgDepth} ft`} label="Avg Depth" />
              <MetricCard icon={<Check className="w-5 h-5" />} value={selected.length} label="In Cross-Sec" />
            </div>

            {/* Selected Borewells */}
            {selected.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <h4 className="text-tide text-xs font-semibold uppercase tracking-wider mb-3">Selected for Cross-Section</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.map(bw => (
                    <button
                      key={bw.id}
                      onClick={() => toggleCrossSection(bw.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-core/20 text-tide text-xs hover:bg-core/30 transition-colors border border-core/20"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      {bw.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Material Breakdown */}
            {topMaterials.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5">
                <h4 className="text-tide text-xs font-semibold uppercase tracking-wider mb-3">Material Composition</h4>
                <div className="flex items-end gap-4 h-24">
                  {topMaterials.map(([mat, depth]) => {
                    const maxVal = topMaterials[0][1];
                    const pct = (depth / maxVal) * 100;
                    const color = state.borewells.flatMap(b => b.layers).find(l => l.material === mat)?.color || '#c9933a';
                    return (
                      <div key={mat} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs text-shallows/60">{Math.round(depth)}ft</span>
                        <div
                          className="w-full rounded-t-md min-w-[32px]"
                          style={{
                            height: `${Math.max(pct, 10)}%`,
                            background: color,
                            opacity: 0.8,
                          }}
                        />
                        <span className="text-[10px] text-shallows/50 text-center leading-tight">{mat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="text-reef mb-2">{icon}</div>
      <div className="text-foam text-xl font-bold">{value}</div>
      <div className="text-shallows/50 text-xs mt-0.5">{label}</div>
    </div>
  );
}
