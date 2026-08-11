# Known Quirks

Per MIGRATION_00 §24. These are strange-but-functional legacy behaviors that
must be PRESERVED during migration unless a later phase explicitly addresses
them. Documenting them here prevents agents from "helpfully" fixing
architecture while migrating UI. Each quirk has a status and a migration rule.

Statuses:
- **PRESERVE** — keep as-is through all phases unless explicitly re-approved.
- **PRESERVE DURING WEB PARITY** — keep for the web app; revisit before desktop.
- **PRESERVE UNTIL <phase>** — keep until the named migration phase.

---

## KQ-001 — Export tied to real-time animation

**Status:** PRESERVE UNTIL EXPORT MIGRATION

**Current behavior:**
Video recording (WebM and MP4) tracks real-time `requestAnimationFrame` playback.
Export calls `restartAnim()` and records the live animation; completion is
detected by polling `isExportAnimationComplete()` every 200ms. Export duration
equals wall-clock animation duration.

**Locations:** `index.html:9094-9191` (WebM), `:9196-9353` (MP4), `:9355-9361`
(completion check).

**Migration rule:**
Do not replace with deterministic offline rendering until the export migration
phase. Real-time export is a quirk, not a bug — changing it would alter output
timing and frame counts.

---

## KQ-002 — MP4 muxer loaded remotely from CDN

**Status:** PRESERVE DURING WEB PARITY

**Current behavior:**
MP4 export dynamically imports `mp4-muxer@5.2.2` from
`https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.mjs`
(`index.html:9202`). If the import fails, export aborts with
`'Could not load mp4-muxer v5.2.2. Check your internet connection.'` (`:9207`).
This means MP4 export requires internet access.

**Migration rule:**
Keep the CDN import for the web app. Before any desktop/offline release, vendor
the dependency locally. Do not switch to a different muxer or bundle it during
M00–M01.

**Later target:** Vendor `mp4-muxer` before desktop release.

---

## KQ-003 — No schemaVersion field in legacy persistence

**Status:** PRESERVE UNTIL PERSISTENCE MIGRATION

**Current behavior:**
The legacy IndexedDB store (`WhiteboardAnimatorDB`, store `projects`) has no
`schemaVersion` field on records (`index.html:4250-4265`). The DB version is
the literal `1` passed to `indexedDB.open`; `onupgradeneeded` only creates the
store if missing. There is no migration logic. The DB name is still
`'WhiteboardAnimatorDB'` (the old "Whiteboard Animator" name), not
`'InkplainerDB'` or `'VoidMotionDB'`.

**Migration rule:**
The domain model (`ProjectDocumentV1`) stamps `schemaVersion: 1` on projection,
but the adapter must not require it when reading legacy state. Legacy records
are treated as version 1 by default. Do not rename the DB or add migration
logic until the persistence migration phase.

---

## KQ-004 — Animation styles and drawing modes share one field

**Status:** PRESERVE UNTIL ANIMATION MODEL MIGRATION

**Current behavior:**
The legacy `state.animStyle` field conflates animation styles (scanner, contour,
chunkjump, ...) and drawing modes (outlinefill, illustfill, outlineonly,
spec-text) into one string (`index.html:7774`). There is no separate "drawing
mode" state. The distinction is purely UI categorization (Animation tab vs
Drawing tab) and which option cards are shown. The dispatcher `setupStyle()`
routes all values through the same switch.

**Migration rule:**
The domain model splits these into `AnimationStyle` and `DrawingMode`, but the
adapter must round-trip them through the single legacy field. Do not introduce
a separate `state.drawingMode` in legacy. The split is a domain-model concern
only until the animation model is migrated.

---

## KQ-005 — Parallel-animation slot system swaps ~60 state keys per slot

**Status:** PRESERVE UNTIL ANIMATION ENGINE MIGRATION

**Current behavior:**
When layers share an `animOrder` number, they animate in parallel via a slot
system (`animations.js:1781-1945`). `_SLOT_KEYS` lists 61 state keys; `_slotIn`
swaps all of them from a slot's saved state into the global `state` (and the
offscreen canvas/ctx) before ticking, and `_slotOut` swaps them back. Each
parallel layer gets its own isolated offscreen canvas + per-animation state
copy. This is a performance/correctness hack to make the single-global-state
engine behave as if it has per-layer state.

**Migration rule:**
The domain model exposes only `animationOrder` (the value that selects the
slot); it does not model the slot mechanics. Do not replace the slot system
until the animation engine is rewritten (later phase). The adapter must not
touch `_SLOT_KEYS`.

---

## KQ-006 — Crop is non-destructive

**Status:** PRESERVE

**Current behavior:**
`confirmCrop` (`index.html:9504-9556`) saves the original image into
`layer._origImg` (with `_origX/Y/W/H`) before replacing `layer.img` (`:9510-9516`).
The slicer reads `layer._origImg || layer.img` (`:10128`). Undo/redo serializes
`origImageDataURL` from `layer._origImg` (`:4916`) and restores it (`:5053,
5082-5084`). So the original pixels survive crop and can be re-cropped/reverted
via undo.

