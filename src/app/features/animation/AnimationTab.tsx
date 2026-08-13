import { useAnimationStore } from '@/app/store'
import { animationService } from '@/app/services/animation-service'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import type { AnimationStyle } from '@/types/animation'

const BASIC_STYLES: { id: AnimationStyle; label: string }[] = [
  { id: 'scanner', label: 'Scanner' },
  { id: 'contour', label: 'Contour' },
  { id: 'outline-chunks', label: 'Outline Chunks' },
  { id: 'chunk-jump', label: 'Chunk Jump' },
]

const SPEC_STYLES: { id: AnimationStyle; label: string }[] = [
  { id: 'specialized-human', label: 'Human' },
  { id: 'specialized-animal', label: 'Animal' },
  { id: 'specialized-portrait', label: 'Portrait' },
  { id: 'specialized-vehicle', label: 'Vehicle' },
  { id: 'specialized-building', label: 'Building' },
  { id: 'specialized-landscape', label: 'Landscape' },
  { id: 'specialized-spiral', label: 'Spiral' },
]

export function AnimationTab() {
  const activeMode = useAnimationStore((s) => s.activeMode)
  const defaults = useAnimationStore((s) => s.defaults)

  // Determine if activeMode is a basic/spec animation style (and not a drawing mode)
  // If it's a drawing mode, we probably shouldn't even show this tab, but just in case,
  // we check if it matches.
  const isSpec =
    typeof activeMode === 'string' &&
    activeMode.startsWith('specialized-')
  const isScanner = activeMode === 'scanner'
  const isChunkLike =
    activeMode === 'chunk-jump' || activeMode === 'outline-chunks'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Basic</Label>
        <div className="grid grid-cols-2 gap-2">
          {BASIC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                activeMode === style.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {style.label}
            </button>
          ))}
        </div>

        {isScanner && (
          <div className="flex items-center justify-between p-3 border rounded-md mt-2">
            <Label htmlFor="zigzag-toggle">Zigzag scan</Label>
            <input
              type="checkbox"
              id="zigzag-toggle"
              checked={defaults.zigzag}
              onChange={(e) => animationService.setZigzag(e.target.checked)}
              className="w-4 h-4 accent-foreground"
            />
          </div>
        )}

        {isChunkLike && (
          <div className="flex flex-col gap-2 p-3 border rounded-md mt-2">
            <div className="flex justify-between items-center">
              <Label>Chunks <span className="text-[9px] text-muted-foreground">(more = finer)</span></Label>
              <span className="text-xs">{/* Slider value here, but we don't have chunk value in domain yet! */} 30</span>
            </div>
            <Slider disabled value={[30]} min={6} max={80} />
            <div className="text-[10px] text-muted-foreground">
              Chunk slider not yet migrated to typed domain.
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Specialized</Label>
          <span className="text-[9px] text-muted-foreground leading-snug">Subject-aware drawing order.</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SPEC_STYLES.map((style) => (
            <button
              key={style.id}
              className={`px-2 py-2 text-xs border rounded-md transition-colors ${
                activeMode === style.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              onClick={() => animationService.setAnimationStyle(style.id)}
            >
              {style.label}
            </button>
          ))}
        </div>
        {isSpec && (
          <div className="flex flex-col gap-2 p-3 border rounded-md mt-2">
            <div className="flex justify-between items-center">
              <Label>Chunks</Label>
              <span className="text-xs">35</span>
            </div>
            <Slider disabled value={[35]} min={6} max={80} />
            <div className="text-[10px] text-muted-foreground">
              Spec chunk slider not yet migrated to typed domain.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
