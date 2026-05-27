// ─────────────────────────────────────────────────────────────────────────────
// CrossSectionView — SVG geological cross-section visualization
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mountain, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { CrossSectionBorewell, NormalisedBorewell } from './types'
import {
  layoutBorewells,
  getElevationBounds,
  makeYScale,
} from './geoUtils'
import { getSoilColor } from '@/lib/soilColors'
import { buildCrossSection } from '@/lib/crossSectionEngine'
import { validateBorewells } from '@/lib/geologyValidation'

// ─── Constants ───────────────────────────────────────────────────────────────

const ELEVATION_MARGIN = 8
const GOLD = '#c9933a'

// ─── Sub-components ──────────────────────────────────────────────────────────

interface TooltipData {
  soilType: string
  color: string
  x: number
  y: number
}

const GeologyTooltip = memo(function GeologyTooltip({ data }: { data: TooltipData }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={data.x - 4}
        y={data.y - 22}
        width={data.soilType.length * 7 + 28}
        height={26}
        rx={4}
        fill="#0f1117"
        fillOpacity={0.85}
      />
      <circle cx={data.x + 8} cy={data.y - 9} r={4} fill={data.color} />
      <text
        x={data.x + 17}
        y={data.y - 5}
        fontSize={11}
        fill="#e8e6df"
        fontFamily="var(--font-sans, sans-serif)"
      >
        {data.soilType}
      </text>
    </motion.g>
  )
});

const BoreholeSVG = memo(function BoreholeSVG({
  bw, index, colW, yScale, isHovered, onHover,
}: {
  bw: NormalisedBorewell
  index: number
  colW: number
  yScale: (msl: number) => number
  isHovered: boolean
  onHover: (id: string | null) => void
}) {
  const groundY = yScale(bw.groundMSL)
  const bottomMSL = Math.min(...bw.layers.map(l => l.bottomMSL))
  const bottomY = yScale(bottomMSL)
  const halfW = colW / 2

  return (
    <g className="cursor-pointer"
      onMouseEnter={() => onHover(bw.id)}
      onMouseLeave={() => onHover(null)}>
      
      {/* Background tube */}
      <rect x={bw.x - halfW} y={groundY} width={colW} height={Math.max(0, bottomY - groundY)}
        fill="#050e16" rx={2} />

      {/* Strata segments inside column */}
      {bw.layers.map((l, i) => {
        const y0 = yScale(l.topMSL)
        const y1 = yScale(l.bottomMSL)
        const lh = Math.max(1.5, y1 - y0)
        const char = l.soilType.charAt(0).toUpperCase()
        return (
          <g key={i}>
            <rect x={bw.x - halfW + 1} y={y0 + 0.5} width={colW - 2} height={Math.max(0, lh - 1)}
              fill={getSoilColor(l.soilType)} fillOpacity={0.92} rx={1} />
            <line x1={bw.x - halfW} y1={y1} x2={bw.x + halfW} y2={y1}
              stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
            {lh >= 14 && (
              <text x={bw.x} y={y0 + lh/2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.92)"
                fontSize={lh >= 18 ? 10 : 8} fontWeight={700} fontFamily="var(--font-mono)">
                {char}
              </text>
            )}
          </g>
        )
      })}

      {/* Gold outline */}
      <rect x={bw.x - halfW} y={groundY} width={colW} height={Math.max(0, bottomY - groundY)}
        fill="none" stroke={GOLD} strokeWidth={1.8} rx={2} opacity={isHovered ? 1 : 0.8} />

      {/* Number circle */}
      <circle cx={bw.x} cy={groundY - 16} r={8} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.6} />
      <text x={bw.x} y={groundY - 13} textAnchor="middle" fill={GOLD} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
        {index + 1}
      </text>

      {/* Labels */}
      <text x={bw.x} y={groundY - 28} textAnchor="middle" fill="currentColor" fontSize="9.5" fontWeight="600" fontFamily="var(--font-mono)">
        {bw.label}
      </text>
      <text x={bw.x} y={bottomY + 14} textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize="8.5" fontFamily="var(--font-mono)">
        {Math.abs(bw.groundMSL - bottomMSL).toFixed(0)}m
      </text>
    </g>
  )
});

