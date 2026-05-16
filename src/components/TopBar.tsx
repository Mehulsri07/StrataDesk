import { motion } from 'framer-motion';
import { Menu, X, Download, Settings, Map as MapIcon, Layers, Crosshair, PanelRight, LayoutDashboard, Plus } from 'lucide-react';
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
      transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-4"
      style={{
        background: 'rgba(15, 17, 23, 0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(169, 214, 229, 0.12)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-shallows hover:text-foam hover:bg-white/5 transition-all duration-200"
        >
          {state.sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Logo size={28} />
        <div className="flex items-baseline gap-2">
          <h1 className="text-foam font-semibold text-base tracking-wide">StrataDesk</h1>
          <span className="text-shallows text-xs hidden sm:inline">Field Report — Sector 7</span>
        </div>
      </div>

      {/* Center - Navigation */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(169, 214, 229, 0.06)' }}
      >
        {/* Map / Cross-Section tabs — only shown on the main workspace */}
        {isRoot && (
          <>
            <ViewTab
              active={state.viewMode === 'map'}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'map' as ViewMode })}
              icon={<MapIcon className="w-4 h-4" />}
              label="Map"
            />
            <ViewTab
              active={state.viewMode === 'cross-section'}
              onClick={() => {
                const selectedCount = state.borewells.filter(b => b.selectedForCrossSection && b.layers.length > 0).length;
                if (selectedCount < 2) {
                  showToast('Select at least 2 borewells for cross-section view.', 'info');
                  return;
                }
                dispatch({ type: 'SET_VIEW_MODE', mode: 'cross-section' as ViewMode });
              }}
              icon={<Layers className="w-4 h-4" />}
              label="Cross-Section"
            />
            <div className="w-px h-5 bg-white/10 mx-1" />
          </>
        )}
        <NavTab
          active={location.pathname === '/dashboard'}
          onClick={() => navigate('/dashboard')}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Dashboard"
        />
        <NavTab
          active={location.pathname === '/import'}
          onClick={() => navigate('/import')}
          icon={<Plus className="w-4 h-4" />}
          label="Import"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-xs font-medium">Connected</span>
        </div>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_BOTTOM_DRAWER' })}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
            state.bottomDrawerOpen ? 'bg-core text-foam' : 'text-shallows hover:text-foam hover:bg-white/5'
          }`}
          title="Toggle Analytics"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
            state.rightPanelOpen ? 'bg-core text-foam' : 'text-shallows hover:text-foam hover:bg-white/5'
          }`}
          title="Toggle Inspector"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-shallows hover:text-foam hover:bg-white/5 transition-all duration-200"
          title="Export PDF"
        >
          <Download className="w-4 h-4" />
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-shallows hover:text-foam hover:bg-white/5 transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </motion.header>
  );
}

function ViewTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active ? 'text-foam' : 'text-shallows hover:text-tide'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeViewTab"
          className="absolute inset-0 rounded-lg"
          style={{ background: 'rgba(42, 111, 151, 0.5)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}

function NavTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active ? 'text-foam' : 'text-shallows hover:text-tide'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeNavTab"
          className="absolute inset-0 rounded-lg"
          style={{ background: 'rgba(42, 111, 151, 0.5)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
