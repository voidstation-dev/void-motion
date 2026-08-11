# Type Exceptions

Records every place where the M00 TypeScript foundation makes a deliberate
non-obvious type decision. These are NOT escape hatches — they are documented
contracts. There is no `any`, no `@ts-ignore`, no `@ts-nocheck` anywhere in
`src/`. This file exists so future migrations understand *why* a type is shaped
the way it is.

## TE-001 — Branded IDs are string at runtime, nominal at compile time

**Location:** `src/types/brand.ts`

```ts
export type Brand<T, TBrand> = T & { readonly __brand: TBrand }
export type ProjectId = Brand<string, 'ProjectId'>
```

Branded IDs (`ProjectId`, `LayerId`, `LayerGroupId`, `AnimationGroupId`,
`AssetId`, `PresetId`) are `string` at runtime but nominal at compile time: a
`LayerId` is not assignable to a `ProjectId` even though both are strings. The
legacy app uses plain integers for IDs; the adapters (`src/engine/legacy/legacy-id.ts`)
convert at the boundary. New code never mixes ID kinds.

## TE-002 — `LayerAnimationOverrides` uses `T | undefined`, not `T?`

**Location:** `src/types/layer.ts`

```ts
export interface LayerAnimationOverrides {
  readonly animationStyle: AnimationStyle | undefined
  readonly handStyle: HandStyle | undefined
  // ...
}
```

The per-layer animation overrides are *optional* (a layer may inherit the
project defaults). We use `T | undefined` explicitly rather than `T?` because
`exactOptionalPropertyTypes` is enabled. With `T?`, assigning `undefined` to
the field is an error even though reading it is `T | undefined`; with
`T | undefined` the field is always present and always assignable. This is the
strict-mode-correct way to model "present but may be unset."

## TE-003 — Serializable state vs runtime objects are separate types

**Location:** `src/types/project.ts` vs `src/types/runtime.ts`

`ProjectDocumentV1` (serializable) holds no DOM references. `CanvasRuntime`,
`RuntimeAssetRegistry`, `LegacyRuntimeSnapshot` (runtime) hold
`HTMLCanvasElement`, `HTMLImageElement`, `MediaRecorder`. These never cross:
a project saved to IndexedDB cannot contain a canvas element. The adapter
layer (`src/engine/legacy/legacy-state.adapter.ts`) projects legacy globals
into the serializable shape and discards runtime objects.

## TE-004 — `LegacyInkplainerState` has a string index signature

**Location:** `src/engine/legacy/legacy-state.types.ts`

```ts
export interface LegacyInkplainerState {
  // ...~60 typed keys...
  readonly [key: string]: unknown
}
```

The legacy `state` object is a bag of ~60 keys plus ad-hoc properties set by
various legacy code paths. We type the keys we *use* and allow unknown extras
via the index signature rather than `any`. Extras are `unknown` and must be
narrowed before use. This is the strict-mode-compatible way to model a legacy
global without losing type safety on the fields we care about.

## TE-005 — `classifyLegacyAnimStyle` returns a discriminated union or null

**Location:** `src/engine/legacy/legacy-enum-mapping.ts`

The legacy `state.animStyle` field conflates animation styles (scanner, contour,
...) and drawing modes (outline-fill, illust-fill, ...) into one string. The
new model keeps them separate (`AnimationStyle` vs `DrawingMode`). The
classifier routes a legacy value to one or the other, or `null` for dead
branches (scribble, nervous, top-anchor, gesture, spec-nature) that exist in
legacy code but are unreachable from the UI. `null` is a valid result: it
means "this value is not a live feature."

## TE-006 — `ANIMATION_STYLE_TO_DOMAIN` is `Partial<Record<...>>`

**Location:** `src/engine/legacy/legacy-enum-mapping.ts`

`LegacyAnimationStyle` (the union of all legacy raw values) includes dead
branches, but `AnimationStyle` (the domain union) does not. A full
`Record<LegacyAnimationStyle, AnimationStyle>` would force every dead branch
to map to *something*. We use `Partial<Record<...>>` so dead branches can be
absent; `legacyAnimationStyleToDomain` throws on the unmapped case, and
`classifyLegacyAnimStyle` returns `null`. This is the type-level expression of
"dead branches are not live features."

## TE-007 — `fps` is the literal type `30`

**Location:** `src/types/export.ts`

```ts
export type ExportFps = 30
```

The legacy app hardcodes 30fps everywhere (captureStream(30), export timing,
playback). We model this as a literal type, not `number`, so any future change
to the fps is a deliberate type-level decision visible in a diff. 60fps is
explicitly out of scope for M00 (§28).

## TE-008 — Legacy `window.state` and `window.anim` are typed globals

**Location:** `src/engine/legacy/legacy-state.types.ts`

```ts
declare global {
  interface Window {
    state: LegacyInkplainerState
    anim: LegacyAnimationEngineApi
  }
}
```

The legacy app puts `state` and `anim` on `window`. We declare them as typed
globals so adapter code (`requireLegacyState()`) can access them with type
safety. New code must never touch `window.state` directly — only through the
adapter. The `declare global` is the single point where the legacy boundary
is acknowledged by the type system.

## TE-009 — `sourceMetadata` and `canvasBg.key` built conditionally

**Location:** `src/engine/legacy/legacy-state.adapter.ts`

Under `exactOptionalPropertyTypes`, an optional field cannot be assigned
`undefined`. The adapter builds `sourceMetadata` (only for image layers) and
`canvasBg.key` (only for gradient backgrounds) conditionally, so the field is
either present-with-a-value or absent — never present-with-undefined. This is
the strict-mode-correct way to project optional legacy fields.