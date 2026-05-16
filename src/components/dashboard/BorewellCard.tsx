import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Square, AlertTriangle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import StrataChart from '@/components/chart/StrataChart'
import type { Borewell } from '@/types'

interface BorewellCardProps {
  bw: Borewell
  isSelected: boolean
  isFocused: boolean
  onToggle: () => void
  onFocus: () => void
}

export function BorewellCard({ bw, isSelected, isFocused, onToggle, onFocus }: BorewellCardProps) {
  const date = new Date(bw.createdAt).toLocaleDateString()
  
  return (
    <motion.div layout className={cn(
      'rounded-xl border transition-all duration-300 overflow-hidden', 
      isFocused ? 'border-reef/50 bg-surface/60' : 'border-surface bg-deep-void hover:border-surface/80'
    )}>
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2 cursor-pointer" onClick={onFocus}>
        <button 
          onClick={e => { e.stopPropagation(); onToggle() }} 
          className={cn('mt-0.5 flex-shrink-0 transition-colors', isSelected ? 'text-core' : 'text-text-muted hover:text-foam')}
        >
          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-foam truncate">{bw.name || 'Unnamed'}</p>
            <span className="text-[9px] font-mono text-text-muted">{date}</span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5 truncate flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {bw.location || 'No address'}
          </p>
          
          <div className="flex items-center gap-1.5 mt-2">
            {bw.groundElevationMSL ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-light/10 text-teal-light border border-teal-light/20">
                {bw.groundElevationMSL.toFixed(1)}m MSL
              </span>
            ) : (
              <span className="text-[9px] text-amber-400/80 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> No elevation
              </span>
            )}
            <span className="text-[9px] text-text-muted">·</span>
            <span className="text-[9px] text-text-muted font-mono">{bw.totalDepth} ft</span>
            <span className="text-[9px] text-text-muted">·</span>
            <span className="text-[9px] text-text-muted font-mono">{bw.diameter}"</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFocused ? (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="px-3 pb-4 border-t border-surface/50 mt-1 pt-4 bg-void/40"
          >
            <div className="mb-4">
              <StrataChart borewell={bw} compact={true} />
            </div>
            
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-2">Detailed Profile</p>
              {bw.layers.map((layer) => (
                <div key={layer.id} className="flex gap-2.5 group">
                  <div className="w-1.5 self-stretch rounded-full shadow-inner" style={{ backgroundColor: layer.color }} />
                  <div className="flex-1 min-w-0 border-b border-surface/20 pb-1.5 group-last:border-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[10px] text-foam font-medium truncate">{layer.material}</span>
                      <span className="text-[9px] text-text-muted font-mono">{layer.startDepth}-{layer.endDepth} ft</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onFocus(); }} 
              className="w-full mt-4 py-2 rounded-lg border border-surface bg-surface/30 text-[10px] text-text-muted hover:text-foam hover:bg-surface/50 transition-all uppercase tracking-widest font-bold"
            >
              Collapse Details
            </button>
          </motion.div>
        ) : (
          <div className="px-3 pb-3">
             <MiniStrataPreview layers={bw.layers} totalDepth={bw.totalDepth} />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function MiniStrataPreview({ layers, totalDepth }: { layers: any[], totalDepth: number }) {
  if (!layers.length) return <div className="h-1.5 w-full bg-surface/20 rounded" />
  
  return (
    <div className="flex h-1.5 w-full rounded overflow-hidden gap-[0.5px] bg-void border border-surface/30">
      {layers.map((l, i) => {
        const thickness = l.endDepth - l.startDepth
        return (
          <div 
            key={i} 
            title={`${l.material} (${l.startDepth}-${l.endDepth} ft)`} 
            style={{ 
              width: `${(thickness / totalDepth) * 100}%`, 
              backgroundColor: l.color, 
              minWidth: 1 
            }} 
          />
        )
      })}
    </div>
  )
}
