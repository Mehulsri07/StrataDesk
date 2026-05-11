import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Borewell, StrataLayer, AppState, MapMode, ViewMode, CrossSectionMode } from '@/types';
import { createBorewell, generateId, getColorForMaterial } from '@/types';
import { api } from '@/lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type Action =
  | { type: 'SET_BOREWELLS'; payload: Borewell[] }
  | { type: 'ADD_BOREWELL'; payload: Borewell }
  | { type: 'UPDATE_BOREWELL'; payload: Borewell }
  | { type: 'DELETE_BOREWELL'; id: string }
  | { type: 'SET_ACTIVE_BOREWELL'; id: string | null }
  | { type: 'SET_PENDING_LATLNG'; payload: { lat: number; lng: number } | null }
  | { type: 'SET_MAP_MODE'; mode: MapMode }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_CROSS_SECTION_MODE'; mode: CrossSectionMode }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'TOGGLE_BOTTOM_DRAWER' }
  | { type: 'ADD_LAYER'; borewellId: string; layer: StrataLayer }
  | { type: 'UPDATE_LAYER'; borewellId: string; layerId: string; updates: Partial<StrataLayer> }
  | { type: 'DELETE_LAYER'; borewellId: string; layerId: string }
  | { type: 'SET_LAYERS'; borewellId: string; layers: StrataLayer[] }
  | { type: 'TOGGLE_CROSS_SECTION'; id: string }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; id: string };

const initialState: AppState = {
  borewells: [],
  activeBorewellId: null,
  pendingLatLng: null,
  mapMode: 'browse',
  viewMode: 'map',
  crossSectionMode: 'smooth',
  sidebarOpen: true,
  rightPanelOpen: true,
  bottomDrawerOpen: false,
};

