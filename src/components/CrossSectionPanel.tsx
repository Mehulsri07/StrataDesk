import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Borewell, CrossSectionMode } from '@/types';
import { buildCrossSection } from '@/lib/crossSectionEngine';
import { borewellToCSInput } from '@/lib/adapters';

const PX_PER_FT = 3;
const COL_WIDTH = 220;
const MARGIN_X = 100;
const MARGIN_Y = 90;
const BH_COL_HALF = 44;

export default function CrossSection() {
  const { state, dispatch } = useApp();

  // ── Borewell ordering state ──────────────────────────────────────
  const [order, setOrder] = useState<string[]>([]);

  const allSelected = state.borewells.filter(
    b => b.selectedForCrossSection && b.layers.length > 0
  );

  useEffect(() => {
    setOrder(prev => {
      const selectedIds = new Set(allSelected.map(b => b.id));
      const kept = prev.filter(id => selectedIds.has(id));
      const existing = new Set(kept);
      const added = allSelected
        .filter(b => !existing.has(b.id))
        .map(b => b.id);
      return [...kept, ...added];
    });
  }, [allSelected.map(b => b.id).join(',')]);

  const selected: Borewell[] = useMemo(() => {
    const map = new Map(allSelected.map(b => [b.id, b]));
    return order.map(id => map.get(id)).filter((b): b is Borewell => !!b);
  }, [order, allSelected]);

  const moveLeft = (idx: number) => {
    if (idx <= 0) return;
    setOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveRight = (idx: number) => {
    if (idx >= order.length - 1) return;
    setOrder(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const removeFromSection = (id: string) => {
    dispatch({ type: 'TOGGLE_CROSS_SECTION', id });
  };

  // ── SVG computation via engine ───────────────────────────────────
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

    // ── Layout calculations ────────────────────────────────────────
    const maxDepth = Math.max(...selected.map(b => b.totalDepth));
    const chartH = Math.max(520, maxDepth * PX_PER_FT);
    const svgW = Math.max(900, selected.length * COL_WIDTH + MARGIN_X * 2 + 60);
    const svgH = chartH + MARGIN_Y * 2;
    const chartW = svgW - MARGIN_X * 2;

    const depthScale = (d: number) => MARGIN_Y + (d / maxDepth) * chartH;
    const xPos = (i: number) => MARGIN_X + 80 + i * COL_WIDTH;

    const xPositions = selected.map((_, i) => xPos(i));

    // ── Run the geological engine ──────────────────────────────────
    const polygons = buildCrossSection(
      selected.map(borewellToCSInput),
      xPositions,
      depthScale,
      state.crossSectionMode
    );

    // ── Depth tick marks ───────────────────────────────────────────
    const tickInterval = maxDepth <= 60 ? 5
      : maxDepth <= 150 ? 10
      : maxDepth <= 300 ? 20
      : maxDepth <= 600 ? 50
      : 100;

    const ticks: number[] = [];
    for (let d = 0; d <= maxDepth; d += tickInterval) ticks.push(d);
    if (ticks[ticks.length - 1] < maxDepth) ticks.push(maxDepth);

    // ── Water table ────────────────────────────────────────────────
    const waterAnchors = selected
      .map((bw, i) => bw.waterLevel != null ? { x: xPos(i), y: depthScale(bw.waterLevel) } : null)
      .filter((p): p is { x: number; y: number } => p !== null);

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

        {/* ── Depth axis ─────────────────────────────────────────── */}
        <line
          x1={MARGIN_X} y1={MARGIN_Y}
          x2={MARGIN_X} y2={MARGIN_Y + chartH}
          stroke="rgba(169, 214, 229, 0.15)" strokeWidth={1}
        />

        {ticks.map(depth => {
          const y = depthScale(depth);
          return (
            <g key={`tick-${depth}`}>
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
                {depth.toFixed(0)} ft
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

        {/* ── Water table line ────────────────────────────────────── */}
        {waterAnchors.length >= 2 && (
          <g>
            <polyline
              points={waterAnchors.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(56, 189, 248, 0.6)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            {waterAnchors.map((p, i) => (
              <circle key={`wt-${i}`} cx={p.x} cy={p.y} r={3}
                fill="rgba(56, 189, 248, 0.8)" stroke="#0f1117" strokeWidth={1.5}
              />
            ))}
            {/* Label */}
            <text
              x={waterAnchors[0].x - 8} y={waterAnchors[0].y - 8}
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
          const x = xPos(idx);
          return (
            <g key={bw.id}>
              {/* Borehole header */}
              <text x={x} y={MARGIN_Y - 28} textAnchor="middle"
                fill="#e8e3d8" fontSize={11} fontWeight={700}
                fontFamily="'Inter', sans-serif"
              >
                {bw.name}
              </text>
              <text x={x} y={MARGIN_Y - 14} textAnchor="middle"
                fill="rgba(169, 214, 229, 0.35)" fontSize={8}
                fontFamily="'Inter', sans-serif"
              >
                {bw.totalDepth} ft · {bw.layers.length} layers
              </text>

              {/* Borehole column border */}
              <rect
                x={x - BH_COL_HALF} y={MARGIN_Y}
                width={BH_COL_HALF * 2} height={depthScale(bw.totalDepth) - MARGIN_Y}
                fill="none"
                stroke="rgba(169, 214, 229, 0.12)"
                strokeWidth={1}
                rx={2}
              />

              {/* Individual layer blocks within the column */}
              {bw.layers.map(layer => {
                const yS = depthScale(layer.startDepth);
                const yE = depthScale(layer.endDepth);
                const h = yE - yS;

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
                x1={x} y1={MARGIN_Y - 6}
                x2={x} y2={MARGIN_Y}
                stroke="rgba(169, 214, 229, 0.3)"
                strokeWidth={1}
              />
              <circle
                cx={x} cy={MARGIN_Y - 8}
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
  }, [selected, state.crossSectionMode]);

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

function ModeButton({
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
}
