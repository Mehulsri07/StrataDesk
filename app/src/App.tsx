import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useApp, AppProvider } from '@/store/AppContext';
import TopBar from '@/components/TopBar';
import LeftSidebar from '@/components/panels/LeftSidebar';
import RightPanel from '@/components/panels/RightPanel';
import BottomDrawer from '@/components/panels/BottomDrawer';
import StrataMap from '@/components/map/StrataMap';
import CrossSection from '@/components/charts/CrossSection';
import ToastContainer from '@/components/ToastContainer';
import './App.css';

function Workspace() {
  const { state, dispatch } = useApp();

  // Tell Leaflet to recalculate its size after any panel transition finishes.
  // We watch the three panel states and fire invalidateSize after the
  // 500 ms CSS transition completes so the tile grid fills the new bounds.
  const prevLayout = useRef({
    sidebarOpen: state.sidebarOpen,
    rightPanelOpen: state.rightPanelOpen,
    bottomDrawerOpen: state.bottomDrawerOpen,
  });

  useEffect(() => {
    const changed =
      prevLayout.current.sidebarOpen     !== state.sidebarOpen     ||
      prevLayout.current.rightPanelOpen  !== state.rightPanelOpen  ||
      prevLayout.current.bottomDrawerOpen !== state.bottomDrawerOpen;

    if (!changed) return;

    prevLayout.current = {
      sidebarOpen: state.sidebarOpen,
      rightPanelOpen: state.rightPanelOpen,
      bottomDrawerOpen: state.bottomDrawerOpen,
    };

    // Wait for the 500 ms CSS transition to finish, then invalidate.
    const t = setTimeout(() => {
      // StrataMap stores the Leaflet instance on window for this purpose.
      const map = (window as unknown as Record<string, unknown>)._leafletMap as
        { invalidateSize: (opts?: { animate: boolean }) => void } | undefined;
      map?.invalidateSize({ animate: false });
    }, 520);

    return () => clearTimeout(t);
  }, [state.sidebarOpen, state.rightPanelOpen, state.bottomDrawerOpen]);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: '#0f1117' }}>
      {/* Top Bar */}
      <TopBar />

      {/* Map (always rendered behind everything) */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          state.mapMode === 'pinpoint' ? 'pinpoint-mode' : ''
        }`}
        style={{
          top: 56,
          left: state.sidebarOpen ? 360 : 0,
          right: state.rightPanelOpen ? 400 : 0,
          bottom: state.bottomDrawerOpen ? '35vh' : 0,
        }}
      >
        <StrataMap />
      </div>

      {/* Cross-Section Overlay */}
      <AnimatePresence mode="wait">
        {state.viewMode === 'cross-section' && (
          <CrossSection />
        )}
      </AnimatePresence>

      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Right Panel */}
      <RightPanel />

      {/* Bottom Drawer */}
      <BottomDrawer />

      {/* Toast Container */}
      <ToastContainer />

      {/* Toggle Right Panel button (when closed) */}
      <AnimatePresence>
        {!state.rightPanelOpen && (
          <motion.button
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            onClick={() => {
              dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
            }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-xl flex items-center justify-center text-shallows hover:text-foam transition-all shadow-glass"
            style={{
              background: 'rgba(15, 17, 23, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(169, 214, 229, 0.1)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toggle Sidebar button (when closed) */}
      <AnimatePresence>
        {!state.sidebarOpen && (
          <motion.button
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            onClick={() => {
              dispatch({ type: 'TOGGLE_SIDEBAR' });
            }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-xl flex items-center justify-center text-shallows hover:text-foam transition-all shadow-glass"
            style={{
              background: 'rgba(15, 17, 23, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(169, 214, 229, 0.1)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}