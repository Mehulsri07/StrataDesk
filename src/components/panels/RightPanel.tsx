import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, MapPin, Ruler, CircleDot, Droplets, StickyNote, Plus, ArrowDownToLine, Palette, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { DEFAULT_MATERIALS } from '@/types';
import { getSoilColor } from '@/lib/soilColors';
import type { StrataLayer, Borewell } from '@/types';
import StrataChart from '../chart/StrataChart';

export default function RightPanel() {
  const { state, dispatch, getActiveBorewell, saveBorewell, deleteBorewell, addLayer, updateLayer, setLayers, showToast, toggleCrossSection } = useApp();
  const active = getActiveBorewell();
  const [formData, setFormData] = useState({
    name: '', location: '', latitude: '', longitude: '',
    diameter: 8, totalDepth: '', waterLevel: '', notes: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (active) {
        // Parse and validate values for auto-saving
        const patchData: Partial<Borewell> = {};
        if (field === 'name') patchData.name = String(value).trim();
        else if (field === 'location') patchData.location = String(value);
        else if (field === 'notes') patchData.notes = String(value);
        else if (field === 'diameter') patchData.diameter = Number(value);
        else if (field === 'latitude') {
          const lat = parseFloat(value);
          if (!isNaN(lat)) patchData.latitude = lat;
        }
        else if (field === 'longitude') {
          const lng = parseFloat(value);
          if (!isNaN(lng)) patchData.longitude = lng;
        }
        else if (field === 'totalDepth') {
          const td = parseFloat(value);
          if (!isNaN(td) && td >= 0) patchData.totalDepth = td;
        }
        else if (field === 'waterLevel') {
          const wl = value === '' ? null : parseFloat(value);
          if (wl === null || !isNaN(wl)) patchData.waterLevel = wl;
        }

        // Only save if there's something to patch
        if (Object.keys(patchData).length > 0) {
          saveBorewell(patchData);
        }
      }
      return next;
    });
  };

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
                color: getSoilColor(runMat),
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
            <h2 className="text-foam font-semibold text-sm tracking-wide uppercase flex items-center gap-2">
              {active ? 'Inspector' : state.pendingLatLng ? 'New Borewell' : 'Inspector'}
              {active && state.savingIds.includes(active.id) && (
                <Loader2 className="w-3.5 h-3.5 text-reef animate-spin ml-1.5" />
              )}
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
                    onChange={e => handleFieldChange('latitude', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="text-xs text-shallows/60 mb-1 block">Longitude</label>
                  <input
                    value={formData.longitude}
                    onChange={e => handleFieldChange('longitude', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="Auto"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-shallows/60 mb-1 block">Address</label>
                <input
                  value={formData.location}
                  onChange={e => handleFieldChange('location', e.target.value)}
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
                    onChange={e => handleFieldChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                    placeholder="BW-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-shallows/60 mb-1 block">Diameter (" )</label>
                    <select
                      value={formData.diameter}
                      onChange={e => handleFieldChange('diameter', e.target.value)}
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
                      onChange={e => handleFieldChange('totalDepth', e.target.value)}
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
                      onChange={e => handleFieldChange('waterLevel', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer p-2.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={active?.selectedForCrossSection || false}
                    onChange={() => active && toggleCrossSection(active.id)}
                    className="w-4 h-4 rounded border-white/20 bg-void text-core focus:ring-core/50 focus:ring-offset-0"
                  />
                  <span className="text-xs text-foam font-medium">Include in Cross-Section View</span>
                </label>
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
                        <LayerRow layer={layer} activeId={active.id} />
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
                onChange={e => handleFieldChange('notes', e.target.value)}
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

function LayerRow({ layer, activeId }: { layer: StrataLayer, activeId: string }) {
  const { updateLayer, deleteLayer, customMaterials, dispatch, showToast } = useApp();
  const [localStart, setLocalStart] = useState(layer.startDepth.toString());
  const [localEnd, setLocalEnd] = useState(layer.endDepth.toString());
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatColor, setNewMatColor] = useState('#78909C');

  const allMaterials = [
    ...DEFAULT_MATERIALS,
    ...customMaterials.filter(
      cm => !DEFAULT_MATERIALS.some(dm => dm.name.toLowerCase() === cm.name.toLowerCase())
    ),
  ];

  useEffect(() => {
    setLocalStart(layer.startDepth.toString());
    setLocalEnd(layer.endDepth.toString());
  }, [layer.startDepth, layer.endDepth]);

  const commitStart = () => {
    const v = parseFloat(localStart);
    if (!isNaN(v) && v !== layer.startDepth) {
      updateLayer(activeId, layer.id, { startDepth: v });
    } else {
      setLocalStart(layer.startDepth.toString());
    }
  };

  const commitEnd = () => {
    const v = parseFloat(localEnd);
    if (!isNaN(v) && v !== layer.endDepth) {
      updateLayer(activeId, layer.id, { endDepth: v });
    } else {
      setLocalEnd(layer.endDepth.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const handleAddMaterial = () => {
    const name = newMatName.trim();
    if (!name) { showToast('Enter a material name', 'error'); return; }
    const duplicate = allMaterials.some(m => m.name.toLowerCase() === name.toLowerCase());
    if (duplicate) { showToast('Material already exists', 'error'); return; }
    dispatch({ type: 'ADD_CUSTOM_MATERIAL', payload: { name, color: newMatColor } });
    // Immediately select the new material on this layer
    updateLayer(activeId, layer.id, { material: name, color: newMatColor });
    setNewMatName('');
    setNewMatColor('#78909C');
    setShowAddMaterial(false);
    showToast(`Material "${name}" added`, 'success');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: layer.color, boxShadow: `0 0 8px ${layer.color}40` }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-foam text-sm font-medium">{layer.material}</span>
          <span className="text-shallows/40 text-xs">{layer.endDepth - layer.startDepth} ft</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            value={localStart}
            onChange={e => setLocalStart(e.target.value)}
            onBlur={commitStart}
            onKeyDown={handleKeyDown}
            className="w-16 px-2 py-1 rounded text-xs text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50"
          />
          <span className="text-shallows/30">→</span>
          <input
            type="number"
            value={localEnd}
            onChange={e => setLocalEnd(e.target.value)}
            onBlur={commitEnd}
            onKeyDown={handleKeyDown}
            className="w-16 px-2 py-1 rounded text-xs text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50"
          />
          <span className="text-shallows/40 text-xs">ft</span>
        </div>
      </div>

      {/* Material selector + add button */}
      <div className="flex items-center gap-1">
        <select
          value={layer.material}
          onChange={e => {
            const selected = allMaterials.find(m => m.name === e.target.value);
            updateLayer(activeId, layer.id, {
              material: e.target.value,
              color: selected ? selected.color : getSoilColor(e.target.value),
            });
          }}
          className="text-xs text-foam bg-white/5 border border-white/10 rounded px-2 py-1.5 focus:outline-none focus:border-core/50 max-w-[110px]"
        >
          {DEFAULT_MATERIALS.length > 0 && (
            <optgroup label="Default" className="bg-void">
              {DEFAULT_MATERIALS.map(m => (
                <option key={m.name} value={m.name} className="bg-void">{m.name}</option>
              ))}
            </optgroup>
          )}
          {customMaterials.length > 0 && (
            <optgroup label="Custom" className="bg-void">
              {customMaterials.map(m => (
                <option key={m.name} value={m.name} className="bg-void">{m.name}</option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Add material button */}
        <button
          onClick={() => setShowAddMaterial(true)}
          title="Add custom material"
          className="text-shallows/40 hover:text-core transition-colors p-1 rounded"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={() => deleteLayer(activeId, layer.id)}
        className="text-shallows/30 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Add Material Modal */}
      <AnimatePresence>
        {showAddMaterial && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddMaterial(false)}
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 rounded-2xl p-5 shadow-2xl"
              style={{
                background: 'rgba(15, 17, 23, 0.97)',
                border: '1px solid rgba(169, 214, 229, 0.15)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-reef" />
                  <h3 className="text-foam text-sm font-semibold">New Material</h3>
                </div>
                <button
                  onClick={() => setShowAddMaterial(false)}
                  className="text-shallows/40 hover:text-foam transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-shallows/60 mb-1.5 block">Material Name</label>
                  <input
                    autoFocus
                    value={newMatName}
                    onChange={e => setNewMatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMaterial()}
                    placeholder="e.g. Laterite"
                    className="w-full px-3 py-2 rounded-lg text-sm text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 focus:ring-1 focus:ring-core/30 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs text-shallows/60 mb-1.5 block">Color</label>
                  <div className="flex items-center gap-3">
                    {/* Color preview swatch */}
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 border border-white/10"
                      style={{ background: newMatColor, boxShadow: `0 0 12px ${newMatColor}60` }}
                    />
                    {/* Native color picker */}
                    <input
                      type="color"
                      value={newMatColor}
                      onChange={e => setNewMatColor(e.target.value)}
                      className="flex-1 h-10 rounded-lg cursor-pointer bg-white/5 border border-white/10 px-1"
                    />
                    {/* Hex input */}
                    <input
                      type="text"
                      value={newMatColor}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setNewMatColor(v);
                      }}
                      className="w-24 px-2 py-2 rounded-lg text-xs text-foam bg-white/5 border border-white/10 focus:outline-none focus:border-core/50 font-mono"
                      placeholder="#78909C"
                    />
                  </div>
                </div>

                {/* Quick color presets */}
                <div>
                  <label className="text-xs text-shallows/60 mb-1.5 block">Quick Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '#E57373', '#F06292', '#BA68C8', '#7986CB',
                      '#4FC3F7', '#4DB6AC', '#81C784', '#DCE775',
                      '#FFB74D', '#FF8A65', '#A1887F', '#90A4AE',
                    ].map(c => (
                      <button
                        key={c}
                        onClick={() => setNewMatColor(c)}
                        className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110"
                        style={{
                          background: c,
                          borderColor: newMatColor === c ? '#fff' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowAddMaterial(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-shallows hover:text-foam bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddMaterial}
                  className="flex-1 py-2 rounded-xl text-sm text-foam font-medium bg-core hover:bg-shoal transition-colors"
                >
                  Add Material
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
