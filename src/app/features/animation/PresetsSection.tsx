import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { presetService, BUILT_IN_PRESETS } from '@/app/services/preset-service'
import { useAnimationStore } from '@/app/store'
import type { Preset } from '@/types/project'
import { MAX_CUSTOM_PRESETS } from '@/types/project'
import { X, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PresetsSection() {
  const { t } = useTranslation('animation')
  const [customPresets, setCustomPresets] = useState<Preset[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')

  // The active preset isn't strictly tracked in domain state, but we could highlight if the settings match.
  // For parity, legacy just sets activePresetId and clears it when any setting changes.
  // We'll skip the exact highlight for now or just trust the user.
  // We can just rely on the UI.

  const refreshCustom = () => {
    setCustomPresets(presetService.loadCustomPresets())
  }

  useEffect(() => {
    refreshCustom()
  }, [])

  const handleApply = (preset: Preset) => {
    presetService.applyPreset(preset.settings)
  }

  const handleDelete = (id: string) => {
    presetService.deleteCustomPreset(id)
    refreshCustom()
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const currentSettings = useAnimationStore.getState().defaults
    const speed = 40 // Default fallbacks since speed isn't in AnimationStore
    const handSpeed = 6
    const success = presetService.saveCustomPreset(saveName, {
      ...currentSettings,
      speed,
      handSpeed,
    })
    if (success) {
      setSaveName('')
      setIsSaving(false)
      refreshCustom()
    }
  }

  const canSaveMore = customPresets.length < MAX_CUSTOM_PRESETS

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-semibold">{t('presets.title')}</div>

      {/* Built-in Presets */}
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {t('presets.builtIn')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BUILT_IN_PRESETS.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              className="justify-between group relative"
              title={t(`presets.builtIns.${p.id}.description`)}
              onClick={() => handleApply(p)}
            >
              <span className="truncate">{t(`presets.builtIns.${p.id}.name`)}</span>
              <Lock className="w-3 h-3 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Presets */}
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {t('presets.custom')}
        </div>
        {customPresets.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">{t('presets.empty')}</div>
        ) : (
          <div className="flex flex-col gap-1">
            {customPresets.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border border-transparent hover:border-border transition-colors group cursor-pointer"
                onClick={() => handleApply(p)}
              >
                <span className="text-sm truncate">{p.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(p.id)
                  }}
                  title={t('presets.delete')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {isSaving ? (
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('presets.name')}
              className="h-8 text-sm"
              maxLength={28}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setIsSaving(false)
              }}
            />
            <Button size="sm" onClick={handleSave} className="h-8">
              {t('presets.save')}
            </Button>
          </div>
        ) : (
          canSaveMore && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setIsSaving(true)}
            >
              {t('presets.saveCurrent')}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
