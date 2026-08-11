# Fixture 06 — Parallel Animation Order

## Scenario

A project with three layers that share the *same* animation order number (e.g.
all `animationOrder = 1`). They animate simultaneously rather than sequentially.

## Why it exists

Locks the parallel-animation-order behavior. When two or more layers share an
`animationOrder` value, they animate at the same time. This is the core of the
legacy parallel-animation slot system (`_SLOT_KEYS`): layers with the same
order number occupy the same slot and their state keys swap together.

## State parity checks

- Three layers, all type `image`.
- All three have `animationOrder = 1` (same value).
- Playback drives them concurrently.

## Notes

- The slot system swaps ~60 state keys per slot; the adapter does not model
  the slot mechanics, only the `animationOrder` value that selects the slot.
- Slot mechanics are an internal legacy concern (KQ-005); the typed contract
  exposes only the order number.