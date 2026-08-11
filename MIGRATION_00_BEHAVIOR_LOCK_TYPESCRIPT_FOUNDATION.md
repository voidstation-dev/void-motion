# Migration 00 — Behavior Lockdown + TypeScript Foundation

> Project: Inkplainer-OS → React/Vite/TypeScript migration
>
> Goal: Lock current observable behavior before any UI/runtime rewrite, while introducing TypeScript contracts from day one so later migrations do not drift or require incompatible state reshaping.

---

## 1. Scope

This phase does **not** redesign UI, fix animation behavior, move to Tauri, replace IndexedDB, or rewrite rendering algorithms.

This phase only establishes:

1. A frozen behavioral reference for the current Inkplainer app.
2. A TypeScript-first domain model for project/layer/animation/playback/export state.
3. A legacy compatibility boundary so existing JavaScript can continue running unchanged.
4. Golden fixtures and parity tests that every later migration must pass.
5. Migration status tracking and explicit rules for agents.

The existing Inkplainer implementation remains the source of truth until a feature is marked `PARITY`.

---

# 2. Non-negotiable migration rules

## Rule 1 — Behavior before architecture

Do not change user-visible behavior while migrating implementation.

If legacy behavior is strange but functional, document it under `KNOWN_QUIRKS.md` and preserve it until a separate bug-fix phase.

## Rule 2 — TypeScript from the first migration commit

All new code must be TypeScript unless it is an untouched legacy file.

Allowed legacy files:

```text
legacy/index.html
legacy/animations.js
legacy/assets/**
```

All new files:

```text
*.ts
*.tsx
```

Avoid creating new `.js` files.

## Rule 3 — Legacy code is reference code

Do not progressively mutate the original code until parity is established.

Prefer adapters around legacy behavior instead of editing the legacy implementation.

## Rule 4 — One migration dimension per PR

Do not combine these in one PR:

- behavior changes
- UI redesign
- state redesign
- animation algorithm rewrite
- export changes
- desktop/Tauri changes

Migration PRs should primarily change implementation while retaining observable output.

## Rule 5 — No `any` as migration shortcut

Avoid:

```ts
const state: any = ...
```

If an unknown legacy shape cannot yet be modeled safely, use:

```ts
unknown
```

then narrow explicitly.

Temporary exceptions must be annotated:

```ts
// MIGRATION-TODO(M00): explain why this cannot yet be typed.
```

## Rule 6 — Serializable domain state

Zustand/domain state introduced later must not depend directly on browser runtime objects.

Do not place these into persisted project state:

```text
HTMLCanvasElement
CanvasRenderingContext2D
HTMLImageElement
ImageBitmap
ImageData
OffscreenCanvas
MediaRecorder
VideoEncoder
```

Runtime handles belong in the engine/runtime layer.

---

# 3. Target repository structure after Migration 00

```text
inkplainer/
│
├── legacy/
│   ├── index.html
│   ├── animations.js
│   └── assets/
│
├── src/
│   ├── types/
│   │   ├── brand.ts
│   │   ├── project.ts
│   │   ├── canvas.ts
│   │   ├── layer.ts
│   │   ├── animation.ts
│   │   ├── drawing.ts
│   │   ├── playback.ts
│   │   ├── export.ts
│   │   └── index.ts
│   │
│   ├── engine/
│   │   ├── contracts/
│   │   │   ├── animation-engine.ts
│   │   │   ├── renderer.ts
│   │   │   └── project-runtime.ts
│   │   └── legacy/
│   │       ├── legacy-state.types.ts
│   │       ├── legacy-state.adapter.ts
│   │       └── legacy-runtime.ts
│   │
│   ├── migration/
│   │   ├── assertions.ts
│   │   └── seeded-random.ts
│   │
│   └── test-utils/
│       ├── fixtures.ts
│       └── golden.ts
│
├── tests/
│   ├── behavior/
│   ├── fixtures/
│   ├── golden/
│   └── snapshots/
│
├── docs/
│   └── migration/
│       ├── BEHAVIOR_LOCK.md
│       ├── FEATURE_MATRIX.md
│       ├── GOLDEN_PROJECTS.md
│       ├── KNOWN_QUIRKS.md
│       ├── MIGRATION_STATUS.md
│       └── TYPE_CONTRACTS.md
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

React components are intentionally not required yet.

This phase creates the foundation before UI migration starts.

---

# 4. Toolchain foundation

Install and configure:

```text
TypeScript
Vite
Vitest
ESLint
Prettier
Playwright
```

React may be installed now if the project bootstrap already includes it, but no production UI rewrite is required in Migration 00.

Recommended package scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  }
}
```

