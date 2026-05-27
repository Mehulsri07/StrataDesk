import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { Activity, Cpu, Database, HardDrive, ShieldCheck } from 'lucide-react';

interface ApiLatency {
  path: string;
  duration: number;
}

export function PerformancePanel() {
  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState<string | null>(null);
  const [csBuildTime, setCsBuildTime] = useState<number>(0);
  const [apiLatencies, setApiLatencies] = useState<ApiLatency[]>([]);
  const [renders, setRenders] = useState(0);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);

  // Track rendering updates of this panel as a proxy for UI churn
  renderCountRef.current += 1;

  // FPS & Memory loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        // Fetch memory if supported
        const perfMem = (performance as any).memory;
        if (perfMem) {
          const usedMB = (perfMem.usedJSHeapSize / 1048576).toFixed(1);
          const limitMB = (perfMem.jsHeapSizeLimit / 1048576).toFixed(0);
          setMemory(`${usedMB} / ${limitMB} MB`);
        } else {
          setMemory('Not Supported');
        }

        // Pull metrics from window
        const win = window as any;
        if (win._strataPerfMetrics) {
          if (win._strataPerfMetrics.crossSectionBuildTime !== undefined) {
            setCsBuildTime(win._strataPerfMetrics.crossSectionBuildTime);
          }
          if (win._strataPerfMetrics.apiLatencies) {
            setApiLatencies([...win._strataPerfMetrics.apiLatencies]);
          }
        }
        setRenders(renderCountRef.current);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="fixed bottom-4 left-4 z-[999] rounded-xl overflow-hidden shadow-glass border border-white/10 select-none text-shallows"
      style={{
        background: 'rgba(15, 17, 23, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        width: isOpen ? 280 : 44,
        height: isOpen ? 'auto' : 44,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
    >
      {/* Toggle button / Collapsed Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 flex items-center justify-between px-3 hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 text-gold ${fps < 30 ? 'animate-pulse text-red-400' : ''}`} />
          {isOpen && (
            <span className="text-xs font-bold uppercase tracking-wider text-foam">
              Performance Monitor
            </span>
          )}
        </div>
        {isOpen && (
          <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-gold/20">
            DEV
          </span>
        )}
      </button>

      {/* Expanded panel content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3.5 text-[11px] border-t border-white/5">
          {/* Framerate & Memory */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/[0.03] p-2 rounded-lg border border-white/5 flex flex-col justify-between">
              <span className="text-shallows/45 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> Performance
              </span>
              <span className={`text-base font-extrabold mt-1 font-mono leading-none ${fps < 45 ? 'text-red-400' : 'text-teal-light'}`}>
                {fps} <span className="text-[9px] font-normal text-shallows/60">FPS</span>
              </span>
            </div>
            <div className="bg-white/[0.03] p-2 rounded-lg border border-white/5 flex flex-col justify-between">
              <span className="text-shallows/45 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5" /> JS Heap
              </span>
              <span className="text-[11px] font-bold mt-1.5 font-mono truncate text-foam">
                {memory || 'Measuring...'}
              </span>
            </div>
          </div>

          {/* Engine Metric */}
          <div className="space-y-1.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
            <div className="flex justify-between items-baseline">
              <span className="text-shallows/50 text-[9px] uppercase tracking-wider font-semibold">
                Cross-Section Build
              </span>
              <span className={`font-mono font-bold ${csBuildTime > 250 ? 'text-red-400' : 'text-teal-light'}`}>
                {csBuildTime ? `${csBuildTime.toFixed(1)} ms` : 'Idle'}
              </span>
            </div>
            {/* Status bar */}
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  csBuildTime > 250 ? 'bg-red-500' : csBuildTime > 100 ? 'bg-amber-400' : 'bg-teal-light'
                }`}
                style={{ width: `${Math.min(100, (csBuildTime / 300) * 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-shallows/40 leading-relaxed">
              Limit: 250ms on main thread. Above this triggers Web Worker migration.
            </p>
          </div>

          {/* Dataset counts */}
          <div className="space-y-1.5">
            <span className="text-shallows/40 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Workspace Dataset
            </span>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div className="bg-white/[0.02] py-1 px-1.5 rounded border border-white/5">
                <div className="text-[10px] text-shallows/50">Borewells</div>
                <div className="text-xs font-bold text-foam mt-0.5">{state.borewells.length}</div>
              </div>
              <div className="bg-white/[0.02] py-1 px-1.5 rounded border border-white/5">
                <div className="text-[10px] text-shallows/50">Selected</div>
                <div className="text-xs font-bold text-gold mt-0.5">{state.selectedBorewells.length}</div>
              </div>
              <div className="bg-white/[0.02] py-1 px-1.5 rounded border border-white/5">
                <div className="text-[10px] text-shallows/50">Renders</div>
                <div className="text-xs font-bold text-teal-light mt-0.5">{renders}</div>
              </div>
            </div>
          </div>

          {/* Last API Latencies */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-shallows/40 text-[9px] uppercase tracking-wider font-semibold">
              <span>API Query Latency</span>
              <span className="text-[8px] bg-white/5 px-1 py-0.2 rounded font-normal lowercase">cache enabled</span>
            </div>
            <div className="space-y-1 max-h-[72px] overflow-y-auto pr-1">
              {apiLatencies.length === 0 ? (
                <div className="text-[10px] text-shallows/30 text-center py-2 italic bg-white/[0.01] rounded border border-dashed border-white/5">
                  No requests made yet
                </div>
              ) : (
                apiLatencies.map((latency, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white/[0.02] px-2 py-1.5 rounded border border-white/5 font-mono text-[9.5px]"
                  >
                    <span className="text-foam truncate max-w-[150px]">{latency.path}</span>
                    <span className={`font-bold ${latency.duration > 300 ? 'text-red-400' : 'text-teal-light'}`}>
                      {latency.duration.toFixed(0)}ms
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-1.5 text-[9px] text-shallows/35 border-t border-white/5 pt-2">
            <ShieldCheck className="w-3 h-3 text-gold/60" />
            <span>StrataDesk Bundled Optimized (v1.2.0)</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformancePanel;
