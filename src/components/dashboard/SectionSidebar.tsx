import { Reorder } from 'framer-motion'
import { Mountain, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Borewell } from '@/types'

interface SectionSidebarProps {
  selectedIds: Set<string>
  orderedList: Borewell[]
  sectionTitle: string
  showCrossSection: boolean
  onReorder: (newList: Borewell[]) => void
  onTitleChange: (title: string) => void
  onToggleGenerate: () => void
}

export function SectionSidebar({
  selectedIds,
  orderedList,
  sectionTitle,
  showCrossSection,
  onReorder,
  onTitleChange,
  onToggleGenerate
}: SectionSidebarProps) {
  const selectedBorewells = orderedList.filter(bw => selectedIds.has(bw.id))

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-surface bg-deep-void flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mountain className="w-3.5 h-3.5 text-core" />
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Section Config</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selectedIds.size >= 2 ? (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-bold">Section Title</p>
              <input 
                value={sectionTitle} 
                onChange={e => onTitleChange(e.target.value)} 
                className="w-full bg-void border border-surface rounded-xl px-4 py-2 text-sm text-foam focus:border-core/50 focus:outline-none transition-colors" 
                placeholder="Section A-A'" 
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-bold">Sequence Order</p>
              <Reorder.Group 
                axis="y" 
                values={selectedBorewells} 
                onReorder={onReorder} 
                className="space-y-2"
              >
                {selectedBorewells.map((bw, idx) => (
                  <Reorder.Item 
                    key={bw.id} 
                    value={bw} 
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-surface bg-surface/30 cursor-grab active:cursor-grabbing text-xs select-none hover:bg-surface/50 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-text-muted" />
                    <div className="w-5 h-5 rounded-full bg-void border border-surface flex items-center justify-center text-[10px] text-text-muted font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-foam flex-1 truncate">{bw.name || 'Unnamed'}</span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>

            <button 
              onClick={onToggleGenerate} 
              className={cn(
                "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300", 
                showCrossSection 
                  ? "bg-void border border-core/30 text-core" 
                  : "bg-core text-void shadow-lg shadow-core/20 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <Mountain className="w-4 h-4" />
              {showCrossSection ? "Hide Section" : "Generate Section"}
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4 opacity-40">
            <div className="w-12 h-12 rounded-full bg-surface/30 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Select 2 or more borewells from the list to configure a cross-section.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