---

# 5. TypeScript compiler policy

Start strict rather than gradually enabling strictness later.

Recommended `tsconfig.json` baseline:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

If legacy globals prevent strict compilation, they must be isolated behind typed adapters instead of weakening the entire compiler configuration.

---

# 6. Branded IDs from the beginning

Avoid generic `number` or `string` IDs everywhere.

Create:

```ts
// src/types/brand.ts
export type Brand<T, TBrand extends string> = T & {
  readonly __brand: TBrand
}

export type ProjectId = Brand<string, 'ProjectId'>
export type LayerId = Brand<string, 'LayerId'>
export type AssetId = Brand<string, 'AssetId'>
export type AnimationGroupId = Brand<string, 'AnimationGroupId'>
```

Legacy numeric layer IDs can temporarily be converted inside the adapter.

Example:

```ts
export function fromLegacyLayerId(id: number): LayerId {
  return String(id) as LayerId
}
```

Do not leak legacy numeric IDs into the new domain model.

---

# 7. Core project contracts

Create versioned project state immediately.

```ts
export interface InkplainerProject {
  schemaVersion: 1
  id: ProjectId
  name: string
  canvas: CanvasConfig
  layers: Layer[]
  background: BackgroundConfig
  animation: GlobalAnimationConfig
  createdAt: string
  updatedAt: string
}
```

Why version from day one:

```text
IndexedDB legacy
      ↓
React browser project format
      ↓
Tauri filesystem format
      ↓
future project bundle
```

All future migrations can use explicit schema migration functions.

---

# 8. Canvas contracts

```ts
export type AspectRatio = '16:9' | '9:16' | '1:1' | 'custom'

export interface CanvasSize {
  width: number
  height: number
}

export interface CanvasConfig {
  size: CanvasSize
  aspectRatio: AspectRatio
  resolutionPreset: '720p' | '1080p' | '1440p' | 'custom'
}
```

Do not store CSS display dimensions inside project data.

Separate:

```text
logical canvas size
vs
viewport/display size
```

---

# 9. Layer contracts

Use a discriminated union instead of one enormous optional interface.

```ts
export type Layer = ImageLayer | TextLayer

export interface BaseLayer {
  id: LayerId
  name: string
  visible: boolean
  opacity: number
  transform: LayerTransform
  animationOrder: number | null
  animation: LayerAnimationConfig
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  assetId: AssetId
  sourceMetadata: ImageSourceMetadata
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  textStyle: TextStyle
}
```

Transform:

```ts
export interface LayerTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}
```

If rotation does not currently exist, keep it `0` and do not expose new behavior yet.

---

# 10. Animation contracts

Do not type animation mode as generic `string`.

```ts
export type AnimationStyle =
  | 'chunk-jump'
  | 'scanner'
  | 'contour'
  | 'outline-chunks'
  | 'human'
  | 'animal'
  | 'portrait'
  | 'vehicle'
  | 'building'
  | 'landscape'
  | 'spiral'
```

Drawing mode:

```ts
export type DrawingMode =
  | 'outline-fill'
  | 'illust-fill'
  | 'outline-only'
  | 'text-draw'
```

