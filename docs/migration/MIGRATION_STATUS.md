# Migration Status

Tracks the state of each domain across the Inkplainer → Void Motion strangler
migration. Updated after every completed task per MIGRATION_00 §25.

## Status enum

```text
LOCKED     Behavior documented, types defined, fixtures captured. Ready to adapt.
READY      Adapter boundary in place; new code can read/write legacy state typed.
ADAPTED    New typed code drives the feature through the adapter (legacy still runs).
MIGRATING  React/TS implementation replacing legacy in progress.
PARITY     New implementation matches legacy behavior within tolerance.
NATIVE     Legacy code path removed; new implementation is the only path.
REMOVED    Feature intentionally removed (requires explicit approval).
BLOCKED    Cannot proceed; dependency or unresolved decision. Note why.
```

## Current state — after M09

| Domain | Status | Types | Tests | Fixtures | Notes |
|---|---|---:|---:|---:|---|
| Project lifecycle | ADAPTED | ✅ | ✅ | — | React UI → store → service → LegacyStorageAdapter → legacy IndexedDB. Persistence stays legacy (M32). |
| Image layer | ADAPTED | ✅ | ✅ | 01,02,03 | React UI → layer service → legacy selectLayer/removeLayer/toggleVisibility/setLayer*. Asset registry stays legacy (M11). |
| Text layer | ADAPTED | ✅ | ✅ | 04 | Reconciled from legacy `kind:'text'` + `_text*` metadata via syncLayersFromLegacy. Text editor UI lands M12. |
| Layer transform | ADAPTED | ✅ | ✅ | — | x/y/w/h/rotation, resizePct — setLayerPos/setLayerResize delegating. |
| Layer ordering | ADAPTED | ✅ | ✅ | 06 | setLayerOrder delegated; ''/NaN→null, max(1,n) parity. |
| Canvas | ADAPTED | ✅ | ✅ | — | React UI → canvas-controls service → legacy selectRatio/selectRes. Canvas DOM lifecycle owned by React (M09); bitmap rendering stays legacy (M19). |
| Crop | LOCKED | ✅ | ✅ | 07 | Non-destructive source (KQ-006) |
| Slicer (grid) | LOCKED | ✅ | ✅ | 08 | Original removed after slicing |
| Slicer (rectangle) | LOCKED | ✅ | ✅ | 09 | |
| Slicer (freehand) | LOCKED | ✅ | ✅ | 10 | |
| Animation: chunk-jump | LOCKED | ✅ | ✅ | 05 | Default style |
| Animation: scanner | LOCKED | ✅ | ✅ | 11 | |
| Animation: contour | LOCKED | ✅ | ✅ | 12 | |
| Animation: outline-chunks | LOCKED | ✅ | ✅ | 13 | |
| Animation: specialized | LOCKED | ✅ | ✅ | 15 | 7 sub-modes |
| Drawing: outline-fill | LOCKED | ✅ | ✅ | 13 | Shares `animStyle` field (KQ-004) |
| Drawing: illust-fill | LOCKED | ✅ | ✅ | 14 | |
| Drawing: outline-only | LOCKED | ✅ | ✅ | 13 | |
| Drawing: text-draw | LOCKED | ✅ | ✅ | 04 | |
| Hand styles | ADAPTED | ✅ | ✅ | — | React UI → canvas-controls service → legacy selectHand (domain→legacy mapped). Image-file hands stay legacy (M49). |
| Stroke style | LOCKED | ✅ | ✅ | — | 5 styles |
| Detection algorithm | LOCKED | ✅ | ✅ | — | 4 algorithms |
| Coloring style | LOCKED | ✅ | ✅ | — | 3 styles |
| Playback | ADAPTED | ✅ | ✅ | — | React UI → playback service → legacy togglePlay/restartAnim/setProgress. rAF loop + slot system stay legacy (M17+). |
| Export: WebM | LOCKED | ✅ | ✅ | — | MediaRecorder, 30fps, real-time (KQ-001) |
| Export: MP4 | LOCKED | ✅ | ✅ | — | mp4-muxer from CDN (KQ-002) |
| Export: PNG | LOCKED | ✅ | ✅ | — | toBlob |
| Undo/redo | LOCKED | ✅ | ✅ | — | Snapshot scope documented in BEHAVIOR_LOCK |
| Presets | LOCKED | ✅ | ✅ | — | 4 builtin + 6 custom max |

## Legend

- **Types**: domain + legacy types compile under `tsc --noEmit` strict.
- **Tests**: at least one behavior test covers the domain.
- **Fixtures**: golden fixture number(s) that exercise the domain (— = none yet, or covered indirectly).

## Migration log

