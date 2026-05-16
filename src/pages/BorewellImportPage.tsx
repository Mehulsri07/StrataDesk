import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useApp } from '@/store/AppContext'
import { generateId } from '@/types'
import { getSoilColor } from '@/lib/soilColors'
import { 
  ArrowLeft, FileText, Camera, MapPin, 
  Check, AlertCircle, X, Mountain, Info, Layers,
  Calendar, Droplets, Target
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import exifr from 'exifr'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedBorewell {
  siteName: string
  address: string
  lat: number | null
  lng: number | null
  photoUrl: string | null
  date: string
  waterLevelFt: number
  totalDepthFt: number
  boreDia: string
  layers: {
    fromDepth: number
    toDepth: number
    soilType: string
    assembly: string
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function BorewellImportPage() {
  const navigate = useNavigate()
  const { saveBorewell } = useApp()

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Raw files
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)

  // Preview data
  const [preview, setPreview] = useState<ParsedBorewell | null>(null)
  const [isManual, setIsManual] = useState(false)

  const startManualEntry = () => {
    setIsManual(true)
    setPreview({
      siteName: 'New Borewell Site',
      address: '',
      lat: 26.8467,
      lng: 80.9462,
      photoUrl: null,
      date: new Date().toISOString().split('T')[0],
      waterLevelFt: 0,
      totalDepthFt: 0,
      boreDia: '12" / 300 ft',
      layers: []
    })
  }

  const updatePreview = (field: keyof ParsedBorewell, value: any) => {
    setPreview(prev => prev ? { ...prev, [field]: value } : null)
  }

  const addLayer = () => {
    setPreview(prev => {
      if (!prev) return null
      const lastLayer = prev.layers[prev.layers.length - 1]
      const fromDepth = lastLayer ? lastLayer.toDepth : 0
      return {
        ...prev,
        layers: [...prev.layers, { fromDepth, toDepth: fromDepth + 10, soilType: 'Clay', assembly: 'Plain pipe' }]
      }
    })
  }

  const removeLayer = (index: number) => {
    setPreview(prev => prev ? { ...prev, layers: prev.layers.filter((_, i) => i !== index) } : null)
  }

  const updateLayer = (index: number, field: string, value: any) => {
    setPreview(prev => {
      if (!prev) return null
      const newLayers = [...prev.layers]
      newLayers[index] = { ...newLayers[index], [field]: value }
      return { ...prev, layers: newLayers }
    })
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setLoading(true)
    setError(null)

    try {
      // Extract GPS from photo
      const gps = await exifr.gps(file)
      const photoUrl = URL.createObjectURL(file)

      setPreview(prev => ({
        ...(prev || {
          siteName: '', address: '', date: new Date().toLocaleDateString(),
          waterLevelFt: 0, totalDepthFt: 0, boreDia: '', layers: []
        }),
        lat: gps?.latitude || null,
        lng: gps?.longitude || null,
        photoUrl
      }))

      if (!gps) {
        setError("This photo doesn't contain GPS metadata. You may need to enter coordinates manually.")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to process image metadata.")
    } finally {
      setLoading(false)
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelFile(file)
    setLoading(true)
    setError(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      // Parse logic based on "IPL Dewa Road 6.xlsx" reference
      // The user specified address is between A5-A8 (index 4-7, col 0)
      const addressParts = rows.slice(4, 8).map(r => String(r[0] || "").trim()).filter(Boolean)
      const address = addressParts.join(", ")
      const siteName = addressParts[0] || "New Borewell Site"

      let waterLevel = 0
      let boreDia = ""
      let totalDepth = 0
      const layers: any[] = []
      let parsedDate = new Date().toISOString().split('T')[0] // fallback to today

      rows.forEach((row, i) => {
        const colA = String(row[0] || "")

        // Extract date from rows like "Date : 03/4/2025"
        if (colA.toLowerCase().startsWith("date")) {
          const dateMatch = colA.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
          if (dateMatch) {
            const [, day, month, year] = dateMatch
            parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }

        if (colA.toLowerCase().includes("water level")) {
          waterLevel = parseFloat(colA.match(/(\d+)/)?.[1] || "0")
        }
        if (colA.toLowerCase().includes("bore dia")) {
          boreDia = colA
          totalDepth = parseFloat(colA.match(/\/ (\d+)/)?.[1] || "0")
        }

        // Layers start at Row 5
        if (i >= 4) {
          const depth = parseFloat(row[1])
          const soilType = String(row[3] || "").trim()
          const assembly = String(row[5] || "Plain pipe").trim()
          
          if (!isNaN(depth) && soilType && soilType !== "Lowering Assambly") {
            const prevDepth = layers.length > 0 ? layers[layers.length - 1].toDepth : 0
            if (depth > prevDepth) {
              layers.push({
                fromDepth: prevDepth,
                toDepth: depth,
                soilType,
                assembly
              })
            }
          }
        }
      })

      setPreview(prev => ({
        ...(prev || { lat: null, lng: null, photoUrl: null, date: parsedDate }),
        siteName,
        address,
        date: parsedDate,
        waterLevelFt: waterLevel,
        boreDia,
        totalDepthFt: totalDepth,
        layers
      }))

    } catch (err) {
      console.error(err)
      setError("Failed to parse Excel file. Ensure it matches the required format.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    
    try {
      await saveBorewell({
        name: preview.siteName,
        location: preview.address,
        latitude: preview.lat || 0,
        longitude: preview.lng || 0,
        diameter: parseFloat(preview.boreDia) || 12,
        totalDepth: preview.totalDepthFt,
        waterLevel: preview.waterLevelFt,
        notes: `Imported on ${new Date().toLocaleDateString()}`,
        layers: preview.layers.map(l => ({
          id: generateId(),
          startDepth: l.fromDepth,
          endDepth: l.toDepth,
          material: l.soilType,
          color: getSoilColor(l.soilType),
        })),
        selectedForCrossSection: false,
      })
      setSuccess(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err: any) {
      setError(err.message || "Failed to save borewell to database.")
    } finally {
      setLoading(false)
    }
  }

  // ── Render Helpers ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-void text-foam font-sans selection:bg-core/30">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-void/80 backdrop-blur-md border-b border-surface px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-surface transition-colors text-text-muted hover:text-foam"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-display font-semibold text-foam">Import Borewell</h1>
              <p className="text-xs text-text-muted mt-0.5">Add new site records via Geotag & Excel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-foam transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!preview || loading}
              onClick={handleSave}
              className={cn(
                "px-6 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2",
                preview
                  ? "bg-core hover:bg-shoal text-void shadow-lg shadow-core/20"
                  : "bg-surface text-text-muted cursor-not-allowed"
              )}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {success ? "Saved!" : "Confirm & Save"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── Left Column: Upload Controls ────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Step 1: Photo */}
          <section className="bg-deep-void rounded-2xl border border-surface p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-core/10 border border-core/20 flex items-center justify-center text-core font-bold text-sm">1</div>
              <h2 className="font-semibold text-foam">Geotagged Photo</h2>
            </div>
            <p className="text-xs text-text-muted">Upload a photo taken at the site. We'll automatically extract coordinates from its metadata.</p>
            
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer",
              photoFile ? "border-teal-light/40 bg-teal-light/5" : "border-surface hover:border-core/40 hover:bg-core/5"
            )}>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {photoFile ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-teal-light/10 flex items-center justify-center text-teal-light">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foam">{photoFile.name}</p>
                    <p className="text-[10px] text-text-muted mt-1">{(photoFile.size / 1024).toFixed(0)} KB · Click to change</p>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-text-muted group-hover:text-core" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foam">Select or drag photo</p>
                    <p className="text-[10px] text-text-muted mt-1">JPEG, PNG with GPS data</p>
                  </div>
                </>
              )}
            </label>
          </section>

          {/* Step 2: Excel */}
          <section className="bg-deep-void rounded-2xl border border-surface p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-core/10 border border-core/20 flex items-center justify-center text-core font-bold text-sm">2</div>
              <h2 className="font-semibold text-foam">Strata Excel File</h2>
            </div>
            <p className="text-xs text-text-muted">Upload the completed Strata Chart Excel file. We'll parse the formations, depth, and metadata.</p>
            
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer",
              excelFile ? "border-teal-light/40 bg-teal-light/5" : "border-surface hover:border-core/40 hover:bg-core/5"
            )}>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              {excelFile ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-teal-light/10 flex items-center justify-center text-teal-light">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foam">{excelFile.name}</p>
                    <p className="text-[10px] text-text-muted mt-1">Excel Spreadsheet · Click to change</p>
                  </div>
                </>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-text-muted group-hover:text-core" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foam">Select Excel file</p>
                    <p className="text-[10px] text-text-muted mt-1">.xlsx or .xls</p>
                  </div>
                </>
              )}
            </label>
          </section>

          {!isManual && !preview && (
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-surface bg-deep-void/40">
              <p className="text-xs text-text-muted text-center">Don't have files? You can also enter the details manually.</p>
              <button 
                onClick={startManualEntry}
                className="text-xs font-semibold text-core hover:text-shoal underline underline-offset-4"
              >
                Skip upload & enter manually
              </button>
            </div>
          )}

          {isManual && (
            <section className="bg-deep-void rounded-2xl border border-surface p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-core/10 border border-core/20 flex items-center justify-center text-core font-bold text-sm">
                    <Info className="w-4 h-4" />
                  </div>
                  <h2 className="font-semibold text-foam">Manual Details</h2>
                </div>
                <button onClick={() => setIsManual(false)} className="text-[10px] text-text-muted hover:text-foam">
                  Back to upload
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-text-muted uppercase mb-1 block">Site Name</label>
                  <input 
                    value={preview?.siteName || ''} 
                    onChange={e => updatePreview('siteName', e.target.value)}
                    className="w-full bg-void border border-surface rounded-lg px-3 py-2 text-xs text-foam focus:outline-none focus:border-core/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase mb-1 block">Latitude</label>
                    <input 
                      type="number"
                      step="0.000001"
                      value={preview?.lat || ''} 
                      onChange={e => updatePreview('lat', parseFloat(e.target.value))}
                      className="w-full bg-void border border-surface rounded-lg px-3 py-2 text-xs text-foam focus:outline-none focus:border-core/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase mb-1 block">Longitude</label>
                    <input 
                      type="number"
                      step="0.000001"
                      value={preview?.lng || ''} 
                      onChange={e => updatePreview('lng', parseFloat(e.target.value))}
                      className="w-full bg-void border border-surface rounded-lg px-3 py-2 text-xs text-foam focus:outline-none focus:border-core/50"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-4 rounded-xl bg-amber-600/10 border border-amber-600/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-200 leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right Column: Preview ────────────────────────────────────────── */}
        <div className="lg:col-span-7 pb-20">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">Import Preview</h2>
              {!preview && <span className="text-[10px] text-text-muted">Waiting for files...</span>}
            </div>

            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Address Section - Requested Order 1 */}
                  <div className="bg-deep-void rounded-2xl border border-surface overflow-hidden">
                    <div className="px-5 py-3 border-b border-surface bg-surface/30 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-reef" />
                      <span className="text-xs font-bold text-foam">Address & Location</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-tighter mb-1">Full Address</p>
                        <textarea 
                          value={preview.address} 
                          onChange={e => updatePreview('address', e.target.value)}
                          rows={2}
                          className="w-full bg-void border border-surface rounded-xl px-4 py-3 text-sm text-foam leading-relaxed focus:outline-none focus:border-core/50 resize-none"
                          placeholder="Enter site address..."
                        />
                      </div>
                      
                      {/* Photo + Coordinates - Requested Order 2 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="aspect-video rounded-xl border border-surface bg-void overflow-hidden relative group">
                          {preview.photoUrl ? (
                            <img src={preview.photoUrl} alt="Geotag" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted italic text-[10px] gap-2">
                              <Camera className="w-4 h-4 opacity-30" />
                              No photo uploaded
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="text-[10px] text-foam font-medium">Site Photograph</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center gap-3">
                          <div className="p-3 rounded-xl bg-void border border-surface relative">
                            <p className="text-[9px] text-text-muted uppercase mb-1">GPS Coordinates</p>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                step="0.000001"
                                value={preview.lat || ''} 
                                onChange={e => updatePreview('lat', parseFloat(e.target.value))}
                                className="w-1/2 bg-transparent border-none p-0 text-xs font-mono text-teal-light focus:ring-0"
                                placeholder="Lat"
                              />
                              <span className="text-text-muted text-[10px]">,</span>
                              <input 
                                type="number" 
                                step="0.000001"
                                value={preview.lng || ''} 
                                onChange={e => updatePreview('lng', parseFloat(e.target.value))}
                                className="w-1/2 bg-transparent border-none p-0 text-xs font-mono text-teal-light focus:ring-0"
                                placeholder="Lng"
                              />
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-void border border-surface">
                            <p className="text-[9px] text-text-muted uppercase mb-1">Status</p>
                            <p className="text-xs text-foam flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full", preview.lat ? "bg-teal-light animate-pulse" : "bg-amber-400")} />
                              {preview.lat ? "Coordinates Valid" : "Coords Missing"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Everything Else - Requested Order 3 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-deep-void rounded-2xl border border-surface p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-core/10 flex items-center justify-center text-core">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted uppercase">Record Date</p>
                        <input 
                          type="date"
                          value={preview.date}
                          onChange={e => updatePreview('date', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-semibold text-foam focus:ring-0 w-full"
                        />
                      </div>
                    </div>
                    <div className="bg-deep-void rounded-2xl border border-surface p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-light/10 flex items-center justify-center text-teal-light">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted uppercase">Water Level (ft)</p>
                        <input 
                          type="number"
                          value={preview.waterLevelFt}
                          onChange={e => updatePreview('waterLevelFt', parseFloat(e.target.value))}
                          className="bg-transparent border-none p-0 text-sm font-semibold text-foam focus:ring-0 w-full"
                        />
                      </div>
                    </div>
                    <div className="bg-deep-void rounded-2xl border border-surface p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-reef/10 flex items-center justify-center text-reef">
                        <Mountain className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted uppercase">Total Depth (ft)</p>
                        <input 
                          type="number"
                          value={preview.totalDepthFt}
                          onChange={e => updatePreview('totalDepthFt', parseFloat(e.target.value))}
                          className="bg-transparent border-none p-0 text-sm font-semibold text-foam focus:ring-0 w-full"
                        />
                      </div>
                    </div>
                    <div className="bg-deep-void rounded-2xl border border-surface p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-foam/10 flex items-center justify-center text-foam">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-text-muted uppercase">Bore Diameter</p>
                        <input 
                          value={preview.boreDia}
                          onChange={e => updatePreview('boreDia', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-semibold text-foam focus:ring-0 w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Strata Chart Table */}
                  <div className="bg-deep-void rounded-2xl border border-surface overflow-hidden">
                    <div className="px-5 py-3 border-b border-surface bg-surface/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-shallows" />
                        <span className="text-xs font-bold text-foam">Strata Profile</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">{preview.layers.length} Layers</span>
                    </div>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-surface/20 text-[9px] uppercase tracking-widest text-text-muted border-b border-surface">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Formation</th>
                            <th className="px-5 py-3 font-semibold">Range (ft)</th>
                            <th className="px-5 py-3 font-semibold">Assembly</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface/30">
                          {preview.layers.map((layer, i) => (
                            <tr key={i} className="hover:bg-surface/10 transition-colors group">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSoilColor(layer.soilType) }} />
                                  <select 
                                    value={layer.soilType}
                                    onChange={e => updateLayer(i, 'soilType', e.target.value)}
                                    className="bg-transparent border-none p-0 text-xs text-foam font-medium focus:ring-0 cursor-pointer"
                                  >
                                    {['Clay', 'Sand', 'Kanker Clay', 'Gravel', 'Rock'].map(s => (
                                      <option key={s} value={s} className="bg-void text-foam">{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-xs font-mono text-text-secondary">
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number"
                                    value={layer.fromDepth}
                                    onChange={e => updateLayer(i, 'fromDepth', parseFloat(e.target.value))}
                                    className="w-10 bg-transparent border-none p-0 text-xs focus:ring-0"
                                  />
                                  <span>–</span>
                                  <input 
                                    type="number"
                                    value={layer.toDepth}
                                    onChange={e => updateLayer(i, 'toDepth', parseFloat(e.target.value))}
                                    className="w-10 bg-transparent border-none p-0 text-xs focus:ring-0"
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-3 text-[10px] text-text-muted italic">
                                <div className="flex items-center justify-between gap-2">
                                  <input 
                                    value={layer.assembly}
                                    onChange={e => updateLayer(i, 'assembly', e.target.value)}
                                    className="bg-transparent border-none p-0 text-[10px] focus:ring-0 flex-1"
                                    placeholder="Assembly type..."
                                  />
                                  <button 
                                    onClick={() => removeLayer(i)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-amber-500 hover:text-amber-400 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button 
                      onClick={addLayer}
                      className="w-full py-3 bg-surface/10 hover:bg-surface/20 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foam transition-all border-t border-surface"
                    >
                      + Add New Layer
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-deep-void/20 rounded-3xl border-2 border-dashed border-surface text-center px-10">
                  <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-6">
                    <Layers className="w-8 h-8 text-text-muted" />
                  </div>
                  <h3 className="text-lg font-display font-medium text-foam">No Data to Preview</h3>
                  <p className="text-sm text-text-muted mt-2 max-w-xs">Upload both a photo and an excel file to see a structured preview of the borewell record.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-void/60 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 border-4 border-core/20 border-t-core rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-foam">Processing Data...</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