Text direction:

```ts
export type DrawDirection =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top'
```

Hand style:

```ts
export type HandStyle =
  | 'ghost'
  | 'hand-1'
  | 'hand-2'
  | 'hand-3'
  | 'pen'
```

Preserve current legacy values inside adapters only:

```text
custom1 → hand-1
custom2 → hand-2
custom3 → hand-3
custom4 → pen
ltr     → left-to-right
rtl     → right-to-left
ttb     → top-to-bottom
btt     → bottom-to-top
```

---

# 11. Drawing contracts

```ts
export type StrokeStyle =
  | 'default'
  | 'charcoal'
  | 'sketch'
  | 'fountain'
  | 'blueprint'

export type DetectionAlgorithm =
  | 'classic'
  | 'adaptive'
  | 'morph-shell'
  | 'canny-plus'

export type ColoringStyle =
  | 'sparse'
  | 'filled'
  | 'watercolor'
```

These values must be derived from current behavior, not redesigned naming in the UI.

---

# 12. Playback contracts

Keep future deterministic timing needs in mind without changing current behavior.

```ts
export type PlaybackStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'completed'

export interface PlaybackState {
  status: PlaybackStatus
  progress: number
  currentGroupIndex: number
}
```

Do **not** add exact duration/final-hold behavior to production yet.

They belong to a later feature phase after legacy parity.

However reserve separate future-compatible types if helpful:

```ts
export interface TimelineTiming {
  drawingDurationMs?: number
  finalHoldMs?: number
}
```

Optional only. No UI/behavior should consume these values during Migration 00.

---

# 13. Export contracts

Model current export behavior explicitly.

```ts
export type ExportFormat = 'webm' | 'mp4' | 'png'
export type ExportQuality = 'low' | 'medium' | 'high'

export interface VideoExportConfig {
  format: 'webm' | 'mp4'
  quality: ExportQuality
  includeFinalPng: boolean
  fps: 30
}
```

Important:

```text
fps: 30
```

must remain literal in this phase because current behavior is 30 FPS.

Do not prematurely change it to:

```ts
fps: number
```

unless the code needs to model legacy internals.

Future 60 FPS support belongs to a separate product feature phase.

---

# 14. Runtime must be separate from domain types

Create runtime interfaces:

```ts
export interface CanvasRuntime {
  mainCanvas: HTMLCanvasElement
  handCanvas: HTMLCanvasElement
  selectionCanvas?: HTMLCanvasElement
}
```

Runtime assets:

```ts
export interface RuntimeAssetRegistry {
  getImage(assetId: AssetId): HTMLImageElement | undefined
}
```

Never serialize these objects.

---

# 15. Legacy state typing

Do not immediately try to perfectly model the entire 10k-line legacy global state.

Create a minimum compatibility interface:

```ts
export interface LegacyInkplainerState {
  canvasW: number
  canvasH: number
  layers: LegacyLayer[]
  selectedLayerId: number | null
  playing: boolean
  done: boolean
  hand: string
  exportFormat?: string
  exportQuality?: string
}
```

Expand this type only when a migration feature needs additional fields.

This avoids two failure modes:

1. creating a fake type that does not match runtime
2. wasting time fully typing temporary legacy internals

---

# 16. Legacy adapter boundary

All new code must interact with legacy globals through one boundary.

Create:

```text
src/engine/legacy/legacy-state.adapter.ts
```

API example:

```ts
export interface LegacyStateAdapter {
  readProject(): InkplainerProject
  applyProject(project: InkplainerProject): void

  selectLayer(id: LayerId | null): void
  updateLayer(id: LayerId, patch: Partial<Layer>): void

  play(): void
  pause(): void
  restart(): void
}
```

It is acceptable for the adapter implementation to call legacy globals.

It is **not** acceptable for future React components to call:

```ts
window.state
window.selectLayer
window.restartAnim
```