const CrossSectionLegend = memo(function CrossSectionLegend({ soilTypes }: { soilTypes: string[] }) {
  const unique = Array.from(
    new Map(soilTypes.map(s => [s.toLowerCase().trim(), s])).values()
  )
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 pb-3 pt-2">
      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest mr-2">Legend:</span>
      {unique.map(soil => (
        <div key={soil} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: getSoilColor(soil) }} />
          <span className="text-[11px] text-shallows/70 leading-none">{soil}</span>
        </div>
      ))}
    </div>
  )
});

// ─── Main Component ──────────────────────────────────────────────────────────

import { ErrorBoundary } from '@/components/ErrorBoundary'

export interface CrossSectionViewProps {
  borewells: CrossSectionBorewell[]
  width?: number
  height?: number
  className?: string
}

const CrossSectionViewInner = memo(function CrossSectionViewInner({
  borewells,
  width = 900,
  height = 520,
  className,
}: CrossSectionViewProps) {
  const [mode, setMode] = useState<'smooth' | 'strict'>('smooth')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const PAD_L = 58, PAD_R = 32, PAD_TOP = 54
  const drawWidth = width - PAD_L - PAD_R

  // 1. Geological Validation
  const validation = useMemo(() => validateBorewells(borewells), [borewells])

  const normalised = useMemo(
    () => layoutBorewells(borewells, drawWidth, 60).map(bw => ({ ...bw, x: bw.x + PAD_L })),
    [borewells, drawWidth],
  )
  const bounds = useMemo(() => getElevationBounds(normalised, ELEVATION_MARGIN), [normalised])
  const yScale = useMemo(() => makeYScale(bounds, height, PAD_TOP), [bounds, height])

  const colW = Math.min(40, drawWidth / (normalised.length * 2.6))

  const svgDims = useMemo(() => ({
    marginY: PAD_TOP,
    chartH: height - PAD_TOP * 2,
    svgH: height
  }), [height])

  // 2. Continuous Geological Cross Section via Canonical Engine
  const polygons = useMemo(() => {
    if (!validation.isValid || borewells.length < 2) return []
    const xPositions = normalised.map(bw => bw.x)
    return buildCrossSection(
      borewells,
      xPositions,
      null, // Pass null to trigger MSL elevation correction
      mode,
      svgDims
    )
  }, [borewells, normalised, mode, svgDims, validation.isValid])

  const allSoilTypes = useMemo(() => {
    const seen = new Set<string>()
    const types: string[] = []
    for (const bw of borewells) {
      for (const l of bw.layers) {
        if (!seen.has(l.material)) {
          seen.add(l.material)
          types.push(l.material)
        }
      }
    }
    return types
  }, [borewells])

  // Safe Guard State checks
  if (borewells.length < 2) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border border-dashed border-white/10', className)}
        style={{ minHeight: height }}>
        <Mountain className="w-8 h-8 text-shallows/30" />
        <p className="text-sm text-shallows/50">
          Add at least two borewells to generate a cross-section.
        </p>
      </div>
    )
  }

  if (!validation.isValid) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border border-dashed border-red-500/20 bg-red-500/5', className)}
        style={{ minHeight: height }}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-red-400">Geological Validation Error</p>
        <p className="text-xs text-red-300/70 max-w-md px-4 leading-relaxed">{validation.error}</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-white/10 overflow-hidden', className)}
      style={{ background: '#0d0f15', minHeight: height }}>
      
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-surface/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Render:</span>
            <div className="flex bg-void rounded-lg p-0.5 border border-surface">
              {(['smooth', 'strict'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                    mode === m ? "bg-core text-void" : "text-text-muted hover:text-foam"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setShowInfo(v => !v)}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-shallows/50 hover:text-foam">
          {showInfo ? <X className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 text-[11px] text-shallows/60">
              <p>Geological bodies are interpolated using cubic Bezier curves for a smooth subsurface profile.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Canvas */}
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', color: '#e8e6df' }}
          onMouseLeave={() => setTooltip(null)}>
          
          <defs>
            <linearGradient id="xs-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1b24" />
              <stop offset="100%" stopColor="#091520" />
            </linearGradient>
          </defs>

          <rect width={width} height={height} fill="url(#xs-bg)" rx={8} />

          {/* Centered Styled Title */}
          <text x={width/2} y={19} textAnchor="middle" fill={GOLD} fontSize="11" fontWeight="700" letterSpacing="0.14em" fontFamily="var(--font-mono)">
            GEOLOGICAL CROSS-SECTION
          </text>
          <text x={width/2} y={32} textAnchor="middle" fill="currentColor" fillOpacity={0.25} fontSize="8.5" fontFamily="var(--font-mono)">
            {borewells.map(b => b.label).join("  →  ")}
          </text>

          {/* Y Axis Grid */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => {
            const msl = bounds.maxMSL - p * (bounds.maxMSL - bounds.minMSL)
            const y = yScale(msl)
            if (isNaN(y)) return null
            return (
              <g key={p}>
                <line x1={PAD_L - 6} y1={y} x2={width - PAD_R + 6} y2={y} stroke="white" strokeWidth="0.4" strokeDasharray="4,6" opacity="0.12" />
                <text x={PAD_L - 10} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity={0.3} fontSize="8.5" fontFamily="var(--font-mono)">
                  {msl.toFixed(0)}m
                </text>
              </g>
            )
          })}

          {/* Geological paths */}
          <g>
            {polygons.map((poly, i) => (
              <path key={i} d={poly.path} fill={poly.color || '#444'}
                fillOpacity={0.9} stroke={poly.color || '#444'} strokeWidth={1} opacity={0.9}
                onMouseMove={e => {
                  const svgEl = (e.currentTarget.ownerSVGElement as SVGSVGElement)
                  if (!svgEl) return
                  const pt = svgEl.createSVGPoint()
                  pt.x = e.clientX; pt.y = e.clientY
                  const ctm = svgEl.getScreenCTM()
                  if (!ctm) return
                  const svgPt = pt.matrixTransform(ctm.inverse())
                  setTooltip({ soilType: poly.displayName, color: poly.color, x: svgPt.x, y: svgPt.y })
                }}
                onMouseLeave={() => setTooltip(null)} />
            ))}
          </g>

          {/* Borewells */}
          {normalised.map((bw, i) => (
            <BoreholeSVG key={bw.id} bw={bw} index={i} colW={colW} yScale={yScale}
              isHovered={hoveredId === bw.id} onHover={setHoveredId} />
          ))}

          {/* Ground Line Label */}
          <line x1={PAD_L - 8} y1={PAD_TOP} x2={width - PAD_R + 8} y2={PAD_TOP} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.2" />
          <text x={PAD_L - 10} y={PAD_TOP + 4} textAnchor="end" fill="currentColor" fillOpacity={0.4} fontSize="8" fontFamily="var(--font-mono)">GL</text>

          {/* Tooltip */}
          <AnimatePresence>
            {tooltip && <GeologyTooltip data={tooltip} />}
          </AnimatePresence>
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="border-t border-white/10 bg-surface/10">
        <CrossSectionLegend soilTypes={allSoilTypes} />
      </div>
    </div>
  )
});

export const CrossSectionView = memo(function CrossSectionView(props: CrossSectionViewProps) {
  return (
    <ErrorBoundary>
      <CrossSectionViewInner {...props} />
    </ErrorBoundary>
  )
});
