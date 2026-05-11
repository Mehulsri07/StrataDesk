import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import type { CrossSectionMode } from '@/types';

export default function CrossSection() {
  const { state } = useApp();

  const selected = state.borewells.filter(b => b.selectedForCrossSection && b.layers.length > 0);

  const svgContent = useMemo(() => {
    if (selected.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-shallows/30">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <h3 className="text-foam text-lg font-medium mb-2">Cross-Section View</h3>
          <p className="text-shallows/50 text-sm max-w-sm">
            Select at least 2 borewells on the map to view a geological cross-section. Click the "Cross-Sec" button on any borewell popup.
          </p>
        </div>
      );
    }

    const maxDepth = Math.max(...selected.map(b => b.totalDepth));
    const colWidth = 200;
    const svgW = Math.max(800, selected.length * colWidth + 200);
    const svgH = 600;
    const marginX = 80;
    const marginY = 80;
    const chartW = svgW - marginX * 2;
    const chartH = svgH - marginY * 2;

    const depthScale = (d: number) => marginY + (d / maxDepth) * chartH;
    const xPos = (i: number) => marginX + 80 + i * colWidth;

    return (
      <svg width={svgW} height={svgH} className="mx-auto" style={{ minWidth: svgW }}>
        <defs>
          <filter id="noise-cs">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend mode="multiply" in2="SourceGraphic" />
          </filter>
          {selected.flatMap(bw =>
            bw.layers.map(layer => (
              <linearGradient key={`grad-cs-${layer.id}`} id={`grad-cs-${layer.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={layer.color} stopOpacity={1} />
                <stop offset="100%" stopColor={layer.color} stopOpacity={0.6} />
              </linearGradient>
            ))
          )}
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="transparent" />

        {/* Depth axis */}
        <line x1={marginX} y1={marginY} x2={marginX} y2={marginY + chartH}
          stroke="rgba(169, 214, 229, 0.2)" strokeWidth={1} />

        {Array.from({ length: 11 }, (_, i) => (maxDepth / 10) * i).map(depth => {
          const y = depthScale(depth);
          return (
            <g key={depth}>
              <line x1={marginX - 5} y1={y} x2={marginX} y2={y}
                stroke="rgba(169, 214, 229, 0.15)" strokeWidth={1} />
              <text x={marginX - 10} y={y + 4} textAnchor="end"
                fill="rgba(169, 214, 229, 0.5)" fontSize={10} fontFamily="Inter, sans-serif">
                {depth.toFixed(0)} ft
              </text>
              {/* Grid line */}
              <line x1={marginX} y1={y} x2={marginX + chartW} y2={y}
                stroke="rgba(169, 214, 229, 0.06)" strokeWidth={1} strokeDasharray="4 4" />
            </g>
          );
        })}

        {/* Smooth connections between layers */}
        {state.crossSectionMode === 'smooth' && selected.map((bwA, i) => {
          if (i >= selected.length - 1) return null;
          const bwB = selected[i + 1];
          const x1 = xPos(i);
          const x2 = xPos(i + 1);
          const midX = (x1 + x2) / 2;

          return bwA.layers.map(layerA => {
            return bwB.layers.map(layerB => {
              const materialMatch = layerA.material.toLowerCase().trim() === layerB.material.toLowerCase().trim();
              const depthMatch = Math.abs(layerA.startDepth - layerB.startDepth) <= 5 &&
                Math.abs(layerA.endDepth - layerB.endDepth) <= 5;
              if (!materialMatch && !depthMatch) return null;

              const y1s = depthScale(layerA.startDepth);
              const y1e = depthScale(layerA.endDepth);
              const y2s = depthScale(layerB.startDepth);
              const y2e = depthScale(layerB.endDepth);

              return (
                <path
                  key={`${layerA.id}-${layerB.id}`}
                  d={`M ${x1 + 40} ${y1s} L ${x1 + 40} ${y1e} C ${midX} ${y1e}, ${midX} ${y2e}, ${x2 - 40} ${y2e} L ${x2 - 40} ${y2s} C ${midX} ${y2s}, ${midX} ${y1s}, ${x1 + 40} ${y1s} Z`}
                  fill={layerA.color}
                  fillOpacity={materialMatch ? 0.55 : 0.25}
                  stroke="none"
                />
              );
            });
          });
        })}

        {/* Individual borewell columns */}
        {selected.map((bw, idx) => {
          const x = xPos(idx);
          return (
            <g key={bw.id}>
              {/* Name */}
              <text x={x} y={marginY - 20} textAnchor="middle"
                fill="#a9d6e5" fontSize={12} fontWeight={600} fontFamily="Inter, sans-serif">
                {bw.name}
              </text>
              <text x={x} y={marginY - 6} textAnchor="middle"
                fill="rgba(169, 214, 229, 0.4)" fontSize={9} fontFamily="Inter, sans-serif">
                {bw.totalDepth} ft
              </text>

              {/* Depth ticks for each borewell */}
              {[0, 0.25, 0.5, 0.75, 1].map(p => {
                const d = bw.totalDepth * p;
                const y = depthScale(d);
                return (
                  <line key={p} x1={x - 45} y1={y} x2={x - 40} y2={y}
                    stroke="rgba(169, 214, 229, 0.1)" strokeWidth={1} />
                );
              })}

              {/* Layers */}
              {bw.layers.map(layer => {
                const yS = depthScale(layer.startDepth);
                const yE = depthScale(layer.endDepth);
                const h = yE - yS;

                return (
                  <g key={layer.id}>
                    <rect
                      x={x - 40} y={yS} width={80} height={Math.max(h, 1)}
                      fill={`url(#grad-cs-${layer.id})`}
                      stroke="rgba(0,0,0,0.2)" strokeWidth={1}
                      filter="url(#noise-cs)"
                      rx={1}
                    />
                    {h > 20 && (
                      <text
                        x={x} y={yS + h / 2 + 4} textAnchor="middle"
                        fill="white" fontSize={9} fontWeight={500}
                        fontFamily="Inter, sans-serif"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                      >
                        {layer.material.length > 10 ? layer.material.substring(0, 9) + '..' : layer.material}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Column border */}
              <rect
                x={x - 40} y={marginY} width={80} height={chartH}
                fill="none" stroke="rgba(169, 214, 229, 0.1)" strokeWidth={1} rx={2}
              />
            </g>
          );
        })}
      </svg>
    );
  }, [selected, state.crossSectionMode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-30 flex flex-col"
      style={{ background: '#012a4a', top: 56 }}
    >
      {/* Controls */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/5">
        <span className="text-shallows/50 text-xs uppercase tracking-wider font-medium">Cross-Section Mode</span>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(169, 214, 229, 0.06)' }}>
          <ModeButton active={state.crossSectionMode === 'smooth'} label="Smooth Flow" mode="smooth" />
          <ModeButton active={state.crossSectionMode === 'strict'} label="Strict Layer" mode="strict" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-shallows/40 text-xs">{selected.length} borewells selected</span>
        </div>
      </div>

      {/* SVG Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center py-8">
        {svgContent}
      </div>
    </motion.div>
  );
}

function ModeButton({ active, label, mode }: { active: boolean; label: string; mode: CrossSectionMode }) {
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
