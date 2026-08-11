# Inkplainer-OS Modernization Master Migration Plan

> **Target direction:** Legacy Inkplainer-OS → TypeScript-first React/Vite application → Tailwind + shadcn/ui → Zustand architecture → modular TypeScript animation engine → Tauri v2 desktop application → native filesystem/export pipeline.
>
> **Core rule:** Migrate implementation without changing observable behavior until parity is explicitly signed off.
>
> **Source reference:** `NadirWeb-App/Inkplainer-OS`
>
> **Migration strategy:** Strangler migration, one bounded migration at a time, with the current app preserved as the golden reference.

---

# 0. Executive Summary

Inkplainer-OS already contains a substantial working whiteboard-animation engine, including:

- image layers
- text layers
- layer ordering
- parallel animation groups
- crop
- slicer
- multiple drawing / reveal algorithms
- hand rendering
- presets
- project autosave
- IndexedDB persistence
- WebM export
- MP4 export
- PNG export

The main problem is not missing functionality. The main problem is **maintainability and architecture**:

- very large monolithic HTML/JavaScript implementation
- DOM manipulation mixed with domain state
- runtime state stored globally
- canvas rendering coupled to UI
- animation algorithms coupled to DOM controls
- browser persistence coupled to project logic
- export coupled to browser APIs
- difficult deterministic testing
- difficult future Tauri integration

The modernization should therefore be done in two major eras:

```text
ERA A — Application Architecture Migration
Legacy JS
  ↓
TypeScript contracts
  ↓
React + Vite
  ↓
Tailwind + shadcn/ui
  ↓
Zustand
  ↓
Typed legacy adapter
  ↓
Full React UI parity
  ↓
Modular TypeScript engine

ERA B — Desktop Migration
Web architecture stabilized
  ↓
Tauri v2 shell
  ↓
Native filesystem
  ↓
Native project format
  ↓
Native dialogs
  ↓
Deterministic export
  ↓
FFmpeg / desktop rendering pipeline
```

The desktop migration **must not start before the web architecture reaches parity**.

---

# 1. Non-Negotiable Migration Principles

## 1.1 TypeScript from Day One

All new code must be TypeScript.

Allowed legacy files:

```text
legacy/index.html
legacy/animations.js
legacy/assets/*
```

All modernization code:

```text
*.ts
*.tsx
```

Required compiler policy:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true
  }
}
```

Forbidden shortcuts:

```text
any
// @ts-ignore
// @ts-nocheck
blind type assertions
untyped global window state
```

Exceptions must be documented in:

```text
docs/migration/TYPE_EXCEPTIONS.md
```

---

## 1.2 Behavior First, Refactor Second

During parity migration:

```text
Do NOT:
- redesign animation algorithms
- improve export behavior
- fix visual quirks
- change timing
- change default settings
- change layer semantics
- change keyboard behavior
- change file formats
```

Instead:

```text
Legacy behavior
      ↓
Document
      ↓
Reproduce
      ↓
Test
      ↓
Mark parity
```

After parity:

```text
Improvement Phase
```

---

## 1.3 Legacy is the Golden Reference

Keep the current application permanently available during migration:

```text
legacy/
├── index.html
├── animations.js
└── assets/
```

Every migrated feature must be compared against it.

Rule:

> If React and Legacy disagree during a parity migration, Legacy wins unless the discrepancy has been explicitly classified as a bug fix outside the parity scope.

---

## 1.4 One Migration = One Primary Architectural Change

Bad migration:

```text
React rewrite
+ Zustand
+ new layer behavior
+ animation rewrite
+ export rewrite
```

Good migration:

```text
M04:
Move layer state into typed Zustand store
while rendering behavior remains unchanged.
```

---

## 1.5 Every Migration Has a Gate

Each migration ends with:

```text
TYPE GATE
UNIT GATE
BEHAVIOR GATE
VISUAL GATE
REGRESSION GATE
DOCUMENTATION GATE
```

Migration N+1 cannot begin until required gates for Migration N are PASS.

---

# 2. Target Technology Stack

## Core

```text
React
TypeScript
Vite
```

## UI

```text
Tailwind CSS
shadcn/ui
Lucide React
```

## State

```text
Zustand
Zustand selectors
Zustand middleware where appropriate
```

## Validation / contracts

Recommended:

```text
Zod
```

Use it for:

- project schema validation
- persisted settings
- import/export boundaries
- Tauri IPC payloads later

## Testing

```text
Vitest
Testing Library
Playwright
pixelmatch or equivalent image-diff tooling
```

## Desktop later

```text
Tauri v2
Rust
Tauri plugins
FFmpeg sidecar / encoder integration
```

---

# 3. Target Repository Layout

```text
inkplainer/
│
├── legacy/
│   ├── index.html
│   ├── animations.js
│   └── assets/
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── bootstrap.ts
│   │
│   ├── components/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── project/
│   │   ├── canvas/
│   │   ├── layers/
│   │   ├── playback/
│   │   ├── animation/
│   │   ├── drawing/
│   │   ├── hand/
│   │   ├── text/
│   │   ├── crop/
│   │   ├── slicer/
│   │   ├── presets/
│   │   └── export/
│   │
│   ├── stores/
│   │   ├── project.store.ts
│   │   ├── layer.store.ts
│   │   ├── animation.store.ts
│   │   ├── playback.store.ts
│   │   ├── selection.store.ts
│   │   ├── canvas.store.ts
│   │   ├── export.store.ts
│   │   └── ui.store.ts
│   │
│   ├── engine/
│   │   ├── core/
│   │   ├── runtime/
│   │   ├── legacy/
│   │   ├── renderer/
│   │   ├── animations/
│   │   ├── drawing/
│   │   ├── hand/
│   │   └── image-processing/
│   │
│   ├── services/
│   │   ├── project/
│   │   ├── storage/
│   │   ├── export/
│   │   └── runtime/
│   │
│   ├── schemas/
│   ├── types/
│   ├── hooks/
│   ├── lib/
│   ├── constants/
│   └── styles/
│
├── tests/
│   ├── fixtures/
│   ├── golden/
│   ├── unit/
│   ├── behavior/
│   ├── visual/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   └── migration/
│       ├── MASTER_MIGRATION_PLAN.md
│       ├── BEHAVIOR_LOCK.md
│       ├── FEATURE_MATRIX.md
│       ├── ARCHITECTURE.md
│       ├── MIGRATION_STATUS.md
│       ├── KNOWN_QUIRKS.md
│       ├── TYPE_EXCEPTIONS.md
│       └── decisions/
│
├── src-tauri/            # added only in desktop era
│
├── vite.config.ts
├── tsconfig.json
├── components.json
├── package.json
└── pnpm-lock.yaml
```

---

# 4. Domain Boundary Rules

## 4.1 React owns UI composition

React may own:

```text
component tree
forms
panels
dialogs
toolbar
layout
interaction wiring
```

React should NOT own:

```text
animation algorithms
pixel manipulation
canvas rendering internals
video encoding
project serialization logic
```

---

## 4.2 Zustand owns serializable application state

Good Zustand state:

```ts
type Layer = {
  id: string
  type: "image" | "text"
  x: number
  y: number
  width: number
  height: number
  opacity: number
}
```

Bad Zustand state:

```ts
HTMLCanvasElement
CanvasRenderingContext2D
HTMLImageElement
ImageBitmap
ImageData
VideoEncoder
MediaRecorder
```

Those belong in:

```text
engine/runtime/
```

---

## 4.3 Engine owns pixels and animation runtime

```text
React
  ↓
