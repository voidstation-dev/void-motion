# Architecture

Describes the M00 architecture of Void Motion: the strict TypeScript foundation
that wraps the legacy Inkplainer reference app without changing its behavior.

## High-level layout

```text
void-motion/
├── legacy/                      # Frozen Inkplainer reference (golden behavior)
│   ├── index.html              # 10,774-line monolith (UI + state + persistence)
│   ├── animations.js           # 3,575-line animation engine
│   ├── images/                 # hand images, textures (relative paths preserved)
│   └── pages/                  # docs page
├── src/
│   ├── types/                  # Domain contracts (serializable, no DOM)
│   │   ├── brand.ts            # Branded IDs
│   │   ├── canvas.ts           # CanvasSettings, backgrounds, presets
│   │   ├── layer.ts            # Layer discriminated union (image | text)
│   │   ├── animation.ts        # AnimationStyle, DrawingMode, Hand, etc.
│   │   ├── export.ts           # Export formats, fps=30 literal
│   │   ├── project.ts          # ProjectDocumentV1, Preset
│   │   ├── runtime.ts          # Canvas/Image/Recorder runtime objects
│   │   └── index.ts            # Barrel
│   ├── engine/
│   │   ├── contracts/          # Engine interfaces (AnimationEngine, Renderer)
│   │   └── legacy/             # The ONE typed boundary to legacy globals
│   │       ├── legacy-state.types.ts   # LegacyInkplainerState, window globals
│   │       ├── legacy-state.adapter.ts # projectLegacyState / applyProjectToLegacyState
│   │       ├── legacy-enum-mapping.ts   # bidirectional enum mappers
│   │       ├── legacy-id.ts            # branded ↔ legacy int IDs
│   │       └── legacy-runtime.ts        # re-exports
│   ├── migration/
│   │   ├── seeded-random.ts    # Deterministic PRNG for tests only
│   │   └── assertions.ts       # parity assertions
│   ├── test-utils/
│   │   ├── fixtures.ts         # legacy/domain state builders
│   │   └── golden.ts           # golden fixture loader
│   └── main.ts                 # M00 placeholder entry (real UI is M01)
├── tests/
│   ├── behavior/               # Vitest behavior tests
│   └── fixtures/               # 15 golden fixtures (expected.json + notes.md)
├── docs/migration/             # This documentation
├── tsconfig.json               # strict + all strict flags
├── vite.config.ts              # aliases, publicDir:false (legacy not bundled)
└── vitest.config.ts            # jsdom env
```

## The boundary principle

The single most important architectural rule of M00:

> **All new typed code touches legacy globals through exactly one boundary:
> `src/engine/legacy/`.**

Nothing in `src/types/`, `src/engine/contracts/`, `src/migration/`, or
`tests/` imports from `legacy/` directly or reads `window.state`/`window.anim`
directly. They go through the adapter.

```text
┌──────────────────────────────────────────────────────────┐
│  New typed code (src/types, src/engine/contracts, tests) │
└──────────────────────┬───────────────────────────────────┘
                       │ reads/writes via adapter
              ┌────────▼─────────┐
              │  src/engine/legacy │  ← the ONLY boundary
              │  (adapter + types) │
              └────────┬─────────┘
                       │ window.state, window.anim
              ┌────────▼─────────┐
              │  legacy/ (frozen) │  ← golden reference, never edited
              └──────────────────┘
```

## Serializable vs runtime

Domain state (`ProjectDocumentV1`, `Layer`, `CanvasSettings`) is **serializable**:
plain JSON-compatible data, no DOM references, safe to persist. Runtime objects
(`HTMLCanvasElement`, `HTMLImageElement`, `MediaRecorder`) live in
`src/types/runtime.ts` and never cross into the persisted shape. This is
enforced at the type level (TE-003).

## Versioned schema

`ProjectDocumentV1` carries `schemaVersion: 1`. The legacy app has no
schemaVersion field (KQ-003); the adapter stamps `1` on projection and the
future migration path can bump it. A persisted project never loses its version.

## Strict TypeScript

`tsconfig.json` enables `strict: true` plus every individual strict flag
(`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`useUnknownInCatchVariables`, `noImplicitOverride`, etc.). There is no `any`,
no `@ts-ignore`, no `@ts-nocheck` in `src/`. Legacy globals are typed as
`unknown` where their shape is uncertain and narrowed before use (TE-004).

## Determinism for tests

`src/migration/seeded-random.ts` provides `createSeededRandom` (xfnv1a + sfc32)
and `withSeededRandom` (patches `Math.random` for the duration of a callback).
This is test-only; production randomness is untouched. When animation behavior
tests need reproducibility, they wrap playback in `withSeededRandom`.

## What M00 does NOT contain

Per MIGRATION_00 §28, M00 deliberately omits:

- React / Tailwind / shadcn (M01)
- Zustand store (later)
- Animation algorithm rewrite
- Canvas engine rewrite
- Crop/slicer/export rewrite
- 60fps / exact duration / final-frame hold
- FFmpeg / Tauri / native filesystem
- Project bundle format change

M00 only freezes behavior and lays the typed foundation. The `src/main.ts`
entry is a placeholder that imports the domain barrel so `vite build` proves
the module graph compiles; the real UI arrives in M01.