function appReducer(state: AppState & { toasts: Toast[] }, action: Action): AppState & { toasts: Toast[] } {
  switch (action.type) {
    case 'SET_BOREWELLS':
      return { ...state, borewells: action.payload };
    case 'ADD_BOREWELL':
      return { ...state, borewells: [...state.borewells, action.payload], activeBorewellId: action.payload.id };
    case 'UPDATE_BOREWELL': {
      const updated = action.payload;
      return {
        ...state,
        borewells: state.borewells.map(b => b.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : b),
      };
    }
    case 'DELETE_BOREWELL':
      return {
        ...state,
        borewells: state.borewells.filter(b => b.id !== action.id),
        activeBorewellId: state.activeBorewellId === action.id ? null : state.activeBorewellId,
      };
    case 'SET_ACTIVE_BOREWELL':
      return { ...state, activeBorewellId: action.id, pendingLatLng: null };
    case 'SET_PENDING_LATLNG':
      return { ...state, pendingLatLng: action.payload, activeBorewellId: null };
    case 'SET_MAP_MODE':
      return { ...state, mapMode: action.mode };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_CROSS_SECTION_MODE':
      return { ...state, crossSectionMode: action.mode };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelOpen: !state.rightPanelOpen };
    case 'TOGGLE_BOTTOM_DRAWER':
      return { ...state, bottomDrawerOpen: !state.bottomDrawerOpen };
    case 'ADD_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      const newLayers = [...bw.layers, action.layer].sort((a, b) => a.startDepth - b.startDepth);
      return {
        ...state,
        borewells: state.borewells.map(b => b.id === action.borewellId ? { ...b, layers: newLayers, updatedAt: new Date().toISOString() } : b),
      };
    }
    case 'UPDATE_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      const newLayers = bw.layers.map(l => l.id === action.layerId ? { ...l, ...action.updates } : l).sort((a, b) => a.startDepth - b.startDepth);
      return {
        ...state,
        borewells: state.borewells.map(b => b.id === action.borewellId ? { ...b, layers: newLayers, updatedAt: new Date().toISOString() } : b),
      };
    }
    case 'DELETE_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      const newLayers = bw.layers.filter(l => l.id !== action.layerId);
      return {
        ...state,
        borewells: state.borewells.map(b => b.id === action.borewellId ? { ...b, layers: newLayers, updatedAt: new Date().toISOString() } : b),
      };
    }
    case 'SET_LAYERS':
      return {
        ...state,
        borewells: state.borewells.map(b => b.id === action.borewellId ? { ...b, layers: action.layers, updatedAt: new Date().toISOString() } : b),
      };
    case 'TOGGLE_CROSS_SECTION':
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === action.id ? { ...b, selectedForCrossSection: !b.selectedForCrossSection } : b
        ),
      };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  toasts: Toast[];
  dispatch: React.Dispatch<Action>;
  getActiveBorewell: () => Borewell | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addLayer: (borewellId: string) => Promise<void>;
  deleteLayer: (borewellId: string, layerId: string) => Promise<void>;
  updateLayer: (borewellId: string, layerId: string, updates: Partial<StrataLayer>) => Promise<void>;
  setLayers: (borewellId: string, layers: StrataLayer[]) => Promise<void>;
  saveBorewell: (data: Partial<Borewell>) => Promise<void>;
  deleteBorewell: (id: string) => Promise<void>;
  setActiveBorewell: (id: string | null) => void;
  setPendingLatLng: (latLng: { lat: number; lng: number } | null) => void;
  toggleCrossSection: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fullState, dispatch] = useReducer(appReducer, { ...initialState, toasts: [] });
  const { toasts, ...state } = fullState;

  useEffect(() => {
    let mounted = true;

    const loadBorewells = async () => {
      try {
        const borewells = await api.listBorewells();
        if (!mounted) return;
        dispatch({ type: 'SET_BOREWELLS', payload: borewells });
        if (borewells.length > 0) {
          dispatch({ type: 'SET_ACTIVE_BOREWELL', id: borewells[0].id });
        }
      } catch {
        if (!mounted) return;
        dispatch({
          type: 'ADD_TOAST',
          payload: { id: generateId(), message: 'Unable to load borewells from server.', type: 'error' },
        });
      }
    };

    loadBorewells();
    return () => {
      mounted = false;
    };
  }, []);

  const getActiveBorewell = useCallback(() => {
    return state.borewells.find(b => b.id === state.activeBorewellId) || null;
  }, [state.borewells, state.activeBorewellId]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateId();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id });
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  const addLayer = useCallback(async (borewellId: string) => {
    const bw = state.borewells.find(b => b.id === borewellId);
    if (!bw) return;
    const lastEnd = bw.layers.length > 0
      ? Math.max(...bw.layers.map(l => l.endDepth))
      : 0;
    const layer: StrataLayer = {
      id: generateId(),
      startDepth: lastEnd,
      endDepth: lastEnd,
      material: 'Clay',
      color: getColorForMaterial('Clay'),
    };
    const updatedBorewell = {
      ...bw,
      layers: [...bw.layers, layer].sort((a, b) => a.startDepth - b.startDepth),
    };
    try {
      const saved = await api.updateBorewell(borewellId, updatedBorewell);
      dispatch({ type: 'UPDATE_BOREWELL', payload: saved });
    } catch {
      showToast('Failed to add layer.', 'error');
    }
  }, [state.borewells]);

  const deleteLayer = useCallback(async (borewellId: string, layerId: string) => {
    const bw = state.borewells.find(b => b.id === borewellId);
    if (!bw) return;
    const updatedBorewell = { ...bw, layers: bw.layers.filter(l => l.id !== layerId) };
    try {
      const saved = await api.updateBorewell(borewellId, updatedBorewell);
      dispatch({ type: 'UPDATE_BOREWELL', payload: saved });
    } catch {
      showToast('Failed to delete layer.', 'error');
    }
  }, [state.borewells, showToast]);

  const updateLayer = useCallback(async (borewellId: string, layerId: string, updates: Partial<StrataLayer>) => {
    const bw = state.borewells.find(b => b.id === borewellId);
    if (!bw) return;
    const updatedLayers = bw.layers
      .map(l => l.id === layerId ? { ...l, ...updates } : l)
      .sort((a, b) => a.startDepth - b.startDepth);
    try {
      const saved = await api.updateBorewell(borewellId, { ...bw, layers: updatedLayers });
      dispatch({ type: 'UPDATE_BOREWELL', payload: saved });
    } catch {
      showToast('Failed to update layer.', 'error');
    }
  }, [state.borewells, showToast]);

  const setLayers = useCallback(async (borewellId: string, layers: StrataLayer[]) => {
    const bw = state.borewells.find(b => b.id === borewellId);
    if (!bw) return;
    try {
      const saved = await api.updateBorewell(borewellId, { ...bw, layers });
      dispatch({ type: 'UPDATE_BOREWELL', payload: saved });
    } catch {
      showToast('Failed to import layers.', 'error');
    }
  }, [state.borewells, showToast]);

  const saveBorewell = useCallback(async (data: Partial<Borewell>) => {
    const existing = state.borewells.find(b => b.id === state.activeBorewellId);
    if (existing) {
      try {
        const updated = await api.updateBorewell(existing.id, {
          ...existing,
          ...data,
          updatedAt: new Date().toISOString(),
        });
        dispatch({ type: 'UPDATE_BOREWELL', payload: updated });
      } catch {
        showToast('Failed to save borewell.', 'error');
      }
    } else {
      const newBw = createBorewell(data);
      try {
        const created = await api.createBorewell(newBw);
        dispatch({ type: 'ADD_BOREWELL', payload: created });
      } catch {
        showToast('Failed to create borewell.', 'error');
      }
    }
  }, [state.borewells, state.activeBorewellId, showToast]);

  const deleteBorewell = useCallback(async (id: string) => {
    try {
      await api.deleteBorewell(id);
      dispatch({ type: 'DELETE_BOREWELL', id });
    } catch {
      showToast('Failed to delete borewell.', 'error');
    }
  }, [showToast]);

  const setActiveBorewell = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_BOREWELL', id });
  }, []);

  const setPendingLatLng = useCallback((latLng: { lat: number; lng: number } | null) => {
    dispatch({ type: 'SET_PENDING_LATLNG', payload: latLng });
  }, []);

  const toggleCrossSection = useCallback(async (id: string) => {
    const bw = state.borewells.find(b => b.id === id);
    if (!bw) return;
    try {
      const updated = await api.patchBorewell(id, { selectedForCrossSection: !bw.selectedForCrossSection });
      dispatch({ type: 'UPDATE_BOREWELL', payload: updated });
    } catch {
      showToast('Failed to update cross-section selection.', 'error');
    }
  }, [state.borewells, showToast]);

  return (
    <AppContext.Provider value={{
      state,
      toasts,
      dispatch,
      getActiveBorewell,
      showToast,
      removeToast,
      addLayer,
      deleteLayer,
      updateLayer,
      setLayers,
      saveBorewell,
      deleteBorewell,
      setActiveBorewell,
      setPendingLatLng,
      toggleCrossSection,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