Zustand
  ↓
Application Service
  ↓
Engine
  ↓
Canvas
```

Do not allow:

```text
Component
  ↓
window.state
  ↓
document.getElementById(...)
  ↓
animation.js
```

in the target architecture.

---

# 5. Migration Status Model

Every sub-migration uses:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
PARITY_REVIEW
DONE
```

Feature-level runtime status:

```text
LEGACY
ADAPTED
MIGRATING
PARITY
NATIVE_TS
REMOVED_LEGACY
```

Example:

| Domain | UI | State | Engine | Parity |
|---|---|---|---|---|
| Project | React | Zustand | Adapted | PASS |
| Layers | React | Zustand | Adapted | PASS |
| Scanner | React | Zustand | Legacy | PASS |
| Contour | React | Zustand | Native TS | REVIEW |
| Export | React | Zustand | Legacy | PASS |

---

# 6. Full Migration Roadmap

---

# M00 — Behavior Lock + TypeScript Foundation

## Objective

Freeze current behavior and establish TypeScript contracts before any UI rewrite.

## Scope

- snapshot upstream source
- move original application to `legacy/`
- initialize TypeScript
- document behavior
- define domain types
- establish test fixtures
- create migration tracking

## Deliverables

```text
legacy/
src/types/
src/schemas/
docs/migration/
tests/fixtures/
tests/golden/
tsconfig.json
```

Core types:

```text
Project
Layer
ImageLayer
TextLayer
AnimationSettings
DrawingSettings
CanvasSettings
HandSettings
PlaybackState
ExportSettings
Preset
```

## Required documents

```text
BEHAVIOR_LOCK.md
FEATURE_MATRIX.md
KNOWN_QUIRKS.md
MIGRATION_STATUS.md
ARCHITECTURE.md
```

## Golden fixtures

Minimum:

```text
01-single-png
02-transparent-png
03-photo
04-text
05-multi-layer
06-parallel-order
07-crop
08-grid-slicer
09-rectangle-slicer
10-freehand-slicer
11-scanner
12-contour
13-outline
14-illustration-fill
15-specialized
```

## Exit criteria

- `tsc --noEmit` PASS
- existing legacy application still runs
- feature matrix complete
- behavior documentation complete
- golden fixtures captured
- no modernization behavior changes

---

# M01 — Vite + React + TypeScript Application Shell

## Objective

Create the new frontend application without migrating business behavior.

## Scope

Install:

```text
React
React DOM
Vite
TypeScript
```

Create:

```text
src/main.tsx
src/app/App.tsx
src/app/providers.tsx
```

## Important

At this stage:

```text
Legacy runtime remains authoritative.
```

React shell may render placeholder regions representing:

```text
Header
Canvas
Sidebar
Bottom bar
```

## Exit criteria

- dev server works
- production build works
- strict TypeScript passes
- legacy build/reference remains accessible
- no engine behavior migrated

---

# M02 — Tailwind + shadcn/ui Design Foundation

## Objective

Create the UI foundation before copying feature panels.

## Scope

Install/configure:

