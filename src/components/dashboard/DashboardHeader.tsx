import { Mountain, Zap, Plus } from 'lucide-react'
import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router'

interface DashboardHeaderProps {
  unfetchedCount: number
  loadingElevation: boolean
  onFetchElevation: () => void
}

export function DashboardHeader({
  unfetchedCount,
  loadingElevation,
  onFetchElevation
}: DashboardHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-surface bg-deep-void flex-shrink-0">
      <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 rounded-lg bg-core/10 flex items-center justify-center text-core border border-core/20 group-hover:bg-core group-hover:text-void transition-all duration-300">
          <Mountain className="w-5 h-5" />
        </div>
        <div>
          <span className="font-display text-lg text-foam font-bold tracking-tight">
            STRATA<span className="text-core">DESK</span>
          </span>
          <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] -mt-1 opacity-60 font-medium">Borewell Analytics</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {unfetchedCount > 0 && (
          <button 
            onClick={onFetchElevation} 
            disabled={loadingElevation} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-600/30 bg-amber-600/8 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600/15 disabled:opacity-60 transition-all active:scale-95"
          >
            {loadingElevation ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Fetch elevation ({unfetchedCount})
          </button>
        )}
        
        <button 
          onClick={() => navigate("/import")} 
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-core hover:bg-shoal text-void text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-core/20 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Import Borewell
        </button>
      </div>
    </header>
  )
}
