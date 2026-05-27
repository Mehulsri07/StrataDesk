import { useMemo, memo } from 'react';
import type { Borewell } from '@/types';
import { lightenColor, darkenColor, generateDepthTicks } from '@/types';

import { ErrorBoundary } from '@/components/ErrorBoundary';

interface StrataChartProps {
  borewell: Borewell;
  compact?: boolean;
}

const StrataChartInner = memo(function StrataChartInner({ borewell, compact = false }: StrataChartProps) {
  const chart = useMemo(() => {
    if (!borewell || borewell.layers.length === 0) return null;

    const width = compact ? 120 : 220;
    const height = compact ? 300 : 500;
    const labelMargin = compact ? 30 : 45;
    const barWidth = compact ? 60 : 100;
    const barX = labelMargin + 10;
    const depthTicks = generateDepthTicks(borewell.totalDepth);

    return (
      <svg width={width} height={height + (compact ? 10 : 20)} className="mx-auto">
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
            <feComposite in="noise" in2="SourceGraphic" operator="in" result="clipped" />
            <feBlend in="SourceGraphic" in2="clipped" mode="overlay" />
          </filter>
          {borewell.layers.map(layer => (
            <linearGradient key={layer.id} id={`grad-${layer.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lightenColor(layer.color, 30)} />
              <stop offset="100%" stopColor={darkenColor(layer.color, 20)} />
            </linearGradient>
          ))}
        </defs>

        {/* Depth axis */}
        <line
          x1={labelMargin} y1={0} x2={labelMargin} y2={height}
          stroke="rgba(169, 214, 229, 0.2)" strokeWidth={1}
        />
        {depthTicks.map(d => {
          const y = (d / borewell.totalDepth) * height;
          return (
            <g key={d}>
              <line x1={labelMargin - 4} y1={y} x2={labelMargin} y2={y}
                stroke="rgba(169, 214, 229, 0.15)" strokeWidth={1} />
              <text x={labelMargin - 8} y={y + 3} textAnchor="end"
                fill="rgba(169, 214, 229, 0.5)" fontSize={compact ? 8 : 9} fontFamily="Inter, sans-serif">
                {d.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Layers */}
        {borewell.layers.map((layer, i) => {
          const yStart = (layer.startDepth / borewell.totalDepth) * height;
          const yEnd = (layer.endDepth / borewell.totalDepth) * height;
          const h = Math.max(yEnd - yStart, 2);

          return (
            <g key={layer.id} className="strata-layer-animate" style={{ animationDelay: `${i * 0.08}s` }}>
              <rect
                x={barX} y={yStart} width={barWidth} height={h}
                fill={`url(#grad-${layer.id})`} rx={1}
                filter="url(#noise)" opacity={0.92}
              />
              {i > 0 && (
                <line x1={barX} y1={yStart} x2={barX + barWidth} y2={yStart}
                  stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
              )}
              {h > (compact ? 18 : 14) && (
                <text
                  x={barX + barWidth / 2} y={yStart + h / 2 + (compact ? 3 : 4)}
                  textAnchor="middle" fill="white"
                  fontSize={compact ? 9 : 10} fontWeight={500} fontFamily="Inter, sans-serif"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                >
                  {layer.material.length > (compact ? 6 : 10) && !compact
                    ? layer.material.substring(0, 8) + '...'
                    : layer.material}
                </text>
              )}
              {!compact && (
                <text
                  x={barX + barWidth + 6} y={yStart + h / 2 + 3}
                  fill="rgba(169, 214, 229, 0.5)" fontSize={8} fontFamily="Inter, sans-serif"
                >
                  {layer.startDepth}–{layer.endDepth} ft
                </text>
              )}
            </g>
          );
        })}

        {/* Water level */}
        {borewell.waterLevel && borewell.waterLevel > 0 && borewell.waterLevel <= borewell.totalDepth && (
          <g>
            <line
              x1={barX - 10} y1={(borewell.waterLevel / borewell.totalDepth) * height}
              x2={barX + barWidth + 10} y2={(borewell.waterLevel / borewell.totalDepth) * height}
              stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.8}
            />
            {!compact && (
              <text
                x={barX + barWidth + 14}
                y={(borewell.waterLevel / borewell.totalDepth) * height - 4}
                fill="#3b82f6" fontSize={8} fontWeight="bold" fontFamily="Inter, sans-serif"
              >
                Water: {borewell.waterLevel} ft
              </text>
            )}
          </g>
        )}
      </svg>
    );
  }, [borewell, compact]);

  // Stats
  const stats = useMemo(() => {
    if (!borewell || borewell.layers.length === 0) return null;
    const matSums: Record<string, number> = {};
    borewell.layers.forEach(l => {
      matSums[l.material] = (matSums[l.material] || 0) + (l.endDepth - l.startDepth);
    });
    return Object.entries(matSums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([mat, sum]) => `${mat}: ${Math.round((sum / borewell.totalDepth) * 100)}%`)
      .join('  ·  ');
  }, [borewell]);

  return (
    <div className="flex flex-col items-center">
      {!compact && stats && (
        <p className="text-xs text-shallows/50 mb-3 text-center">{stats}</p>
      )}
      {chart}
    </div>
  );
});

const StrataChart = memo(function StrataChart(props: StrataChartProps) {
  return (
    <ErrorBoundary>
      <StrataChartInner {...props} />
    </ErrorBoundary>
  );
});

export default StrataChart;