```text
Tailwind CSS
shadcn/ui
Lucide React
```

Create design tokens based on current Inkplainer UI:

```text
background
surface
panel
border
foreground
muted
accent
danger
success
radius
spacing
editor dimensions
```

Initial shadcn components:

```text
Button
Input
Textarea
Slider
Tabs
Select
Dialog
AlertDialog
Popover
DropdownMenu
ContextMenu
Tooltip
ScrollArea
Separator
Toggle
ToggleGroup
Progress
Sheet
```

## Rule

Do not redesign UX during this migration.

Match legacy layout and hierarchy first.

## Exit criteria

- UI primitives available
- global CSS has no legacy inline style dependency
- React shell visually approximates legacy frame
- no feature logic migration

---

# M03 — Typed Legacy Runtime Adapter

## Objective

Stop new React code from directly touching global legacy internals.

## Create

```text
src/engine/legacy/
├── legacy-adapter.ts
├── legacy-runtime.ts
├── legacy-events.ts
└── legacy-types.ts
```

Interface example:

```ts
export interface InkplainerEngine {
  attachCanvases(canvases: CanvasHandles): void

  loadProject(project: Project): Promise<void>
  syncProject(project: Project): void

  renderStatic(): void

  play(): void
  pause(): void
  restart(): void

  getProgress(): number
  getStatus(): PlaybackStatus

  destroy(): void
}
```

## Goal

React sees:

```text
InkplainerEngine
```

not:

```text
window.state
window.AnimationEngine
document.querySelector(...)
```

## Exit criteria

- adapter compiles strict
- no React feature imports legacy globals directly
- legacy engine behavior unchanged

---

# M04 — Zustand Store Foundation

## Objective

Create typed, domain-separated Zustand stores.

## Stores

```text
project.store.ts
layer.store.ts
canvas.store.ts
selection.store.ts
animation.store.ts
playback.store.ts
export.store.ts
ui.store.ts
```

## Rules

Do not create:

```text
useAppStore with 200 fields
```

Prefer bounded domain stores.

## Runtime rule

Do not store non-serializable browser runtime objects in Zustand.

## Required selectors

Example:

```ts
selectSelectedLayer
selectVisibleLayers
selectAnimationSettings
selectCanvasDimensions
selectCanUndo
selectCanRedo
```

## Exit criteria

- typed stores created
- no `any`
- store unit tests pass
- initial legacy state can map into Zustand
- state changes can synchronize to adapter

---

# M05 — Project Domain Migration

## Objective

Migrate project-level UI/state first.

## Includes

```text
project name
new project
project metadata
autosave indicator
project list UI
current project
```

Persistence remains legacy IndexedDB temporarily.

## Architecture

```text
React Project UI
      ↓
Project Zustand Store
      ↓
Project Service
      ↓
Legacy Storage Adapter
```

## Do NOT yet migrate

```text
IndexedDB implementation
native filesystem
project file format
```

## Exit criteria

- project behavior parity
- create/rename/load behavior matches legacy
- autosave semantics match
- visual comparison PASS

---

# M06 — Header + Global Editor Controls

## Objective

Migrate low-risk global UI.

## Includes

```text
topbar
project button
project name editor
undo
redo
export trigger
global status indicators
```

## Exit criteria

- shortcuts match legacy
- buttons match legacy semantics
- no direct DOM mutation
- parity PASS

---

# M07 — Playback + Hand + Global Speed Controls

## Objective

Migrate bottom/global animation controls.

## Includes

```text
Play
Pause
Restart
Generate
Reveal speed
Hand speed
Hand selector
Canvas resolution
Canvas aspect ratio
```

## Flow

```text
React UI
  ↓
Zustand
  ↓
Playback/Animation service
  ↓
Legacy adapter
```

## Exit criteria

- same defaults
- same ranges
- same hand behavior
- same restart behavior
- same animation speed behavior

---

# M08 — Layer State + Layer Panel

## Objective

Move the entire layer model into typed application state.

## Includes

```text
image layer
text layer metadata
visibility
order
name
opacity
transform
resize percentage
grouping
selection
delete
reorder
```

## Important

Define discriminated unions:

```ts
type Layer =
  | ImageLayer
  | TextLayer
```

Never use one massive partially optional Layer type.

## Exit criteria

- layer creation parity
- deletion parity
- reorder parity
- parallel-order behavior parity
- layer inspector parity
- fixture tests pass

---

# M09 — React Canvas Host

## Objective

Move canvas lifecycle into React without rewriting renderer.

## Components

```text
CanvasViewport
CanvasStage
CanvasOverlay
```

React owns DOM canvas creation:

```tsx
<canvas ref={mainCanvasRef} />
<canvas ref={handCanvasRef} />
<canvas ref={selectionCanvasRef} />
```

Engine owns rendering.

## Required runtime API

```ts
attachCanvases()
resize()
render()
dispose()
```

## Exit criteria

- no canvas element is looked up globally by ID from new code
- existing animations render identically
- resize behavior parity
- visual golden tests PASS

---

# M10 — Canvas Selection / Transform Interaction

## Objective

Migrate editor interaction around the canvas.

## Includes

```text
select layer
drag layer
resize layer
selection handles
keyboard controls
position/size synchronization
```

Potential future-safe abstractions:

```text
PointerSession
SelectionSession
TransformSession
```

