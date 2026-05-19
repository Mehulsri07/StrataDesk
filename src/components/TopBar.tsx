import { motion } from 'framer-motion';
import { Menu, X, Download, Settings, Map as MapIcon, Layers, BarChart3, PanelRight, LayoutDashboard, Plus } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useNavigate, useLocation } from 'react-router';
import Logo from './Logo';
import type { ViewMode } from '@/types';

export default function TopBar() {
  const { state, dispatch, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-5"
      style={{
        background: 'rgba(0, 8, 20, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0, 119, 182, 0.25)',
        boxShadow: '0 1px 24px rgba(0, 8, 20, 0.8)',
      }}
    >
      {/* Left — Logo + Brand */}
      <div className="flex items-center gap-3 min-w-[200px]">
        {isRoot && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-mist/60 hover:text-frost hover:bg-ocean/10 transition-all duration-200"
          >
            {state.sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size={26} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-frost font-bold text-sm tracking-tight">Strata</span>
            <span className="text-gold font-bold text-sm tracking-tight">Desk</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0, 119, 182, 0.12)', border: '1px solid rgba(0, 119, 182, 0.2)' }}>
          <span className="text-sky text-[10px] font-medium tracking-wide">Geotechnical Platform</span>
        </div>
      </div>

      {/* Center — Navigation */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 rounded-xl"
        style={{ background: 'rgba(0, 18, 51, 0.8)', border: '1px solid rgba(0, 119, 182, 0.2)' }}>
        {isRoot && (
          <>
            <NavTab
              active={state.viewMode === 'map'}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'map' as ViewMode })}
              icon={<MapIcon className="w-3.5 h-3.5" />}
              label="Map"
            />
            <NavTab
              active={state.viewMode === 'cross-section'}
              onClick={() => {
                const n = state.borewells.filter(b => b.selectedForCrossSection && b.layers.length > 0).length;
                if (n < 2) { showToast('Select at least 2 borewells for cross-section view.', 'info'); return; }
                dispatch({ type: 'SET_VIEW_MODE', mode: 'cross-section' as ViewMode });
              }}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="Cross-Section"
            />
            <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(0, 119, 182, 0.3)' }} />
          </>
        )}
        <NavTab
          active={location.pathname === '/dashboard'}
          onClick={() => navigate('/dashboard')}
          icon={<LayoutDashboard className="w-3.5 h-3.5" />}
          label="Dashboard"
        />
        <NavTab
          active={location.pathname === '/import'}
          onClick={() => navigate('/import')}
          icon={<Plus className="w-3.5 h-3.5" />}
          label="Import"
        />
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5 min-w-[200px] justify-end">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full mr-1"
          style={{ background: 'rgba(0, 180, 216, 0.08)', border: '1px solid rgba(0, 180, 216, 0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky animate-pulse" />
          <span className="text-sky text-[10px] font-semibold tracking-wide">Live</span>
        </div>

        {isRoot && (
          <>
            <IconBtn
              active={state.bottomDrawerOpen}
              onClick={() => dispatch({ type: 'TOGGLE_BOTTOM_DRAWER' })}
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </IconBtn>
            <IconBtn
              active={state.rightPanelOpen}
              onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
              title="Inspector"
            >
              <PanelRight className="w-4 h-4" />
            </IconBtn>
          </>
        )}

        <IconBtn onClick={() => {}} title="Export">
          <Download className="w-4 h-4" />
        </IconBtn>
        <IconBtn onClick={() => {}} title="Settings">
          <Settings className="w-4 h-4" />
        </IconBtn>
      </div>
    </motion.header>
  );
}

function NavTab({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
      style={{
        color: active ? '#000814' : '#90E0EF',
        background: active ? 'linear-gradient(135deg, #D4AF37, #FFD700)' : 'transparent',
        boxShadow: active ? '0 2px 12px rgba(212, 175, 55, 0.35)' : 'none',
      }}
    >
      {!active && (
        <span className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0, 119, 182, 0.15)' }} />
      )}
      <span className="relative flex items-center gap-1.5">{icon}{label}</span>
    </button>
  );
}

function IconBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
      style={{
        color: active ? '#D4AF37' : '#90E0EF',
        background: active ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
        border: active ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0, 119, 182, 0.15)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