- **M00** — Behavior lock + TypeScript foundation. All domains at LOCKED. Adapters read/write legacy state through a typed boundary. No behavior changed.
- **M01** — Vite + React + TypeScript application shell. React shell mounts at `/`; placeholder regions (Header, Canvas, Sidebar, Bottom bar) render. Legacy app served at `/legacy` via dev-server middleware. No engine behavior migrated.
- **M02** — Tailwind + shadcn/ui design foundation. Design tokens (HSL conversion of legacy palette) in `globals.css`, Tailwind v3 + PostCSS configured. 19 shadcn/ui primitives installed (Button, Input, Textarea, Label, Slider, Progress, Separator, Tabs, Select, Dialog, AlertDialog, Popover, DropdownMenu, ContextMenu, Tooltip, ScrollArea, Toggle, ToggleGroup, Sheet). Regions restyled with Tailwind tokens. UI primitive smoke tests (14) added. No feature logic migrated.
- **M03** — Typed legacy runtime adapter. `InkplainerEngine` interface + `LegacyEngineAdapter` concrete facade in `src/engine/legacy/legacy-adapter.ts`, plus `legacy-events.ts` (event bus) + `legacy-types.ts` (CanvasHandles/PlaybackStatus). React feature code imports only the engine interface; no `src/app` module references `window.state`/`window.AnimationEngine`/`document.getElementById` directly. 17 adapter contract tests added. No legacy behavior changed.
- **M04** — Zustand store foundation. 8 bounded domain stores (project, layer, canvas, selection, animation, playback, export, ui) using immer middleware; no non-serializable runtime objects. Selectors: selectCurrentProject, selectVisibleLayers, selectSelectedLayerId, selectAnimationSettings, selectCanvasDimensions, selectCanUndo, selectCanRedo. `hydrateStoresFromLegacyState` maps legacy state → stores (M04 exit criterion). 20 store unit tests added. No behavior changed.
- **M05** — Project domain migration. `LegacyStorageAdapter` (typed boundary over legacy IndexedDB fns saveProject/loadProject/createNewProject/deleteProject/refreshProjectsList) in `src/engine/legacy/legacy-storage-adapter.ts`. `ProjectService` (create/rename/load/list/delete/autosave) in `src/app/services/project-service.ts`, coordinating the project store with the storage adapter (5000ms autosave debounce, legacy `generateRandomName` word lists, time-ago/size/save-time formatters). React project UI: `ProjectNameEditor` (click→edit, Enter commits / Escape cancels / blur commits / empty discarded — legacy `startRenaming`/`finishRenaming` parity), `ProjectsButton` + `ProjectsSheet` (sorted-by-modifiedAt list, New Project, confirm-delete), `SaveIndicator` (dirty/`HH:MM:SS` timestamp). Header hosts all three; `useProjectBoot` loads most-recent project at startup (legacy boot path parity). IndexedDB implementation NOT migrated (M32). 29 project tests added (22 service contract + 7 UI). No behavior changed.
- **M06** — Header + global editor controls. `globalControlsService` in `src/app/services/global-controls-service.ts` delegates undo/redo/export to the legacy `window.undo`/`window.redo`/`window.openExportBanner` through guarded `window.*` calls and mirrors stack depth into the typed layer store (badge counts) + export store (job status). `useGlobalShortcuts` hook mounts the legacy keydown handler (legacy/index.html:5167) at the App root: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z | Y = redo; ignores INPUT/TEXTAREA via `document.activeElement` check (legacy parity). Space (play/pause) + Delete (remove layer) branches stubbed for M07/M10. Header undo/redo/export buttons promoted from disabled placeholders to wired controls with depth badges + dynamic titles (`Undo (N steps) — Ctrl+Z`); center status readout (canvas size + active animation label) wired to canvas + animation stores. Window globals typed for undo/redo/openExportBanner/closeExportBanner/generate. 12 global-controls + shortcuts tests added. No behavior changed.
- **M07** — Playback + hand + global speed controls. `playbackService` in `src/app/services/playback-service.ts` delegates play/pause/restart/generate/seek to the legacy `window.togglePlay`/`window.restartAnim`/`window.generate`/`window.setProgress` through guarded `window.*` calls and mirrors `state.playing`/`state.done`/`state._animProgress` into the typed playback store (mapping to the domain `PlaybackStatus` union: done→completed, playing→playing, else→idle). `canvasControlsService` in `src/app/services/canvas-controls-service.ts` delegates hand/ratio/res to the legacy `window.selectHand`/`selectRatio`/`selectRes` via a `LegacyControlElement` stub carrying the **legacy raw** dataset values (domain→legacy mapped through `legacy-enum-mapping` — `hand-1`→`custom1`, `pen`→`custom4`; ratio strings unchanged; res `1080p`→`1080`), and mirrors the derived pixel size into the canvas store via `CANVAS_SIZE_TABLE`; reveal/hand speed sliders mirror into the playback store (legacy rAF stays authoritative for actual speed). `CanvasRegion` transport wired: Play/Pause (icon + label from status, disabled until a layer exists), Restart, progress track (click-ratio seek), `${round(progress*100)}%` time display. `BottomBar` wired: 5 hand pills (Ghost/Hand 1-3/Pen), Reveal (1-100, val 40) + Hand (1-20, val 6) speed sliders, 3 ratio + 3 res buttons with `aria-pressed` active state. `useGlobalShortcuts` Space branch wired (legacy `e.code === 'Space'`, no modifier, not typing → `playbackService.playPause`); restored the legacy "block undo while playing" guard (legacy/index.html:5199 — Ctrl+Z is a no-op when status is playing). Window globals typed for selectHand/selectRatio/selectRes/seekAnim/setProgress + `LegacyControlElement` interface. 46 M07 tests added (29 service contract + 12 region wiring + 5 shortcuts). No behavior changed.
- **M08** — Layer state + layer panel. `layerService` in `src/app/services/layer-service.ts` delegates select/remove/toggleVisibility/order/opacity/resize/position/rename/switchTab to the legacy `window.selectLayer`/`removeLayer`/`toggleLayerVisibility`/`setLayerOrder`/`setLayerOpacity`/`setLayerResize`/`setLayerPos`/`switchTab` through guarded `window.*` calls (domain `LayerId` `'layer-N'` ↔ legacy numeric id via `layerIdToLegacyNum`/`toLayerId`) and mirrors into the typed layer + selection stores. `syncLayersFromLegacy` reconciles the typed projection from `window.state.layers` (mapping legacy `kind:'text'` + `_text*` metadata into a `TextLayer`, plain layers into `ImageLayer` with `resizePct`/`sourceMetadata`; preserving existing `assetId`/`animation` overrides so the projection is not clobbered). `LayerPanel` component renders the stack reversed (topmost first, legacy parity), with per-item drag handle, visibility toggle (eye icon), name (click→select, double-click→inline rename with Enter commit / Escape cancel — legacy `startLayerRename` parity), animation order input (1-99, blank=follow stack), delete button, and an expanded inline inspector (Resize 10-300% / Opacity 0-100% / Position & Size X/Y/W/H with w/h clamp ≥20) for the selected layer. `Sidebar` rewired: hosts `LayerPanel` + an Image/Text `Tabs` pair bound to `editorMode` (onValueChange → `layerService.switchTab`). Rename is store-direct + `scheduleAutoSave` (legacy `startLayerRename` is DOM-driven, not reusable from React; trim + empty-discard parity). Window globals typed for renderLayerList/removeLayer/toggleLayerVisibility/setLayerOrder/setLayerOpacity/setLayerResize/setLayerPos/startLayerRename/switchTab + group fns. 32 M08 tests added (17 service contract + 15 panel/sidebar wiring). No behavior changed.
- **M09** — React canvas host. Canvas DOM lifecycle moved into React: `CanvasViewport` (positioned container, `data-testid="canvas-viewport"`) hosts the stacked `CanvasStage` (`main-canvas` + `hand-canvas`) and `CanvasOverlay` (`select-canvas` + `outline-overlay`) `<canvas>` elements, each owned by a React ref and handed to the engine. `useCanvasHost` hook creates the five refs (viewport + four surfaces), calls `engine.attachCanvases(handles)` on mount, forwards viewport content-box size to `engine.resize` via a `ResizeObserver` (legacy `fitCanvas` parity, zero-size entries guarded), and calls `engine.dispose` on unmount. Engine singleton in `src/engine/engine.ts` (`export const engine = new LegacyEngineAdapter()`); `InkplainerEngine` interface extended with `resize(displayWidth, displayHeight)` (no-op until canvases attached; concrete draw wired in M19) and `dispose()` (soft teardown — releases canvas refs but keeps the singleton reusable so React unmount/remount + StrictMode double-invoke can re-attach, distinct from `destroy()` which marks the adapter permanently dead). `CanvasRegion` rewired to compose `CanvasViewport`/`CanvasStage`/`CanvasOverlay` via `useCanvasHost`, preserving the M07 transport controls. Exit criterion met: no new code looks up a canvas by `document.getElementById` (legacy `id` attributes retained only for legacy-DOM co-hosting parity in M16). 15 M09 tests added (5 surface rendering + 6 engine contract + 2 no-global-lookup + 2 transport parity). No behavior changed.