## Exit criteria

- pointer behavior parity
- position parity
- resize parity
- keyboard behavior parity
- no new animation logic

---

# M11 — Crop Tool Migration

## Objective

Extract crop behavior from monolithic runtime.

## Create

```text
features/crop/
engine/image-processing/crop.ts
```

Use temporary tool state rather than writing every pointer movement into project state.

```text
CropSession
```

Commit only after confirm.

## Preserve

```text
non-destructive crop semantics
original source retention
canvas-space ↔ image-space mapping
shift aspect constraint
```

## Exit criteria

- crop fixtures match
- reset matches
- cancel produces no project mutation
- confirm produces same output

---

# M12 — Slicer Tool Migration

## Objective

Migrate all slicer modes.

## Modes

```text
Grid
Rectangles
Freehand
```

## Create

```text
features/slicer/
engine/image-processing/slicer/
```

## Preserve

```text
original layer replacement
new layer positions
inherited settings
ordering
independent animation
```

## Exit criteria

- each slicer mode parity PASS
- layer output count matches
- visual output matches
- undo behavior matches

---

# M13 — Text Layer + Text Editor Migration

## Objective

Fully migrate text placement/editing.

## Includes

```text
font family
font size
bold
italic
alignment
line height
letter spacing
color
canvas placement
double-click edit
Ctrl+Enter
Escape
```

## Important

Font loading should still preserve current visual output during parity phase.

Offline/vendor font changes happen later.

## Exit criteria

- text metrics acceptable within defined tolerance
- editing behavior parity
- keyboard behavior parity
- screenshots PASS

---

# M14 — Animation & Drawing Settings UI Migration

## Objective

Move all animation configuration into React while still using legacy algorithms.

## Includes

Animation tab:

```text
Chunk Jump
Scanner
Contour
Outline Chunks
Specialized modes
Chunks
Zigzag
```

Drawing tab:

```text
Outline Fill
Illust Fill
Outline Only
Text Draw
stroke style
coloring style
detection sensitivity
detection algorithm
reveal modes
outline overlay
text direction
```

Presets:

```text
built-in presets
custom presets
```

## Exit criteria

- every legacy setting has typed representation
- every setting has mapping to legacy adapter
- defaults match exactly
- fixture matrix passes

---

# M15 — Export UI Parity Migration

## Objective

Move export UI into React without changing export implementation.

## Includes

```text
MP4/WebM selection
quality
PNG final frame
progress
success/failure UI
cancel/close behavior
```

The underlying export remains legacy browser implementation.

## Exit criteria

- same format behavior
- same quality behavior
- same progress semantics
- export files comparable to legacy
- no FFmpeg yet

---

# M16 — Full React UI Parity Milestone

## Objective

Reach a state where the entire application UI is React-based.

At this point:

```text
React UI        = 100%
Zustand state   = primary application state
Legacy engine   = still allowed behind adapter
Legacy UI       = no longer runtime dependency
```

## Mandatory audit

Search for forbidden patterns in `src/`:

```text
window.state
window.AnimationEngine
onclick="
onchange="
document.getElementById
document.querySelector
innerHTML
```

Some DOM queries may be valid inside isolated runtime modules, but must be reviewed.

## Exit criteria

- feature matrix parity PASS
- all golden fixtures PASS
- E2E PASS
- legacy UI can be removed from runtime path
- migration checkpoint tag created

Suggested tag:

```text
react-ui-parity-v1
```

---

# M17 — Animation Runtime Context Extraction

## Objective

Before rewriting individual algorithms, eliminate algorithm dependence on global state.

Create:

```ts
export interface AnimationContext {
  state: RuntimeAnimationState

  main: CanvasRenderingContext2D
  hand: CanvasRenderingContext2D
  offscreen: CanvasRenderingContext2D

  canvasWidth: number
  canvasHeight: number

  fillBackground(): void
  drawHand(input: DrawHandInput): void
  setProgress(progress: number): void
  finish(): void

  random(): number
}
```

Algorithms receive context instead of reading globals.

## Exit criteria

- current legacy algorithms can execute through context bridge
- global dependencies reduced
- behavior unchanged

---

# M18 — Deterministic Runtime + Random Source

## Objective

Make animation testing reproducible.

Current algorithms that use randomness must consume:

```ts
RandomSource
```

Production:

```text
native random
```

Tests:

```text
seeded deterministic random
```

Example:

```ts
interface RandomSource {
  next(): number
}
```

## Exit criteria

- same fixture with same seed yields same output
- image diff tests stable across repeated runs

---

# M19 — Core Renderer Migration to TypeScript

## Objective

Extract shared rendering primitives before migrating animation algorithms.

Create:

```text
engine/renderer/
├── canvas-renderer.ts
├── background-renderer.ts
├── layer-compositor.ts
├── selection-renderer.ts
└── resolution.ts
```

## Exit criteria

- static project rendering matches legacy
- background behavior matches
- layer opacity/visibility/order match

---

# M20 — Hand Renderer Migration

## Objective

Extract hand rendering.

Create:

```text
engine/hand/
├── hand-renderer.ts
├── hand-assets.ts
├── hand-types.ts
└── hand-position.ts
```

Preserve:

```text
Ghost
Hand 1
Hand 2
Hand 3
Pen
```

## Exit criteria

- frame-by-frame hand output parity
- hand speed semantics match

