/**
 * Global application state management for StrataDesk.
 *
 * Provides:
 *  - AppProvider  — wraps the app, bootstraps borewells from the API
 *  - useApp()     — hook for consuming state and actions anywhere in the tree
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Borewell, StrataLayer, AppState } from '@/types';
import { createBorewell, generateId } from '@/types';
import { getSoilColor } from '@/lib/soilColors';
import { api } from '@/lib/api';
import type { Toast, Action, CustomMaterial } from './types';

// ─── Initial State ────────────────────────────────────────────────────────────

const CUSTOM_MATERIALS_KEY = 'strata_custom_materials';

function loadCustomMaterials(): CustomMaterial[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MATERIALS_KEY);
    return raw ? (JSON.parse(raw) as CustomMaterial[]) : [];
  } catch (err) {
    console.warn('Custom materials could not be loaded from localStorage', err);
    return [];
  }
}

const initialState: AppState = {
  borewells:          [],
  activeBorewellId:   null,
  pendingLatLng:      null,
  mapMode:            'browse',
  viewMode:           'map',
  crossSectionMode:   'smooth',
  sidebarOpen:        true,
  rightPanelOpen:     true,
  bottomDrawerOpen:   false,
  isLoading:          false,
  // Part 3 centralized states
  elevationFetched:   [],
  selectedBorewells:  [],
  waterTableVisible:  true,
  terrainVisible:     true,
  savingIds:          [],
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

type FullState = AppState & { toasts: Toast[]; customMaterials: CustomMaterial[] };

function appReducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_BOREWELLS':
      return {
        ...state,
        borewells: action.payload,
        isLoading: false,
        selectedBorewells: action.payload.filter(b => b.selectedForCrossSection).map(b => b.id),
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'ADD_BOREWELL':
      return {
        ...state,
        borewells: [...state.borewells, action.payload],
        activeBorewellId: action.payload.id,
        selectedBorewells: action.payload.selectedForCrossSection
          ? Array.from(new Set([...state.selectedBorewells, action.payload.id]))
          : state.selectedBorewells,
      };

    case 'UPDATE_BOREWELL': {
      const updated = action.payload;
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : b
        ),
      };
    }

    case 'DELETE_BOREWELL':
      return {
        ...state,
        borewells: state.borewells.filter(b => b.id !== action.id),
        activeBorewellId:
          state.activeBorewellId === action.id ? null : state.activeBorewellId,
        selectedBorewells: state.selectedBorewells.filter(id => id !== action.id),
        elevationFetched: state.elevationFetched.filter(id => id !== action.id),
        savingIds: state.savingIds.filter(id => id !== action.id),
      };

    case 'SET_ACTIVE_BOREWELL':
      return { ...state, activeBorewellId: action.id, pendingLatLng: null };

    case 'SET_PENDING_LATLNG':
      return { ...state, pendingLatLng: action.payload, activeBorewellId: null };

    case 'SET_MAP_MODE':           return { ...state, mapMode: action.mode };
    case 'SET_VIEW_MODE':          return { ...state, viewMode: action.mode };
    case 'SET_CROSS_SECTION_MODE': return { ...state, crossSectionMode: action.mode };
    case 'TOGGLE_SIDEBAR':         return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'TOGGLE_RIGHT_PANEL':     return { ...state, rightPanelOpen: !state.rightPanelOpen };
    case 'TOGGLE_BOTTOM_DRAWER':   return { ...state, bottomDrawerOpen: !state.bottomDrawerOpen };

    case 'ADD_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      const newLayers = [...bw.layers, action.layer].sort(
        (a, b) => a.startDepth - b.startDepth
      );
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === action.borewellId
            ? { ...b, layers: newLayers, updatedAt: new Date().toISOString() }
            : b
        ),
      };
    }

    case 'UPDATE_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      const newLayers = bw.layers
        .map(l => (l.id === action.layerId ? { ...l, ...action.updates } : l))
        .sort((a, b) => a.startDepth - b.startDepth);
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === action.borewellId
            ? { ...b, layers: newLayers, updatedAt: new Date().toISOString() }
            : b
        ),
      };
    }

    case 'DELETE_LAYER': {
      const bw = state.borewells.find(b => b.id === action.borewellId);
      if (!bw) return state;
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === action.borewellId
            ? { ...b, layers: bw.layers.filter(l => l.id !== action.layerId), updatedAt: new Date().toISOString() }
            : b
        ),
      };
    }

    case 'SET_LAYERS':
      return {
        ...state,
        borewells: state.borewells.map(b =>
          b.id === action.borewellId
            ? { ...b, layers: action.layers, updatedAt: new Date().toISOString() }
            : b
        ),
      };

    case 'TOGGLE_CROSS_SECTION': {
      const isSel = state.selectedBorewells.includes(action.id);
      const nextSel = isSel
        ? state.selectedBorewells.filter(id => id !== action.id)
        : [...state.selectedBorewells, action.id];
      return {
        ...state,
        selectedBorewells: nextSel,
        borewells: state.borewells.map(b =>
          b.id === action.id
            ? { ...b, selectedForCrossSection: !isSel }
            : b
        ),
      };
    }

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    case 'ADD_CUSTOM_MATERIAL': {
      const already = state.customMaterials.some(
        m => m.name.toLowerCase() === action.payload.name.toLowerCase()
      );
      if (already) return state;
      const updated = [...state.customMaterials, action.payload];
      try {
        localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Custom materials could not be persisted', err);
      }
      return { ...state, customMaterials: updated };
    }

    case 'DELETE_CUSTOM_MATERIAL': {
      const updated = state.customMaterials.filter(
        m => m.name.toLowerCase() !== action.name.toLowerCase()
      );
      try {
        localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Custom materials could not be persisted', err);
      }
      return { ...state, customMaterials: updated };
    }

    case 'SET_ELEVATION_FETCHED':
      return { ...state, elevationFetched: action.payload };

    case 'ADD_ELEVATION_FETCHED':
      return {
        ...state,
        elevationFetched: Array.from(new Set([...state.elevationFetched, action.payload]))
      };

    case 'SET_SELECTED_BOREWELLS': {
      const nextSelected = action.payload;
      return {
        ...state,
        selectedBorewells: nextSelected,
        borewells: state.borewells.map(b => ({
          ...b,
          selectedForCrossSection: nextSelected.includes(b.id)
        }))
      };
    }

    case 'SET_WATER_TABLE_VISIBLE':
      return { ...state, waterTableVisible: action.payload };

    case 'SET_TERRAIN_VISIBLE':
      return { ...state, terrainVisible: action.payload };

    case 'SET_SAVING_IDS':
      return { ...state, savingIds: action.payload };

    case 'ADD_SAVING_ID':
      return {
        ...state,
        savingIds: Array.from(new Set([...state.savingIds, action.id]))
      };

    case 'REMOVE_SAVING_ID':
      return {
        ...state,
        savingIds: state.savingIds.filter(id => id !== action.id)
      };

    default:
      return state;
  }
}

// ─── Context Interface ────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  toasts: Toast[];
  customMaterials: CustomMaterial[];
  dispatch: React.Dispatch<Action>;
  getActiveBorewell: () => Borewell | null;
  showToast:    (message: string, type?: Toast['type']) => void;
  removeToast:  (id: string) => void;
  addLayer:     (borewellId: string) => Promise<void>;
  deleteLayer:  (borewellId: string, layerId: string) => Promise<void>;
  updateLayer:  (borewellId: string, layerId: string, updates: Partial<StrataLayer>) => Promise<void>;
  setLayers:    (borewellId: string, layers: StrataLayer[]) => Promise<void>;
  saveBorewell: (data: Partial<Borewell>) => Promise<void>;
  deleteBorewell:      (id: string) => Promise<void>;
  setActiveBorewell:   (id: string | null) => void;
  setPendingLatLng:    (latLng: { lat: number; lng: number } | null) => void;
  toggleCrossSection:  (id: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fullState, dispatch] = useReducer(appReducer, {
    ...initialState,
    toasts: [],
    customMaterials: loadCustomMaterials(),
    isLoading: true,
  });
  const { toasts, customMaterials, ...state } = fullState;

  const queryClient = useQueryClient();

  // ── Toast helpers (declared early for use in effects) ──────────────────────

  const showToast = useCallback(
    (message: string, type: Toast['type'] = 'success') => {
      const id = generateId();
      dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 3000);
    },
    []
  );

  const removeToast = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_TOAST', id }),
    []
  );

  const { data: fetchedBorewells, isLoading: queryLoading, isError: queryError } = useQuery({
    queryKey: ['borewells'],
    queryFn: api.listBorewells,
  });

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: queryLoading });
  }, [queryLoading]);

  useEffect(() => {
    if (queryError) {
      showToast('Unable to load borewells from server.', 'error');
    }
  }, [queryError, showToast]);

  useEffect(() => {
    if (fetchedBorewells && state.savingIds.length === 0) {
      dispatch({ type: 'SET_BOREWELLS', payload: fetchedBorewells });
      if (fetchedBorewells.length > 0 && !state.activeBorewellId) {
        dispatch({ type: 'SET_ACTIVE_BOREWELL', id: fetchedBorewells[0].id });
      }
    }
  }, [fetchedBorewells, state.savingIds.length, state.activeBorewellId]);

  // ── Selectors ──────────────────────────────────────────────────────────────

  const getActiveBorewell = useCallback(
    () => state.borewells.find(b => b.id === state.activeBorewellId) ?? null,
    [state.borewells, state.activeBorewellId]
  );

  // ── Debounced Save Mechanism ───────────────────────────────────────────────

  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const latestBorewellsRef = useRef<Borewell[]>([]);

  useEffect(() => {
    latestBorewellsRef.current = state.borewells;
  }, [state.borewells]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(saveTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const queueDebouncedSave = useCallback((borewellId: string) => {
    dispatch({ type: 'ADD_SAVING_ID', id: borewellId });

    if (saveTimeouts.current[borewellId]) {
      clearTimeout(saveTimeouts.current[borewellId]);
    }

    saveTimeouts.current[borewellId] = setTimeout(async () => {
      const latest = latestBorewellsRef.current.find(b => b.id === borewellId);
      if (!latest) {
        dispatch({ type: 'REMOVE_SAVING_ID', id: borewellId });
        return;
      }

      try {
        await api.patchBorewell(borewellId, {
          name: latest.name,
          location: latest.location,
          latitude: latest.latitude,
          longitude: latest.longitude,
          diameter: latest.diameter,
          totalDepth: latest.totalDepth,
          waterLevel: latest.waterLevel,
          groundElevationMSL: latest.groundElevationMSL,
          notes: latest.notes,
          selectedForCrossSection: latest.selectedForCrossSection,
          layers: latest.layers,
        });
        queryClient.invalidateQueries({ queryKey: ['borewells'] });
      } catch (err) {
        console.error(`Failed to auto-save borewell ${borewellId}:`, err);
        showToast(`Failed to auto-save changes for ${latest.name || borewellId}`, 'error');
      } finally {
        dispatch({ type: 'REMOVE_SAVING_ID', id: borewellId });
      }
    }, 1000);
  }, [showToast, queryClient]);

  // ── Layer actions (optimistic dispatch + API sync) ─────────────────────────

  const addLayer = useCallback(async (borewellId: string) => {
    const bw = state.borewells.find(b => b.id === borewellId);
    if (!bw) return;

    const lastEnd = bw.layers.length > 0
      ? Math.max(...bw.layers.map(l => l.endDepth))
      : 0;

    const layer: StrataLayer = {
      id:         generateId(),
      startDepth: lastEnd,
      endDepth:   lastEnd,
      material:   'Clay',
      color:      getSoilColor('Clay'),
    };

    dispatch({ type: 'ADD_LAYER', borewellId, layer });
    queueDebouncedSave(borewellId);
  }, [state.borewells, queueDebouncedSave]);

  const deleteLayer = useCallback(async (borewellId: string, layerId: string) => {
    dispatch({ type: 'DELETE_LAYER', borewellId, layerId });
    queueDebouncedSave(borewellId);
  }, [queueDebouncedSave]);

  const updateLayer = useCallback(
    async (borewellId: string, layerId: string, updates: Partial<StrataLayer>) => {
      dispatch({ type: 'UPDATE_LAYER', borewellId, layerId, updates });
      queueDebouncedSave(borewellId);
    },
    [queueDebouncedSave]
  );

  const setLayers = useCallback(async (borewellId: string, layers: StrataLayer[]) => {
    dispatch({ type: 'SET_LAYERS', borewellId, layers });
    queueDebouncedSave(borewellId);
  }, [queueDebouncedSave]);

  // ── Borewell actions ───────────────────────────────────────────────────────

  const saveBorewell = useCallback(async (data: Partial<Borewell>) => {
    const existing = state.borewells.find(b => b.id === state.activeBorewellId);
    if (existing) {
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_BOREWELL', payload: updated });
      queueDebouncedSave(existing.id);
    } else {
      const newBw = createBorewell(data);
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const created = await api.createBorewell(newBw);
        dispatch({ type: 'ADD_BOREWELL', payload: created });
        queryClient.invalidateQueries({ queryKey: ['borewells'] });
        showToast('Borewell created successfully', 'success');
      } catch {
        showToast('Failed to create borewell.', 'error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [state.borewells, state.activeBorewellId, queueDebouncedSave, showToast, queryClient]);

  const deleteBorewell = useCallback(async (id: string) => {
    try {
      await api.deleteBorewell(id);
      dispatch({ type: 'DELETE_BOREWELL', id });
      queryClient.invalidateQueries({ queryKey: ['borewells'] });
    } catch {
      showToast('Failed to delete borewell.', 'error');
    }
  }, [showToast, queryClient]);

  const setActiveBorewell = useCallback(
    (id: string | null) => dispatch({ type: 'SET_ACTIVE_BOREWELL', id }),
    []
  );

  const setPendingLatLng = useCallback(
    (latLng: { lat: number; lng: number } | null) =>
      dispatch({ type: 'SET_PENDING_LATLNG', payload: latLng }),
    []
  );

  const toggleCrossSection = useCallback(async (id: string) => {
    dispatch({ type: 'TOGGLE_CROSS_SECTION', id });
    queueDebouncedSave(id);
  }, [queueDebouncedSave]);

  return (
    <AppContext.Provider value={{
      state,
      toasts,
      customMaterials,
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

// ─── Consumer Hook ────────────────────────────────────────────────────────────

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