**Migration rule:**
Preserve non-destructive crop. The domain model records the crop source
rectangle; the original pixels must remain available. Do not make crop
destructive in any phase without explicit approval.

---

## KQ-007 — Undo/redo loses text-layer raw metadata

**Status:** PRESERVE UNTIL UNDO MIGRATION

**Current behavior:**
`_serializeState()` (`index.html:4895-4944`) does not store `kind` or `_text*`
metadata — only `saveProject` stores `kind`/`textProps` (`:4326-4327`). So
undo/redo of a text layer loses the raw text metadata and treats it as a plain
image layer. After undo, a text layer cannot be re-edited as text (double-click
won't open the text editor because `kind` is gone).

**Migration rule:**
Preserve this behavior. The undo snapshot is a reduced image-only view; text
re-edit after undo is not supported in legacy. Do not fix until the undo
migration phase.

---

## KQ-008 — Dead animation branches exist in code but are unreachable

**Status:** PRESERVE (DO NOT WIRE UP)

**Current behavior:**
Six animation branches exist in `animations.js` but have no UI button and are
unreachable from the app: `scribble`, `nervous`, `top-anchor`, `gesture`,
`spec-nature`, `explode`. `nervous`, `top-anchor`, `gesture` are fully orphaned
(not even in the setup/tick switches). `scribble` and `spec-nature` are in the
switches but no UI button sets them. `explode` is neither in switches nor UI.

**Migration rule:**
Do NOT wire up UI buttons for these branches. The domain `AnimationStyle`
union excludes them; `classifyLegacyAnimStyle` returns `null` for them. They
are preserved in `legacy/` as-is (never edit legacy) but are not part of the
typed contract. If a saved project somehow contains one of these values, the
adapter treats it as `null` (falls back to default).

---

## KQ-009 — 30 FPS is hardcoded; no frame-rate setting

**Status:** PRESERVE UNTIL EXPORT MIGRATION

**Current behavior:**
Both export paths hardcode 30 FPS: WebM `captureStream(30)` (`index.html:9124`),
MP4 `const FPS = 30` (`:9212`). There is no user-facing frame-rate setting.
60fps and exact-duration export are explicitly out of scope for M00 (§28).

**Migration rule:**
Keep 30fps. The domain `ExportFps` type is the literal `30`. Do not introduce
a frame-rate setting until the export migration phase.

---

## KQ-010 — No loop feature

**Status:** PRESERVE

**Current behavior:**
There is no `state.loop` variable and no loop toggle in the UI. When animation
completes, `finishAnim()` sets `state.done=true; state.playing=false`
(`index.html:8752`). Pressing play again when done calls `restartAnim()`
(`:8658`), which replays from the beginning.

**Migration rule:**
Do not add a loop feature. If a loop is desired in future, it is a separate
feature migration, not a bug fix.

---

## KQ-011 — Project name uses the old "Whiteboard Animator" DB name

**Status:** PRESERVE UNTIL PERSISTENCE MIGRATION

**Current behavior:**
The IndexedDB database is named `'WhiteboardAnimatorDB'` (`index.html:4250`),
retaining the original product name. The app is now "Inkplainer" / "Void
Motion" but the DB name was never changed.

**Migration rule:**
Do not rename the DB during M00. Renaming would orphan existing user projects.
If a rename is desired later, it requires a migration step that copies records
from the old DB to the new one.

---

## KQ-012 — Hand images loaded via setTimeout(100ms)

**Status:** PRESERVE

**Current behavior:**
`loadCustomHandImages()` is called via `setTimeout(loadCustomHandImages, 100)`
(`index.html:8910`) — a 100ms delay after page load. The hand images are
loaded asynchronously and may not be available for the first few frames of an
animation started immediately on load.

**Migration rule:**
Preserve the lazy-load behavior. Do not block on hand image loading; the
domain model treats hand images as runtime assets, not persisted state.

---

## KQ-013 — Slicer removes the original layer

**Status:** PRESERVE

**Current behavior:**
After slicing, the original layer is removed (`index.html:10152, 10246-10249`)
and replaced in-place by its slices. The original is deleted, not hidden.
`state.selectedLayerId = newLayers[0].id`.

**Migration rule:**
Preserve original removal. This is the expected slicer behavior, not a bug.
Undo can restore the original (the `applySlices` snapshot includes the full
pre-slice state).

---

## KQ-014 — Detection algorithms `chroma` and `log` exist but have no UI

**Status:** PRESERVE (DO NOT WIRE UP)

**Current behavior:**
`_buildInkWaypointsByAlgorithm` (`animations.js:2639-2656`) dispatches
`chroma` (`:2649`, `_buildInkMap_Chroma` `:2389-2423`) and `log` (`:2650`,
`_buildInkMap_LoG` `:2434-2494`) but no UI button sets them (`data-alg` only
offers classic, adaptive, morph-shell, canny2). They are reachable via saved
state only.

**Migration rule:**
Do NOT wire up UI buttons for `chroma` or `log`. The domain
`DetectionAlgorithm` union excludes them. If a saved project contains one,
the adapter maps it to the closest live algorithm or falls back to `classic`.