---

# M21 — Scanner Algorithm → Native TypeScript

## Objective

First animation algorithm migration.

Why first:

```text
simple
low dependency
clear progression
good reference migration
```

## Rule

Only Scanner changes implementation.

Everything else remains legacy.

## Exit criteria

- seeded output parity
- progress parity
- zigzag parity
- hand trajectory parity
- performance not worse beyond agreed threshold

---

# M22 — Chunk Jump → Native TypeScript

Preserve:

```text
chunk count
ordering
reveal behavior
progress
hand behavior
```

Exit only after golden parity.

---

# M23 — Specialized Algorithms → Native TypeScript

Migrate subject-aware spatial ordering modes independently.

Examples:

```text
Human
Animal
Portrait
Vehicle
Building
Landscape
Spiral
```

Each specialization gets its own fixture.

---

# M24 — Contour → Native TypeScript

Higher-risk migration.

Split into primitives:

```text
presence map
edge map
edge traversal
fill waypoint generation
outline phase
fill phase
hand trajectory
```

Use deterministic random source.

## Exit criteria

- output tolerance defined
- phase timing matches
- progress split matches
- final image matches

---

# M25 — Outline Chunks → Native TypeScript

Reuse primitives from:

```text
Contour
Chunk Jump
```

Goal: reduce duplicate logic.

Parity first. Deduplication only if behavior remains identical.

---

# M26 — Drawing Detection Algorithms → Native TypeScript

Migrate independently:

```text
Classic
Adaptive
Morph Shell
Canny+
Color Region
Real Image Edges
```

Create:

```text
engine/drawing/detection/
```

Unit test pixel maps directly.

---

# M27 — Drawing Stroke Engine → Native TypeScript

Migrate:

```text
Default
Charcoal
Sketch
Fountain
Blueprint
```

Test:

```text
waypoints
stroke width
alpha
texture
visual diff
```

---

# M28 — Outline Fill / Outline Only → Native TypeScript

Extract:

```text
outline detection
path construction
stroke animation
overlay rendering
final composition
```

---

# M29 — Illust Fill / Coloring Engine → Native TypeScript

Migrate:

```text
Sparse
Filled
Watercolor
```

This should happen after outline primitives are stable.

---

# M30 — Text Draw Algorithm → Native TypeScript

Migrate directions:

```text
Left → Right
Right → Left
Top → Bottom
Bottom → Top
```

Fill modes:

```text
Reveal
Outline
Outline + Fill
```

---

# M31 — Remove Legacy Animation Runtime

## Objective

No production runtime imports `legacy/animations.js`.

Checklist:

```text
Scanner native
Chunk Jump native
Specialized native
Contour native
Outline Chunks native
Drawing native
Text Draw native
Hand native
Renderer native
```

Keep legacy files only for regression/reference until final cleanup.

Tag:

```text
native-ts-engine-v1
```

---

# M32 — Project Persistence Service Migration

## Objective

Remove direct IndexedDB access from application domain.

Introduce abstraction:

```ts
interface ProjectRepository {
  list(): Promise<ProjectSummary[]>
  load(id: string): Promise<Project>
  save(project: Project): Promise<void>
  delete(id: string): Promise<void>
}
```

Web implementation:

```text
IndexedDbProjectRepository
```

Later:

```text
TauriProjectRepository
```

## Exit criteria

- UI/state does not know storage implementation
- IndexedDB behavior parity

---

# M33 — Offline Dependency Lockdown

## Objective

Remove runtime CDN/network dependencies.

Vendor/localize:

```text
fonts
hand assets
mp4-muxer if still needed
other remote assets
```

## Exit criteria

With network disabled:

```text
App loads
Images work
Fonts work
Animations work
Export works
```

---

# M34 — Architecture Stabilization Gate

This is the final gate before Tauri.

Required state:

```text
React UI
TypeScript
Tailwind
shadcn/ui
Zustand
Native TS engine
Storage abstraction
Export abstraction
No remote runtime dependency
All parity tests PASS
```

At this point create:

```text
web-modernized-v1
```

Only then begin desktop migration.

---

# 7. Desktop Era

---

# M35 — Tauri v2 Shell

## Objective

Wrap the stable Vite application in Tauri v2.

Add:

```text
src-tauri/
```

Do not change application behavior.

## Exit criteria

```text
pnpm tauri dev
```

works with the exact same project behavior as web build.

---

# M36 — Tauri Capability / Security Foundation

Configure:

```text
capabilities
filesystem scope
dialog scope
shell/sidecar scope if needed
CSP
asset access
```

Rule:

```text
least privilege
```

No broad filesystem access.

---

# M37 — Native Dialog Adapter

Create platform abstraction:

```ts
interface FileDialogService {
  openImage(): Promise<FileRef[]>
  openProject(): Promise<FileRef | null>
  saveProject(): Promise<FileRef | null>
  exportVideo(): Promise<FileRef | null>
}
```

Implement:

```text
WebFileDialogService
TauriFileDialogService
```

React never imports Tauri directly.

---

# M38 — Native Filesystem Project Repository

Implement:

```text
TauriProjectRepository
```

Suggested app data layout:

```text
AppData/
└── Inkplainer/
    ├── settings.json
    ├── projects/
    │   └── <project-id>/
    │       ├── project.json
    │       ├── thumbnail.png
    │       └── assets/
    └── cache/
```