directly.

---

# 17. Window declarations

If legacy globals must be accessed, type them explicitly.

```ts
declare global {
  interface Window {
    state?: LegacyInkplainerState
    AnimationEngine?: LegacyAnimationEngineApi
    selectLayer?: (id: number) => void
    restartAnim?: () => void
  }
}
```

Use runtime guards:

```ts
if (!window.state) {
  throw new Error('Legacy Inkplainer state is unavailable')
}
```

Never use non-null assertions everywhere as a substitute for lifecycle handling.

---

# 18. Behavioral lockdown inventory

Create `docs/migration/BEHAVIOR_LOCK.md` covering at least:

## Project

- create project
- rename project
- autosave timing
- load project
- delete project

## Image layer

- upload
- auto scale
- initial position
- transparency handling
- resize
- opacity
- visibility
- rename
- delete
- reorder

## Text layer

- create
- edit
- font
- size
- bold/italic
- alignment
- line height
- letter spacing
- color

## Layer animation ordering

- numbered order
- blank order
- same-order parallel behavior

## Canvas

- resolution presets
- aspect ratios
- backgrounds
- resize/fit behavior

## Crop

- activation
- handles
- move
- Shift aspect lock
- reset
- confirm
- cancel
- non-destructive source behavior

## Slicer

- grid
- rectangle
- freehand
- layer inheritance
- original removal

## Animation

- chunk jump
- scanner
- contour
- outline chunks
- specialized modes

## Drawing

- outline fill
- illustration fill
- outline only
- text draw

## Hand

- ghost
- hand 1
- hand 2
- hand 3
- pen

## Export

- WebM
- MP4
- PNG
- quality values
- 30 FPS behavior
- completion detection
- exported naming behavior

## Undo/redo

Document exactly which actions currently create snapshots and which actions do not.

---

# 19. Feature matrix

Create `FEATURE_MATRIX.md`:

```md
| Feature | Legacy | Behavior documented | Fixture | Automated test | Ready to migrate |
|---|---:|---:|---:|---:|---:|
| Image upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| Layer reorder | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scanner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contour | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crop | ✅ | ✅ | ✅ | ✅ | ✅ |
| Slicer | ✅ | ✅ | ✅ | ✅ | ✅ |
```

A feature is not allowed to enter React migration until `Ready to migrate = ✅`.

---

# 20. Golden project fixtures

Create reusable test fixtures.

Minimum set:

```text
01-single-transparent-png
02-single-photo
03-text-layer
04-image-plus-text
05-three-layer-sequential
06-parallel-animation-order
07-cropped-image
08-grid-sliced-image
09-freehand-sliced-image
10-scanner
11-contour
12-outline-fill
13-illust-fill
14-outline-only
15-specialized-human
16-specialized-portrait
17-background-texture
18-complex-project
```

Each fixture should contain:

```text
fixture/
├── assets/
├── expected.json
├── screenshots/
│   ├── initial.png
│   ├── progress-25.png
│   ├── progress-50.png
│   ├── progress-75.png
│   └── final.png
└── notes.md
```

---

# 21. Deterministic animation tests

Some legacy animation code uses `Math.random()` for visual jitter.

Do not rewrite the algorithm yet.

For testing only, inject deterministic randomness.

```ts
export interface RandomSource {
  next(): number
}
```

Test implementation:

```ts
export function createSeededRandom(seed: number): RandomSource {
  // deterministic implementation
}
```

Legacy E2E tests may temporarily patch `Math.random` before animation playback.

Production behavior remains unchanged.

---

# 22. Behavioral snapshots

Do not rely only on screenshots.

Capture machine-readable behavioral snapshots.

Example:

```json
{
  "projectName": "Fixture 06",
  "canvas": {
    "width": 1280,
    "height": 720
  },
  "layerCount": 3,
  "layers": [
    {
      "type": "image",
      "visible": true,
      "opacity": 1,
      "animationOrder": 1
    }
  ],
  "hand": "hand-1",
  "animationStyle": "scanner"
}
```

