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

## Current state — after M05

| Domain | Status | Types | Tests | Fixtures | Notes |
|---|---|---:|---:|---:|---|
| Project lifecycle | ADAPTED | ✅ | ✅ | — | React UI → store → service → LegacyStorageAdapter → legacy IndexedDB. Persistence stays legacy (M32). |
| Image layer | LOCKED | ✅ | ✅ | 01,02,03 | Transparency detection preserved |
| Text layer | LOCKED | ✅ | ✅ | 04 | Font/size/align/color mapped |
| Layer transform | LOCKED | ✅ | ✅ | — | x/y/w/h/rotation, resizePct |
| Layer ordering | LOCKED | ✅ | ✅ | 06 | Numbered + blank + parallel semantics |
| Canvas | LOCKED | ✅ | ✅ | — | Resolution presets, aspect ratios, backgrounds |
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
| Hand styles | LOCKED | ✅ | ✅ | — | 5 hands, image-file based |
| Stroke style | LOCKED | ✅ | ✅ | — | 5 styles |
| Detection algorithm | LOCKED | ✅ | ✅ | — | 4 algorithms |
| Coloring style | LOCKED | ✅ | ✅ | — | 3 styles |
| Playback | LOCKED | ✅ | ✅ | — | Parallel slot system (KQ-005) |
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