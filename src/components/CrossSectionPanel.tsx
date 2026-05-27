import { useMemo, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import type { Borewell, CrossSectionMode } from '@/types';
import { buildCrossSection } from '@/lib/crossSectionEngine';
import { borewellToCSInput } from '@/lib/adapters';
import type { CrossSectionInput } from '@/lib/adapters';
import { layoutBorewells, mToFt, ftToM } from '@/components/cross-section/geoUtils';
import { validateBorewells } from '@/lib/geologyValidation';

const PX_PER_FT = 3;
const COL_WIDTH = 220;
const MARGIN_X = 100;
const MARGIN_Y = 90;
const BH_COL_HALF = 44;

export default memo(CrossSection);

function CrossSection() {
  const { state, dispatch } = useApp();

  const [yAxisMode, setYAxisMode] = useState<'MSL' | 'depth'>('MSL');

  // Derive selected borewells with layers in the current order from AppContext
  const selected: Borewell[] = useMemo(() => {
    const map = new Map(state.borewells.map(b => [b.id, b]));
    return state.selectedBorewells
      .map(id => map.get(id))
      .filter((b): b is Borewell => !!b && b.layers.length > 0);
  }, [state.borewells, state.selectedBorewells]);

  const moveLeft = useCallback((idx: number) => {
    if (idx <= 0) return;
    const next = [...state.selectedBorewells];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    dispatch({ type: 'SET_SELECTED_BOREWELLS', payload: next });
  }, [state.selectedBorewells, dispatch]);

  const moveRight = useCallback((idx: number) => {
    if (idx >= state.selectedBorewells.length - 1) return;
    const next = [...state.selectedBorewells];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    dispatch({ type: 'SET_SELECTED_BOREWELLS', payload: next });
  }, [state.selectedBorewells, dispatch]);

  const removeFromSection = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_CROSS_SECTION', id });
  }, [dispatch]);

  const inputs = useMemo(() => selected.map(borewellToCSInput), [selected]);
  const validation = useMemo(() => validateBorewells(inputs), [inputs]);

  // ── Layout calculations (memoized) ──────────────────────────────────
  const layout = useMemo(() => {
    if (selected.length < 2) {
      return {
        svgW: 900,
        svgH: 700,
        chartH: 520,
        chartW: 700,
        xPositions: [],
        maxMSL: 0,
        minMSL: 0,
        rangeMSL: 1,
        yScale: (_idx: number, _depth: number) => 0,
        yScaleAbsolute: (_msl: number) => 0,
        svgDims: { marginY: MARGIN_Y, chartH: 520, svgH: 700 }
      };
    }

    const maxDepth = Math.max(...selected.map(b => b.totalDepth));
    const chartH = Math.max(520, maxDepth * PX_PER_FT);
    const svgW = Math.max(900, selected.length * COL_WIDTH + MARGIN_X * 2 + 60);
    const svgH = chartH + MARGIN_Y * 2;
    const chartW = svgW - MARGIN_X * 2;

    const normalisedLayout = layoutBorewells(inputs, svgW, MARGIN_X + 80);
    const xPositions = normalisedLayout.map(nb => nb.x);

    const toMSL = (bh: CrossSectionInput, depthFt: number) =>
      bh.groundElevationMSL - ftToM(depthFt);

    let maxMSL = -Infinity, minMSL = Infinity;
    for (const bh of inputs) {
      maxMSL = Math.max(maxMSL, bh.groundElevationMSL);
      minMSL = Math.min(minMSL, toMSL(bh, bh.totalDepthFt));
    }

    const ELEVATION_MARGIN_M = 8;
    maxMSL += ELEVATION_MARGIN_M;
    minMSL -= ELEVATION_MARGIN_M;
    const rangeMSL = maxMSL - minMSL || 1;

    const yScale = (bhIdx: number, depthFt: number) => {
      const msl = toMSL(inputs[bhIdx], depthFt);
      return MARGIN_Y + ((maxMSL - msl) / rangeMSL) * chartH;
    };

    const yScaleAbsolute = (msl: number) => {
      return MARGIN_Y + ((maxMSL - msl) / rangeMSL) * chartH;
    };

    const svgDims = {
      marginY: MARGIN_Y,
      chartH,
      svgH
    };

    return {
      svgW,
      svgH,
      chartH,
      chartW,
      xPositions,
      maxMSL,
      minMSL,
      rangeMSL,
      yScale,
      yScaleAbsolute,
      svgDims
    };
  }, [selected, inputs]);

  // ── Geological polygons via engine (memoized) ──────────────────────
  const polygons = useMemo(() => {
    if (selected.length < 2 || !validation.isValid) return [];
    return buildCrossSection(
      inputs,
      layout.xPositions,
      null, // Pass null to trigger MSL correction
      state.crossSectionMode,
      layout.svgDims
    );
  }, [inputs, layout.xPositions, layout.svgDims, state.crossSectionMode, validation.isValid]);

  // ── Terrain Line generation (memoized) ─────────────────────────────
  const terrainPathPoints = useMemo(() => {
    if (!state.terrainVisible || selected.length < 2) return '';
    return selected.map((_, i) => `${layout.xPositions[i]},${layout.yScale(i, 0)}`).join(' ');
  }, [selected, layout.xPositions, layout.yScale, state.terrainVisible]);

  // ── Water Table line generation (memoized) ─────────────────────────
  const waterTableAnchors = useMemo(() => {
    if (!state.waterTableVisible || selected.length < 2) return [];
    return selected
      .map((bw, i) => bw.waterLevel != null ? { x: layout.xPositions[i], y: layout.yScale(i, bw.waterLevel) } : null)
      .filter((p): p is { x: number; y: number } => p !== null);
  }, [selected, layout.xPositions, layout.yScale, state.waterTableVisible]);

  // ── SVG Content ───────────────────────────────────────────────────
  const svgContent = useMemo(() => {
    if (selected.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-shallows/25">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <h3 className="text-foam text-lg font-medium mb-2">Cross-Section View</h3>
          <p className="text-shallows/50 text-sm max-w-md leading-relaxed">
            Select at least 2 borewells to generate a geological cross-section.
            Use the <span className="text-foam/80 font-medium">"Include in Cross-Section View"</span> checkbox in the Inspector panel.
          </p>
        </div>
      );
    }

    if (!validation.isValid) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="w-24 h-24 rounded-2xl bg-red-500/5 flex items-center justify-center mb-6 border border-red-500/10">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-red-400/50">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="text-red-400 text-lg font-medium mb-2">Geological Validation Error</h3>
          <p className="text-red-300/60 text-sm max-w-md leading-relaxed">
            {validation.error}
          </p>
        </div>
      );
    }

    const { svgW, svgH, chartH, chartW, xPositions, maxMSL, rangeMSL, yScale, yScaleAbsolute } = layout;

    // Grid ticks
    const tickPercentages = [0, 0.2, 0.4, 0.6, 0.8, 1];

    return (
      <svg
        width={svgW}
        height={svgH}
        className="mx-auto"
        style={{ minWidth: svgW }}
      >
        <defs>
          {/* Noise texture for geological realism */}
          <filter id="geo-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="42" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend mode="multiply" in2="SourceGraphic" />
          </filter>

          {/* Gradient per polygon for depth feel */}
          {polygons.map((poly, i) => (
            <linearGradient key={`pg-${i}`} id={`pg-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={poly.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={poly.color} stopOpacity={0.6} />
            </linearGradient>
          ))}

          {/* Per-borewell layer gradients (for column rendering) */}
          {selected.flatMap(bw =>
            bw.layers.map(layer => (
              <linearGradient
                key={`bh-${layer.id}`}
                id={`bh-${layer.id}`}
                x1="0%" y1="0%" x2="0%" y2="100%"
              >
                <stop offset="0%" stopColor={layer.color} stopOpacity={1} />
                <stop offset="100%" stopColor={layer.color} stopOpacity={0.7} />
              </linearGradient>
            ))
          )}

          {/* Water pattern */}
          <pattern id="water-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="transparent" />

        {/* ── Y Axis (MSL or Depth) ─────────────────────────────────── */}
        <line
          x1={MARGIN_X} y1={MARGIN_Y}
          x2={MARGIN_X} y2={MARGIN_Y + chartH}
          stroke="rgba(169, 214, 229, 0.15)" strokeWidth={1}
        />

        {tickPercentages.map((p, idx) => {
          const msl = maxMSL - p * rangeMSL;
          const y = yScaleAbsolute(msl);
          const depthLabelFt = mToFt(maxMSL - msl);

          return (
            <g key={`tick-${idx}`}>
              <line
                x1={MARGIN_X - 6} y1={y}
                x2={MARGIN_X} y2={y}
                stroke="rgba(169, 214, 229, 0.2)" strokeWidth={1}
              />
              <text
                x={MARGIN_X - 10} y={y + 4}
                textAnchor="end"
                fill="rgba(169, 214, 229, 0.45)"
                fontSize={9}
                fontFamily="'Inter', sans-serif"
              >
                {yAxisMode === 'MSL'
                  ? `${msl.toFixed(0)} m`
                  : `${depthLabelFt.toFixed(0)} ft`}
              </text>
              {/* Horizontal grid line */}
              <line
                x1={MARGIN_X} y1={y}
                x2={MARGIN_X + chartW} y2={y}
                stroke="rgba(169, 214, 229, 0.04)"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            </g>
          );
        })}

        {/* ── Geological polygons (the engine output) ────────────── */}
        {polygons.map((poly, i) => (
          <g key={`poly-${i}`}>
            <path
              d={poly.path}
              fill={`url(#pg-${i})`}
              stroke={poly.color}
              strokeWidth={0.5}
              strokeOpacity={0.3}
              filter="url(#geo-noise)"
            />
            {/* Label at the widest part of the polygon */}
            {(() => {
              // Find vertical midpoint of the polygon at center x
              if (poly.topCurve.length === 0) return null;
              const midIdx = Math.floor(poly.topCurve.length / 2);
              const topY = poly.topCurve[midIdx]?.y ?? 0;
              const botY = poly.bottomCurve[midIdx]?.y ?? 0;
              const thickness = botY - topY;
              if (thickness < 22) return null;
              const centerX = poly.topCurve[midIdx]?.x ?? 0;
              const centerY = (topY + botY) / 2;
              return (
                <text
                  x={centerX} y={centerY + 3}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.65)"
                  fontSize={8}
                  fontWeight={500}
                  fontFamily="'Inter', sans-serif"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
                >
                  {poly.displayName}
                </text>
              );
            })()}
          </g>
        ))}

        {/* ── Terrain line ────────────────────────────────────────── */}
        {state.terrainVisible && terrainPathPoints && (
          <g>
            <polyline
              points={terrainPathPoints}
              fill="none"
              stroke="#f5ead0"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              opacity={0.7}
            />
            <text
              x={xPositions[0] - 8}
              y={yScale(0, 0) - 8}
              textAnchor="end"
              fill="rgba(245, 234, 208, 0.6)"
              fontSize={8}
              fontFamily="'Inter', sans-serif"
              fontWeight={600}
            >
              Terrain Profile
            </text>
          </g>
        )}

        {/* ── Water table line ────────────────────────────────────── */}
        {state.waterTableVisible && waterTableAnchors.length >= 2 && (
          <g>
            <polyline
              points={waterTableAnchors.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(56, 189, 248, 0.6)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            {waterTableAnchors.map((p, i) => (
              <circle key={`wt-${i}`} cx={p.x} cy={p.y} r={3}
                fill="rgba(56, 189, 248, 0.8)" stroke="#0f1117" strokeWidth={1.5}
              />
            ))}
            {/* Label */}
            <text
              x={waterTableAnchors[0].x - 8} y={waterTableAnchors[0].y - 8}
              textAnchor="end"
              fill="rgba(56, 189, 248, 0.7)"
              fontSize={8}
              fontFamily="'Inter', sans-serif"
              fontWeight={600}
            >
              Water Table
            </text>
          </g>
        )}

        {/* ── Borehole columns (truth anchors) ───────────────────── */}
        {selected.map((bw, idx) => {
          const x = xPositions[idx];
          const groundY = yScale(idx, 0);
          const bottomY = yScale(idx, bw.totalDepth);

          return (
            <g key={bw.id}>
              {/* Borehole header */}
              <text x={x} y={groundY - 28} textAnchor="middle"
                fill="#e8e3d8" fontSize={11} fontWeight={700}
                fontFamily="'Inter', sans-serif"
              >
                {bw.name}
              </text>
              <text x={x} y={groundY - 14} textAnchor="middle"
                fill="rgba(169, 214, 229, 0.35)" fontSize={8}
                fontFamily="'Inter', sans-serif"
              >
                {bw.totalDepth} ft · {bw.layers.length} layers
              </text>

              {/* Borehole column border */}
              <rect
                x={x - BH_COL_HALF} y={groundY}
                width={BH_COL_HALF * 2} height={Math.max(0, bottomY - groundY)}
                fill="none"
                stroke="rgba(169, 214, 229, 0.12)"
                strokeWidth={1}
                rx={2}
              />

              {/* Individual layer blocks within the column */}
              {bw.layers.map(layer => {
                const yS = yScale(idx, layer.startDepth);
                const yE = yScale(idx, layer.endDepth);
                const h = Math.max(0, yE - yS);

                return (
                  <g key={layer.id}>
                    <rect
                      x={x - BH_COL_HALF} y={yS}
                      width={BH_COL_HALF * 2} height={Math.max(h, 1)}
                      fill={`url(#bh-${layer.id})`}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth={0.5}
                      filter="url(#geo-noise)"
                      rx={1}
                    />
                    {h > 18 && (
                      <text
                        x={x} y={yS + h / 2 + 3}
                        textAnchor="middle"
                        fill="white" fontSize={8} fontWeight={500}
                        fontFamily="'Inter', sans-serif"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                      >
                        {layer.material.length > 12
                          ? layer.material.substring(0, 11) + '…'
                          : layer.material}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Borehole centerline marker */}
              <line
                x1={x} y1={groundY - 6}
                x2={x} y2={groundY}
                stroke="rgba(169, 214, 229, 0.3)"
                strokeWidth={1}
              />
              <circle
                cx={x} cy={groundY - 8}
                r={3}
                fill="rgba(169, 214, 229, 0.2)"
                stroke="rgba(169, 214, 229, 0.4)"
                strokeWidth={1}
              />
            </g>
          );
        })}
      </svg>
    );
  }, [selected, polygons, terrainPathPoints, waterTableAnchors, layout, yAxisMode, validation, state.terrainVisible, state.waterTableVisible]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-30 flex flex-col"
      style={{ background: '#0f1117', top: 56 }}
    >
      {/* ── Controls header ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5 flex-shrink-0">
        <span className="text-shallows/50 text-xs uppercase tracking-wider font-medium">
          Cross-Section Mode
        </span>
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg"
          style={{ background: 'rgba(169, 214, 229, 0.06)' }}
        >
          <ModeButton active={state.crossSectionMode === 'smooth'} label="Smooth Flow" mode="smooth" />
          <ModeButton active={state.crossSectionMode === 'strict'} label="Strict Layer" mode="strict" />
        </div>

        {/* Y-Axis Mode Toggle */}
        <span className="text-shallows/50 text-xs uppercase tracking-wider font-medium ml-4 pl-4 border-l border-white/10">
          Y-Axis Mode
        </span>
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg"
          style={{ background: 'rgba(169, 214, 229, 0.06)' }}
        >
          <button
            onClick={() => setYAxisMode('MSL')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              yAxisMode === 'MSL' ? 'bg-core/50 text-foam' : 'text-shallows hover:text-foam'
            }`}
          >
            MSL Elevation
          </button>
          <button
            onClick={() => setYAxisMode('depth')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              yAxisMode === 'depth' ? 'bg-core/50 text-foam' : 'text-shallows hover:text-foam'
            }`}
          >
            Depth Axis
          </button>
        </div>

        {/* Layers visibility toggles */}
        <span className="text-shallows/50 text-xs uppercase tracking-wider font-medium ml-4 pl-4 border-l border-white/10">
          Visibility
        </span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-shallows hover:text-foam transition-colors">
            <input
              type="checkbox"
              checked={state.terrainVisible}
              onChange={(e) => dispatch({ type: 'SET_TERRAIN_VISIBLE', payload: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-white/20 bg-void text-core focus:ring-core/50 focus:ring-offset-0"
            />
            Terrain
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-shallows hover:text-foam transition-colors">
            <input
              type="checkbox"
              checked={state.waterTableVisible}
              onChange={(e) => dispatch({ type: 'SET_WATER_TABLE_VISIBLE', payload: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-white/20 bg-void text-core focus:ring-core/50 focus:ring-offset-0"
            />
            Water Table
          </label>
        </div>

        {/* Saving Status Indicator */}
        {state.savingIds.length > 0 && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10 text-xs text-reef">
            <Loader2 className="w-3.5 h-3.5 text-reef animate-spin" />
            <span>Saving {state.savingIds.map(id => state.borewells.find(b => b.id === id)?.name || id).join(', ')}...</span>
          </div>
        )}

        {state.savingIds.length === 0 && selected.length >= 2 && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-white/10 text-[10px] text-teal-light/60">
            <span>All changes saved</span>
          </div>
        )}

        {/* Borewell Ordering Chips */}
        {selected.length >= 2 && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
            <span className="text-shallows/40 text-xs uppercase tracking-wider font-medium">
              Order
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selected.map((bw, idx) => (
                <div
                  key={bw.id}
                  className="flex items-center gap-0.5 pl-1 pr-1 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs"
                >
                  <button
                    onClick={() => moveLeft(idx)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-white/10 text-shallows/50 hover:text-foam transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Move left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-foam font-medium px-1 truncate max-w-[80px]">
                    {bw.name}
                  </span>
                  <button
                    onClick={() => moveRight(idx)}
                    disabled={idx === selected.length - 1}
                    className="p-0.5 rounded hover:bg-white/10 text-shallows/50 hover:text-foam transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Move right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromSection(bw.id)}
                    className="p-0.5 rounded hover:bg-red-500/20 text-shallows/30 hover:text-red-400 transition-colors ml-0.5"
                    title="Remove from cross-section"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-shallows/40 text-xs">
            {selected.length} borewells selected
          </span>
        </div>
      </div>

      {/* ── Scrollable SVG canvas ────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-8">
        {svgContent}
      </div>
    </motion.div>
  );
}

const ModeButton = memo(function ModeButton({
  active,
  label,
  mode,
}: {
  active: boolean;
  label: string;
  mode: CrossSectionMode;
}) {
  const { dispatch } = useApp();
  return (
    <button
      onClick={() => dispatch({ type: 'SET_CROSS_SECTION_MODE', mode })}
      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
        active ? 'bg-core/50 text-foam' : 'text-shallows hover:text-foam'
      }`}
    >
      {label}
    </button>
  );
});