These snapshots become state parity checks once Zustand is introduced.

---

# 23. Visual parity policy

When comparing legacy and migrated implementation:

Use tolerance rather than strict pixel equality where anti-aliasing/browser timing causes harmless noise.

Categories:

```text
STATE PARITY
LAYOUT PARITY
FINAL FRAME PARITY
ANIMATION CHECKPOINT PARITY
INTERACTION PARITY
```

Do not require video binary hashes to match.

Instead compare:

- frame appearance
- frame count expectations
- animation completion
- canvas dimensions
- output format availability

---

# 24. Known quirks policy

Create `KNOWN_QUIRKS.md`.

Example structure:

```md
## KQ-001 — Export tied to real-time animation

Status: PRESERVE

Current behavior:
Video recording tracks real-time requestAnimationFrame playback.

Migration rule:
Do not replace with deterministic offline rendering until export migration phase.

---

## KQ-002 — MP4 muxer loaded remotely

Status: PRESERVE DURING WEB PARITY

Later target:
Vendor dependency before desktop release.
```

This prevents agents from “helpfully” fixing architecture while migrating UI.

---

# 25. Migration status tracking

Create `MIGRATION_STATUS.md`.

Status enum:

```text
LOCKED
READY
ADAPTED
MIGRATING
PARITY
NATIVE
REMOVED
BLOCKED
```

Example:

```md
| Domain | Status | Types | Tests | Notes |
|---|---|---:|---:|---|
| Project | LOCKED | ✅ | ✅ | Legacy IndexedDB |
| Layer state | LOCKED | ✅ | ✅ | |
| Canvas | LOCKED | ✅ | ✅ | |
| Crop | LOCKED | ✅ | ✅ | |
| Slicer | LOCKED | ✅ | ✅ | |
| Scanner | LOCKED | ✅ | ✅ | |
| Contour | LOCKED | ✅ | ✅ | random jitter seeded in tests |
| Export | LOCKED | ✅ | ✅ | 30 FPS only |
```

---

# 26. Migration 00 implementation tasks

## M00-T01 — Preserve original source

- [ ] Move/copy current application into `legacy/`
- [ ] Preserve current working commit/tag
- [ ] Confirm legacy app still launches unchanged
- [ ] Do not apply formatting to legacy source

## M00-T02 — Bootstrap TypeScript/Vite

- [ ] Add TypeScript
- [ ] Add Vite
- [ ] Add strict tsconfig
- [ ] Add path aliases if needed
- [ ] Add Vitest
- [ ] Add Playwright
- [ ] Add ESLint
- [ ] Add Prettier

## M00-T03 — Domain contracts

- [ ] Add branded IDs
- [ ] Add Project types
- [ ] Add Canvas types
- [ ] Add Layer discriminated unions
- [ ] Add Animation types
- [ ] Add Drawing types
- [ ] Add Playback types
- [ ] Add Export types

## M00-T04 — Legacy types

- [ ] Define minimum `LegacyInkplainerState`
- [ ] Define legacy layer shape
- [ ] Define legacy animation API
- [ ] Declare required window globals

## M00-T05 — Legacy adapters

- [ ] Legacy project → typed project mapper
- [ ] Typed project → legacy mapper
- [ ] Legacy layer ID conversion
- [ ] Animation enum mapping
- [ ] Hand enum mapping
- [ ] Direction enum mapping

## M00-T06 — Behavior documentation

- [ ] Complete `BEHAVIOR_LOCK.md`
- [ ] Complete `FEATURE_MATRIX.md`
- [ ] Complete `KNOWN_QUIRKS.md`
- [ ] Complete `TYPE_CONTRACTS.md`

## M00-T07 — Golden fixtures

