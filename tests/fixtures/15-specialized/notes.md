# Fixture 15 — Specialized Modes

## Scenario

A project exercising the specialized animation styles: `specialized-human`,
`specialized-animal`, `specialized-portrait`, `specialized-vehicle`,
`specialized-building`, `specialized-landscape`, `specialized-spiral`. These
map from legacy `spec-human`, `spec-animal`, `spec-portrait`, `spec-vehicle`,
`spec-building`, `spec-landscape`, `spec-spiral`.

## Why it exists

Locks the seven specialized animation styles. Each applies a content-specific
animation tuned for a subject type (a portrait animates differently from a
landscape). The adapter maps all seven legacy `spec-*` values to clean
`specialized-*` domain names.

## State parity checks

- Each of the seven `spec-*` legacy values round-trips through
  `legacyAnimationStyleToDomain` / `domainAnimationStyleToLegacy`.
- `classifyLegacyAnimStyle('spec-human')` returns
  `{ kind: 'animation', value: 'specialized-human' }`.

## Notes

- The dead branch `spec-nature` is NOT included — it has no UI path and
  `classifyLegacyAnimStyle('spec-nature')` returns `null`.
- The seven specialized modes are covered by the enum-mapping round-trip
  tests; this fixture is the human-readable companion.