Keep schema versioned.

---

# M39 — Portable Project File Format

Introduce:

```text
*.inkproj
```

Suggested archive:

```text
manifest.json
project.json
thumbnail.png
assets/*
```

Requirements:

```text
schemaVersion
appVersion
asset hashes
forward migration support
validation
```

---

# M40 — Desktop Autosave + Recovery

Introduce:

```text
dirty state
debounced save
crash recovery snapshot
temporary project recovery
```

Do not overwrite corrupted project data without backup.

---

# M41 — Desktop Export Architecture Boundary

Before FFmpeg, define:

```ts
interface VideoExportService {
  export(
    project: Project,
    options: VideoExportOptions
  ): Promise<ExportResult>
}
```

Options should support future features now:

```ts
type VideoExportOptions = {
  format: "mp4" | "webm"
  width: number
  height: number
  fps: 30 | 60
  bitrate?: number
  drawDuration?: number
  finalHoldDuration?: number
}
```

Do not implement all enhancements yet.

Define the contract first.

---

# M42 — Deterministic Frame Renderer

## Objective

Stop treating video export as screen recording.

Create:

```text
FrameRenderer
```

Input:

```text
project
timestamp
resolution
```

Output:

```text
RGBA frame
```

Concept:

```text
Project timeline
      ↓
t = 0 ms
t = 33 ms
t = 66 ms
...
      ↓
FrameRenderer
      ↓
Encoder
```

This becomes the foundation for:

```text
exact timing
60 FPS
final hold
batch rendering
background export
```

---

# M43 — Exact Duration Model

Add explicit timing model.

Example:

```ts
type TimelineSettings = {
  drawDurationMs: number
  finalHoldMs: number
}
```

Support:

```text
Drawing Duration
Final Hold
Total Duration
```

This is a post-parity enhancement and may intentionally change behavior.

---

# M44 — 30 / 60 FPS Export

Allow:

```text
30 FPS
60 FPS
```

Frame count:

```text
totalFrames = durationSeconds × FPS
```

FPS must no longer depend on browser `requestAnimationFrame`.

---

# M45 — FFmpeg Sidecar Export

Use Tauri sidecar or another well-defined native encoder boundary.

Pipeline:

```text
FrameRenderer
      ↓
raw frames / pipe
      ↓
FFmpeg
      ↓
H.264 MP4
or
VP9/AV1 WebM
```

Benefits:

```text
reliable desktop encoding
offline
exact FPS
exact timing
codec control
future audio
future batch rendering
```

---

# M46 — Export Progress / Cancellation

Create job system:

```text
QUEUED
PREPARING
RENDERING
ENCODING
FINALIZING
DONE
FAILED
CANCELLED
```

Expose progress through application service.

UI only observes job state.

---

# M47 — Final Frame Hold

Implement explicit final frame extension in deterministic timeline/export layer.

Options:

```text
0s
0.5s
1s
2s
3s
5s
custom
```

Do not fake this with setTimeout recording.

---

# M48 — Direction Model Generalization

Current direction support is not uniform across all image modes.

Introduce typed direction:

```ts
type DrawDirection =
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top"
```

Then explicitly declare support per algorithm:

```ts
type AnimationCapabilities = {
  supportsDirection: boolean
  directions?: DrawDirection[]
}
```

This prevents UI from showing unsupported settings.

---

# M49 — Custom Hand System

Add:

```text
import custom hand image
tip coordinate calibration
preview
save hand preset
per-project or global hand library
```

Suggested type:

```ts
type HandAsset = {
  id: string
  name: string
  source: AssetRef
  tipX: number
  tipY: number
  scale: number
  rotationOffset: number
}
```

---

# M50 — Desktop Packaging / Installer

Targets as required:

```text
Windows
macOS
Linux
```

Tasks:

```text
icons
bundle metadata
code signing when available
installer
versioning
release artifacts
```

---

# M51 — Auto Update

Only after packaging is stable.

Include:

```text
signed updates
release channel strategy
rollback considerations
```

---

# M52 — Legacy Cleanup

Only after:

```text
desktop app passes
native engine passes
portable project import/export passes
export passes
```

Then remove runtime legacy source.

Optionally retain an archived tag/branch.

---

# 8. Migration Dependency Graph

```text
M00 Behavior Lock + TS
 │
 ▼
M01 React/Vite
 │
 ▼
M02 Tailwind/shadcn
 │
 ▼
M03 Legacy Adapter
 │
 ▼
M04 Zustand
 │
 ├─────────────┐
 ▼             ▼
M05 Project    M06 Header
 │             │
 └──────┬──────┘
        ▼
M07 Playback
        ▼
M08 Layers
        ▼
M09 Canvas Host
        ▼
M10 Canvas Interaction
        │
        ├── M11 Crop
        ├── M12 Slicer
        └── M13 Text
              │
              ▼
        M14 Animation UI
              ▼
        M15 Export UI
              ▼
        M16 React UI Parity
              ▼
        M17 Runtime Context
              ▼
        M18 Determinism
              ▼
        M19 Renderer
              ▼
        M20 Hand
              ▼
       M21–M30 Algorithms
              ▼
        M31 Remove Legacy Runtime
              ▼
        M32 Storage Abstraction
              ▼
        M33 Offline Lockdown
              ▼
        M34 Architecture Gate
              ▼
        M35 Tauri v2
              ▼
       M36–M40 Native Desktop
              ▼
       M41–M49 Export + Features
              ▼
       M50–M52 Packaging/Cleanup
```