- [ ] Create minimum fixture set
- [ ] Capture initial/final screenshots
- [ ] Capture animation checkpoints
- [ ] Save expected state snapshots

## M00-T08 — Deterministic tests

- [ ] Add seeded random utility
- [ ] Use seed in animation tests
- [ ] Do not alter production randomness

## M00-T09 — CI gate

Required commands must pass:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

---

# 27. Acceptance criteria

Migration 00 is complete only when all conditions are true.

## Legacy integrity

- [ ] Legacy Inkplainer still runs independently.
- [ ] No user-visible behavior was intentionally changed.
- [ ] Legacy source remains usable as parity reference.

## TypeScript foundation

- [ ] `strict: true` is enabled.
- [ ] All new application code is `.ts`/`.tsx`.
- [ ] No broad `any` escape hatch is introduced.
- [ ] Core project/layer/animation contracts compile.
- [ ] Runtime DOM/canvas types are isolated from persisted project state.

## Behavior lockdown

- [ ] Current behavior is documented feature-by-feature.
- [ ] Known quirks are explicitly listed.
- [ ] Minimum golden fixture suite exists.
- [ ] Deterministic animation test mode exists.

## Adapter readiness

- [ ] New typed code can read legacy state through an adapter.
- [ ] New typed code can map typed state back into legacy-compatible values.
- [ ] No future React component will need direct `window.state` access.

## Quality gate

- [ ] Typecheck passes.
- [ ] Unit tests pass.
- [ ] Behavioral E2E tests pass.
- [ ] Production build succeeds.

---

# 28. Explicitly out of scope

Do not do these in Migration 00:

```text
React UI rewrite
Tailwind redesign
shadcn component replacement
Zustand production store migration
animation algorithm rewrite
Canvas engine rewrite
crop rewrite
slicer rewrite
export rewrite
60 FPS
exact duration
final-frame hold
FFmpeg
Tauri
native filesystem
native dialogs
project bundle format
```

Some dependencies may be installed in preparation, but they must not become behavior-changing work in this phase.

---

# 29. Exit artifact for the next migration

At the end of M00, the repository should expose a stable typed contract that Migration 01 can consume.

Migration 01 should be:

```text
React + Vite application shell
Tailwind CSS
shadcn/ui foundation
Legacy app embedding/adapter connection
NO feature behavior rewrite yet
```

Migration 01 must import types from:

```text
src/types/**
```

It must not redefine project/layer/animation models inside React components.

---

# 30. Agent execution instruction

Use this exact operating policy when an agent executes Migration 00:

```text
You are implementing Migration 00 for Inkplainer.

Read this document completely before making changes.

Primary objective:
Lock the current Inkplainer behavior and introduce a strict TypeScript domain foundation without rewriting existing user-facing features.

Rules:
1. Treat the existing legacy app as the behavior source of truth.
2. Do not redesign UI.
3. Do not fix product behavior unless required only for test determinism and invisible to production users.
4. All new code must use TypeScript.
5. Keep strict TypeScript enabled; do not solve migration errors by disabling compiler checks.
6. Do not use `any` as a broad compatibility layer.
7. Isolate legacy globals behind typed adapters.
8. Domain state must remain serializable; DOM/canvas runtime objects belong in runtime modules.
9. Add golden fixtures/tests before migrating implementation.
10. Update MIGRATION_STATUS.md after every completed task.
11. Do not start Migration 01 until every M00 acceptance criterion passes.

If legacy behavior is ambiguous, inspect the current implementation and document the observed behavior before writing replacement abstractions.

When implementation and legacy behavior disagree, legacy wins during this phase.
```

---

# 31. Definition of Done

Migration 00 is DONE when the project has:

```text
Legacy behavior frozen
        +
strict TypeScript contracts
        +
typed legacy boundary
        +
golden fixtures
        +
behavior tests
        +
explicit migration tracking
```

Only then proceed to React/Vite UI migration.

