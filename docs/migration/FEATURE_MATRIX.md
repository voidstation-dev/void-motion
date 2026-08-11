# Feature Matrix

Per MIGRATION_00 §19. A feature is not allowed to enter React migration (M01+)
until `Ready to migrate = ✅`. "Ready to migrate" means: behavior documented,
at least one golden fixture, at least one automated test, and the typed adapter
boundary can read/write the feature's state.

Legend: ✅ done · ⏳ partial · ❌ not started

| Feature | Legacy | Behavior documented | Fixture | Automated test | Ready to migrate |
|---|---:|---:|---:|---:|---:|
| Project create | ✅ | ✅ | — | ✅ | ✅ |
| Project rename | ✅ | ✅ | — | ⏳ | ⏳ |
| Project autosave | ✅ | ✅ | — | ⏳ | ⏳ |
| Project load | ✅ | ✅ | — | ⏳ | ⏳ |
| Project delete | ✅ | ✅ | — | ⏳ | ⏳ |
| Image upload | ✅ | ✅ | 01,02,03 | ✅ | ✅ |
| Image auto scale | ✅ | ✅ | 03 | ⏳ | ⏳ |
| Image transparency | ✅ | ✅ | 02 | ✅ | ✅ |
| Image resize | ✅ | ✅ | — | ✅ | ✅ |
| Image opacity | ✅ | ✅ | — | ⏳ | ⏳ |
| Image visibility | ✅ | ✅ | — | ⏳ | ⏳ |
| Layer rename | ✅ | ✅ | — | ⏳ | ⏳ |
| Layer delete | ✅ | ✅ | — | ⏳ | ⏳ |
| Layer reorder | ✅ | ✅ | — | ✅ | ✅ |
| Text create | ✅ | ✅ | 04 | ✅ | ✅ |
| Text edit | ✅ | ✅ | 04 | ⏳ | ⏳ |
| Text font | ✅ | ✅ | 04 | ✅ | ✅ |
| Text size | ✅ | ✅ | 04 | ✅ | ✅ |
| Text bold/italic | ✅ | ✅ | 04 | ✅ | ✅ |
| Text alignment | ✅ | ✅ | 04 | ✅ | ✅ |
| Text color | ✅ | ✅ | 04 | ✅ | ✅ |
| Animation order (numbered) | ✅ | ✅ | 05 | ✅ | ✅ |
| Animation order (blank) | ✅ | ✅ | 05 | ⏳ | ⏳ |
| Animation order (parallel) | ✅ | ✅ | 06 | ⏳ | ⏳ |
| Canvas resolution | ✅ | ✅ | — | ✅ | ✅ |
| Canvas aspect ratio | ✅ | ✅ | — | ✅ | ✅ |
| Canvas background | ✅ | ✅ | — | ✅ | ✅ |
| Crop | ✅ | ✅ | 07 | ⏳ | ⏳ |
| Slicer grid | ✅ | ✅ | 08 | ⏳ | ⏳ |
| Slicer rectangle | ✅ | ✅ | 09 | ⏳ | ⏳ |
| Slicer freehand | ✅ | ✅ | 10 | ⏳ | ⏳ |
| Chunk jump | ✅ | ✅ | 05 | ✅ | ✅ |
| Scanner | ✅ | ✅ | 11 | ⏳ | ⏳ |
| Contour | ✅ | ✅ | 12 | ⏳ | ⏳ |
| Outline chunks | ✅ | ✅ | 13 | ⏳ | ⏳ |
| Specialized modes | ✅ | ✅ | 15 | ⏳ | ⏳ |
| Outline fill | ✅ | ✅ | 13 | ✅ | ✅ |
| Illust fill | ✅ | ✅ | 14 | ⏳ | ⏳ |
| Outline only | ✅ | ✅ | 13 | ⏳ | ⏳ |
| Text draw | ✅ | ✅ | 04 | ⏳ | ⏳ |
| Hand styles | ✅ | ✅ | — | ✅ | ✅ |
| Draw direction | ✅ | ✅ | — | ✅ | ✅ |
| Stroke style | ✅ | ✅ | — | ✅ | ✅ |
| Detection algorithm | ✅ | ✅ | — | ✅ | ✅ |
| Coloring style | ✅ | ✅ | — | ✅ | ✅ |
| Playback play/pause | ✅ | ✅ | — | ⏳ | ⏳ |
| Playback speed | ✅ | ✅ | — | ⏳ | ⏳ |
| Export WebM | ✅ | ✅ | — | ⏳ | ⏳ |
| Export MP4 | ✅ | ✅ | — | ⏳ | ⏳ |
| Export PNG | ✅ | ✅ | — | ⏳ | ⏳ |
| Undo/redo | ✅ | ✅ | — | ⏳ | ⏳ |
| Presets | ✅ | ✅ | — | ⏳ | ⏳ |

## Notes

- "Legacy = ✅" means the feature exists and works in the preserved `legacy/` reference app.
- "Behavior documented = ✅" means the feature is described in `BEHAVIOR_LOCK.md`.
- "Fixture = ✅" means at least one golden fixture exercises it (number in column).
- "Automated test = ✅" means a Vitest behavior test asserts the typed contract.
- "Ready to migrate = ✅" requires all four prior columns green for that row.
- The ⏳ entries are intentionally deferred to later migrations (M01+) where the feature is actually rewritten — M00 only locks behavior and types, it does not build every test. The adapter round-trip tests (✅) cover the cross-cutting contract.