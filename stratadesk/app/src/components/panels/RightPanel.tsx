import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Ruler, CircleDot, Droplets, StickyNote, Plus, ArrowDownToLine } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { DEFAULT_MATERIALS, getColorForMaterial } from '@/types';
import type { StrataLayer } from '@/types';
import StrataChart from '../charts/StrataChart';

export default function RightPanel() {
  const { state, dispatch, getActiveBorewell, saveBorewell, deleteBorewell, addLayer, deleteLayer, updateLayer, setLayers, showToast } = useApp();
  const active = getActiveBorewell();
  const [formData, setFormData] = useState({
    name: '', location: '', latitude: '', longitude: '',
    diameter: 8, totalDepth: '', waterLevel: '', notes: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) {
      setFormData({
        name: active.name || '',
        location: active.location || '',
        latitude: active.latitude?.toString() || '',
        longitude: active.longitude?.toString() || '',
        diameter: active.diameter || 8,
        totalDepth: active.totalDepth?.toString() || '',
        waterLevel: active.waterLevel?.toString() || '',
        notes: active.notes || '',
      });
    } else {
      // No active borewell — reset form, pre-fill coords if a location was pinned
      setFormData({
        name: '',
        location: '',
        latitude: state.pendingLatLng ? state.pendingLatLng.lat.toFixed(6) : '',
        longitude: state.pendingLatLng ? state.pendingLatLng.lng.toFixed(6) : '',
        diameter: 8,
        totalDepth: '',
        waterLevel: '',
        notes: '',
      });
    }
  }, [active, state.pendingLatLng]);

  const handleSave = () => {
    if (!formData.name.trim()) { showToast('Please enter a borewell name', 'error'); return; }
    const td = parseFloat(formData.totalDepth);
    if (!td || td <= 0) { showToast('Please enter a valid total depth', 'error'); return; }
    saveBorewell({
      name: formData.name.trim(),
      location: formData.location,
      latitude: parseFloat(formData.latitude) || 0,
      longitude: parseFloat(formData.longitude) || 0,
      diameter: Number(formData.diameter),
      totalDepth: td,
      waterLevel: formData.waterLevel ? parseFloat(formData.waterLevel) : null,
      notes: formData.notes,
    });
    showToast('Borewell saved successfully', 'success');
  };

  const handleDelete = () => {
    if (!active) return;
    if (!confirm('Delete this borewell? This cannot be undone.')) return;
    deleteBorewell(active.id);
    showToast('Borewell deleted', 'info');
  };

  const handleAddLayer = () => {
    if (!active) { showToast('Save the borewell first', 'error'); return; }
    addLayer(active.id);
  };

  const handleAutoClose = () => {
    if (!active || active.layers.length === 0 || !active.totalDepth) return;
    const lastLayer = [...active.layers].sort((a, b) => a.startDepth - b.startDepth)[active.layers.length - 1];
    if (lastLayer.endDepth < active.totalDepth) {
      updateLayer(active.id, lastLayer.id, { endDepth: active.totalDepth });
      showToast('Last layer closed to total depth', 'success');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    parseFile(file, active.id);
  };

  const parseFile = (file: File, borewellId: string) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array((ev.target as FileReader).result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

          const candidates: { r: number; dc: number; depth: number; mc: number; material: string }[] = [];
          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;
            for (let dc = 0; dc < row.length; dc++) {
              const raw = String(row[dc]).trim();
              if (!raw || !/^\d+(\.\d+)?$/.test(raw)) continue;
              const depth = parseFloat(raw);
              if (depth <= 0 || depth > 5000) continue;
              for (let mc = 0; mc < row.length; mc++) {
                if (mc === dc) continue;
                const mat = String(row[mc]).trim();
                if (!mat || mat.length < 2 || mat.length > 60) continue;
                if (!/^[A-Za-z]/.test(mat)) continue;
                if (/^\d+(\.\d+)?$/.test(mat)) continue;
                if (/pipe|screen|pump|bore|tube|well|site|date|client|driller|level|dia|lowering|assembly/i.test(mat)) continue;
                candidates.push({ r, dc, depth, mc, material: mat });
              }
            }
          }

          if (candidates.length === 0) { showToast('No strata data found in file', 'error'); return; }

          const scores: Record<string, number> = {};
          for (const c of candidates) { scores[`${c.dc}|${c.mc}`] = (scores[`${c.dc}|${c.mc}`] || 0) + 1; }
          const [bestDc, bestMc] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0].split('|').map(Number);

          const seen = new Set<number>();
          const dataRows = candidates
            .filter(c => c.dc === bestDc && c.mc === bestMc)
            .sort((a, b) => a.depth - b.depth)
            .filter(c => { if (seen.has(c.depth)) return false; seen.add(c.depth); return true; });

          const merged: StrataLayer[] = [];
          let runMat = dataRows[0].material;
          for (let i = 1; i <= dataRows.length; i++) {
            const cur = dataRows[i];
            if (i === dataRows.length || cur.material.toLowerCase() !== runMat.toLowerCase()) {
              merged.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                startDepth: merged.length === 0 ? 0 : merged[merged.length - 1].endDepth,
                endDepth: dataRows[i - 1].depth,
                material: runMat,
                color: getColorForMaterial(runMat),
              });
              if (cur) runMat = cur.material;
            }
          }

          setLayers(borewellId, merged);
          showToast(`Imported ${merged.length} layers from Excel`, 'success');
        } catch (err) {
          showToast('Failed to parse Excel file', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast('Please upload .xlsx or .xls files', 'error');
    }
  };

  return (
    <AnimatePresence>
      {state.rightPanelOpen && (
        <motion.aside
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-14 bottom-0 w-[400px] z-40 flex flex-col overflow-hidden"
          style={{
            background: 'rgba(15, 17, 23, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(169, 214, 229, 0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <h2 className="text-foam font-semibold text-sm tracking-wide uppercase">
              {active ? 'Inspector' : state.pendingLatLng ? 'New Borewell' : 'Inspector'}
            </h2>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-shallows hover:text-foam hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Location Section */}
            <Section icon={<MapPin className="w-4 h-4" />} title="Location">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-shallows/60 mb-1 block">Latitude</label>
                  <input
                    value={formData.latitude}
                    onChange={e => setFormData(p => ({ ...p, latitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="text-xs text-shallows/60 mb-1 block">Longitude</label>
                  <input
                    value={formData.longitude}
                    onChange={e => setFormData(p => ({ ...p, longitude: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="Auto"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-shallows/60 mb-1 block">Address</label>
                <input
                  value={formData.location}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                  placeholder="Location description"
                />
              </div>
            </Section>

            {/* Borewell Info */}
            <Section icon={<CircleDot className="w-4 h-4" />} title="Borewell Info">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-shallows/60 mb-1 block">Name *</label>
                  <input
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="BW-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-shallows/60 mb-1 block">Diameter (" )</label>
                    <select
                      value={formData.diameter}
                      onChange={e => setFormData(p => ({ ...p, diameter: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 transition-all appearance-none"
                    >
                      {[8, 10, 12, 14, 16, 18, 20, 24].map(d => (
                        <option key={d} value={d} className="bg-void">{d}"</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-shallows/60 mb-1 block">Total Depth (ft) *</label>
                    <input
                      type="number"
                      value={formData.totalDepth}
                      onChange={e => setFormData(p => ({ ...p, totalDepth: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-shallows/60 mb-1 block">Water Level (ft)</label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-reef" />
                    <input
                      type="number"
                      value={formData.waterLevel}
                      onChange={e => setFormData(p => ({ ...p, waterLevel: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-core text-foam text-sm font-medium hover:bg-shoal transition-colors shadow-glass"
              >
                <Save className="w-4 h-4" />
                {active ? 'Update' : 'Save'}
              </motion.button>
              {active && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-300 text-sm font-medium hover:bg-red-500/25 transition-colors border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </div>

            {/* Strata Layers */}
            {active && (
              <Section icon={<Ruler className="w-4 h-4" />} title={`Geological Layers (${active.layers.length})`}>
                {/* Import */}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-shallows text-xs hover:bg-white/10 hover:text-foam transition-all border border-dashed border-white/10 mb-3"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Import from Excel
                </button>

                {/* Layer actions */}
                <div className="flex gap-2 mb-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddLayer}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-tide text-xs font-medium hover:bg-white/10 hover:text-foam transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Layer
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAutoClose}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-tide text-xs font-medium hover:bg-white/10 hover:text-foam transition-all"
                  >
                    Auto Close
                  </motion.button>
                </div>

                {/* Layer Cards */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {active.layers.map((layer, i) => (
                      <motion.div
                        key={layer.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex-shrink-0"
                            style={{ background: layer.color, boxShadow: `0 0 8px ${layer.color}40` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-foam text-sm font-medium">{layer.material}</span>
                              <span className="text-shallows/40 text-xs">{layer.endDepth - layer.startDepth} ft</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                value={layer.startDepth}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v)) updateLayer(active.id, layer.id, { startDepth: v });
                                }}
                                className="w-16 px-2 py-1 rounded text-xs text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50"
                              />
                              <span className="text-shallows/30">→</span>
                              <input
                                type="number"
                                value={layer.endDepth}
                                onChange={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v)) updateLayer(active.id, layer.id, { endDepth: v });
                                }}
                                className="w-16 px-2 py-1 rounded text-xs text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50"
                              />
                              <span className="text-shallows/40 text-xs">ft</span>
                            </div>
                          </div>
                          <select
                            value={layer.material}
                            onChange={e => {
                              updateLayer(active.id, layer.id, {
                                material: e.target.value,
                                color: getColorForMaterial(e.target.value),
                              });
                            }}
                            className="text-xs text-foam bg-white/5 border border-white/10 rounded px-2 py-1.5 focus:outline-none focus:border-core/50"
                          >
                            {DEFAULT_MATERIALS.map(m => (
                              <option key={m.name} value={m.name} className="bg-void">{m.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteLayer(active.id, layer.id)}
                            className="text-shallows/30 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {active.layers.length === 0 && (
                    <div className="text-center py-6 text-shallows/30 text-sm">
                      No layers yet. Add a layer or import from Excel.
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Notes */}
            <Section icon={<StickyNote className="w-4 h-4" />} title="Notes">
              <textarea
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all resize-none"
                placeholder="Field notes..."
              />
            </Section>

            {/* Strata Chart */}
            {active && active.layers.length > 0 && (
              <Section icon={<Ruler className="w-4 h-4" />} title="Strata Visualization">
                <StrataChart borewell={active} />
              </Section>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-reef">{icon}</span>
        <h3 className="text-tide text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