---

# 9. Recommended PR Boundaries

Prefer:

```text
1 migration = 1 PR
```

If a migration is large:

```text
M08A Layer types
M08B Layer store
M08C Layer panel
M08D Layer parity
```

Every PR description should contain:

```md
## Migration
M08C

## Behavior scope
Layer panel rendering only.

## Intentionally unchanged
- layer ordering behavior
- animation behavior
- persistence
- export

## Tests
- unit
- behavior
- screenshots

## Parity result
PASS / FAIL

## Known differences
None / documented links
```

---

# 10. Agent Workflow Contract

Every agent working on the migration should follow:

```text
1. Read MASTER_MIGRATION_PLAN.md
2. Read MIGRATION_STATUS.md
3. Identify current migration
4. Read BEHAVIOR_LOCK.md for affected domain
5. Inspect legacy implementation
6. Implement only current migration scope
7. Run TypeScript
8. Run tests
9. Compare legacy behavior
10. Update MIGRATION_STATUS.md
11. Document any known difference
12. Stop
```

Agent must NOT automatically start the next migration.

---

# 11. MIGRATION_STATUS.md Template

```md
# Migration Status

Current migration: M00

| ID | Migration | Status | Type | Unit | Behavior | Visual | Notes |
|---|---|---|---|---|---|---|---|
| M00 | Behavior Lock + TS | IN_PROGRESS | PASS | PASS | REVIEW | REVIEW | |
| M01 | React/Vite Shell | NOT_STARTED | - | - | - | - | |
| M02 | Tailwind/shadcn | NOT_STARTED | - | - | - | - | |
```

Feature runtime table:

```md
| Feature | Implementation | Parity |
|---|---|---|
| Project | LEGACY | PASS |
| Layers | LEGACY | PASS |
| Scanner | LEGACY | PASS |
| Contour | LEGACY | PASS |
```

---

# 12. Definition of Done for a Migration

A migration is DONE only when all applicable items pass:

## Type safety

- strict `tsc` passes
- no undocumented `any`
- no undocumented ignores

## Testing

- unit tests pass
- behavior tests pass
- integration tests pass

## Behavior

- same inputs produce same observable behavior
- keyboard behavior unchanged
- default settings unchanged

## Visual

- screenshots within accepted tolerance
- animation checkpoints within accepted tolerance

## Architecture

- no forbidden dependency introduced
- new code respects domain boundaries

## Documentation

- status updated
- known quirks updated
- architectural decision recorded when needed

---

# 13. Forbidden Migration Patterns

## Rewrite-all-at-once

Forbidden:

```text
Delete index.html
Rewrite whole app
Hope output matches
```

## React state + legacy global state both writable

Forbidden:

```text
React changes Zustand
Legacy UI changes window.state
Both are considered source of truth
```

Only one source of truth at a time.

## UI component running image algorithms

Forbidden:

```tsx
function AnimationPanel() {
  // Canny edge detection here
}
```

## Engine importing React/Zustand

Forbidden:

```text
engine → React
engine → Zustand
```

Dependency direction must remain:

```text
React
  ↓
Application
  ↓
Engine
```

## Tauri calls scattered across components

Forbidden:

```tsx
import { open } from "@tauri-apps/plugin-dialog"
```

inside arbitrary feature components.

Use services/adapters.

---

# 14. Testing Strategy

## Unit tests

For:

```text
type conversion
selectors
layer transforms
animation ordering
geometry
edge maps
slicing
timeline calculations
schema migration
```

## Behavior tests

Compare:

```text
legacy action
vs
modern action
```

Example:

```text
Upload image
→ initial position
→ initial scale
→ layer creation
```

## Golden frame tests

Capture:

```text
0%
25%
50%
75%
100%
```

for important animation fixtures.

## E2E tests

Core workflows:

```text
Create project
Import image
Configure animation
Generate
Crop
Slice
Add text
Reorder layers
Save
Reload
Export
```

## Desktop E2E later

```text
Open project from filesystem
Save As
Export MP4
Cancel render
Recover autosave
```

---

# 15. Performance Baselines

Capture before migration:

```text
startup time
project load time
1080p static render
scanner frame cost
contour setup cost
memory usage
MP4 export duration
```

Do not optimize during behavior migration unless migration causes a severe regression.

Suggested rule:

```text
>20% regression requires investigation.
```

---

# 16. Project Schema Versioning

Start versioning immediately even before native project files.

Example:

```ts
type ProjectDocument = {
  schemaVersion: 1
  id: string
  name: string
  canvas: CanvasSettings
  layers: Layer[]
  settings: ProjectSettings
}
```

Future:

```text
v1 → v2 migration
v2 → v3 migration
```

Never rely on inferred shape.

---

# 17. ID Strategy

Avoid preserving numeric IDs forever.

Prefer:

```text
UUID / crypto.randomUUID()
```

but during parity phase provide mapping if legacy numeric IDs are part of behavior.

Potential transition:

```text
LegacyLayerId = number
LayerId = branded string
```

Do not change IDs prematurely if it risks persistence mismatch.

---

# 18. Error Model

Introduce typed application errors.

Example:

```ts
type ProjectError =
  | { type: "project-not-found"; id: string }
  | { type: "invalid-project"; reason: string }
  | { type: "asset-load-failed"; assetId: string }
```

Avoid throwing generic strings across layers.

Especially important later for Tauri IPC.

---

# 19. Event / Command Architecture

For higher-risk editor actions use explicit domain commands:

```text
AddLayer
RemoveLayer
UpdateLayerTransform
SetLayerOrder
SetAnimationStyle
StartPlayback
ConfirmCrop
SliceLayer
```

This makes:

```text
undo
redo
testing
logging
future desktop integration
```

much easier.

This can be introduced incrementally after Zustand foundation.

---

# 20. Future-Compatible Undo/Redo

Current undo behavior should first be preserved.

Target architecture later:

```text
Command
 ↓
State transition
 ↓
History snapshot / inverse command
```

Do not rewrite undo during early UI migrations unless required.

Recommended dedicated migration after M16 if existing semantics are difficult to maintain.

Optional:

```text
M16A — Undo/Redo Architecture
```

---

# 21. Recommended Migration Order by Risk

## Low risk

```text
M01 shell
M02 UI foundation
M05 project UI
M06 header
M07 controls
```

## Medium risk

```text
M08 layers
M09 canvas host
M13 text
M14 settings
M15 export UI
```

## High risk

```text
M10 interactions
M11 crop
M12 slicer
M24 contour
M26 detection
M29 illustration fill
M42 deterministic frame renderer
M45 FFmpeg
```

High-risk migrations must never be grouped together.

---

# 22. Master Acceptance Milestones

## Milestone A — Foundation

Complete:

```text
M00–M04
```

Result:

```text
TypeScript
React shell
UI system
legacy adapter
Zustand contracts
```

---

## Milestone B — React Editor

Complete:

```text
M05–M16
```

Result:

```text
100% React UI
Zustand source of truth
legacy algorithms behind typed adapter
behavior parity
```

---

## Milestone C — Native TypeScript Engine

Complete:

```text
M17–M31
```

Result:

```text
no production legacy algorithm dependency
deterministic typed engine
```

---

## Milestone D — Web Architecture Stabilized

Complete:

```text
M32–M34
```

Result:

```text
storage abstraction
offline
tested modern web app
ready for desktop
```

---

## Milestone E — Tauri Desktop

Complete:

```text
M35–M40
```

Result:

```text
desktop shell
native filesystem
native projects
native dialogs
```

---

## Milestone F — Professional Export

Complete:

```text
M41–M49
```

Result:

```text
deterministic renderer
exact timing
30/60 FPS
final hold
FFmpeg
custom hand-ready architecture
```

---

## Milestone G — Production

Complete:

```text
M50–M52
```

Result:

```text
installers
updates
legacy cleanup
release-ready desktop app
```

---

# 23. What Should Be Built First

The first actual implementation sequence should be:

```text
M00
Behavior Lock + TypeScript

↓ PASS

M01
React/Vite shell

↓ PASS

M02
Tailwind + shadcn

↓ PASS

M03
Typed legacy adapter

↓ PASS

M04
Zustand domain stores
```

Do **not** begin by migrating animation algorithms.

Do **not** add Tauri yet.

Do **not** change export yet.

Do **not** redesign the UI yet.

The goal of the first milestone is to make the existing system safe to migrate.

---

# 24. Final Architecture

```text
┌────────────────────────────────────────────┐
│                React UI                    │
│ Tailwind + shadcn/ui + feature components │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│            Application Layer               │
│ services + commands + domain orchestration │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│              Zustand State                 │
│ serializable project/editor state          │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│          TypeScript Engine APIs             │
│ renderer / animation / drawing / hand      │
└────────────────────┬───────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────┐   ┌─────────────────────┐
│ Browser Adapter │   │   Tauri Adapter     │
│ IndexedDB etc.  │   │ FS / dialog / IPC  │
└─────────────────┘   └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ Rust / Native Layer │
                      │ FFmpeg / filesystem │
                      └─────────────────────┘
```

The key property is:

```text
Core editor behavior does not care whether
the application is running in browser or Tauri.
```

That is the architectural target of this migration.

---

# 25. Final Migration Rule

Before implementing any migration, the agent must answer:

```text
1. What exact behavior is being migrated?
2. Where is the current legacy implementation?
3. What is the target boundary?
4. What behavior is explicitly NOT allowed to change?
5. What fixtures prove parity?
6. What tests must pass?
7. What file updates MIGRATION_STATUS?
```

If these seven answers are not clear, the migration is not ready to start.

---

# 26. Recommended Immediate Next Step

Start only:

```text
M00 — Behavior Lock + TypeScript Foundation
```

Then proceed sequentially.

The master plan is the source of truth, while each migration may later receive its own implementation document:

```text
docs/migration/tasks/
├── M00_BEHAVIOR_LOCK_TYPESCRIPT.md
├── M01_REACT_VITE_SHELL.md
├── M02_TAILWIND_SHADCN.md
├── M03_LEGACY_ADAPTER.md
├── M04_ZUSTAND_FOUNDATION.md
└── ...
```

Those child files should contain implementation-level steps, exact files to edit, tests, and agent execution prompts, while this document remains the architecture and sequencing authority.
