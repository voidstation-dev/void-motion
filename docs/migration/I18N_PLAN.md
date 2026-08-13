# Void Motion i18n plan

## Implementation status (2026-08-14)

The first production rollout is implemented:

- English and Vietnamese have complete, structurally matched resources across 9 namespaces.
- The editor, Crop, Slicer, Text, Export, projects, accessibility labels, Tutorial, About, and Privacy are localized.
- Locale detection, `?lang=` QA override, browser fallback, local persistence, English fallback, and document `lang`/`dir` synchronization are active.
- Core editor resources load at startup; the longer `tutorial` and `info` namespaces are split into lazy chunks.
- `pnpm i18n:check` fails when locale files, keys, array structures, or value types diverge.
- Runtime tests cover switching, persistence, fallback, route namespaces, and locale-aware formatting.

The later locale rollout and RTL phase below remain the expansion roadmap; adding a locale now only requires a structurally complete resource directory and a new entry in `SUPPORTED_LOCALES` plus the switcher label.

## Goal

Make the editor, tutorial, About, Privacy, validation messages, export flow, and accessibility labels available in Vietnamese and English first, while keeping the translation system ready for additional locales and right-to-left layouts.

## Recommended locale rollout

1. **Foundation:** `en` (source locale) and `vi` (first complete translation).
2. **High-reach Latin locales:** `es`, `pt-BR`, `fr`, `de`.
3. **East Asian locales:** `ja`, `ko`, `zh-CN`, with typography and line-breaking QA.
4. **RTL readiness:** `ar`, only after directional layout, icon mirroring, and mixed-number testing pass.

## Architecture

- Use `i18next`, `react-i18next`, and `i18next-browser-languagedetector`.
- Store messages by domain instead of by component:
  - `common`
  - `editor`
  - `layers`
  - `animation`
  - `drawing`
  - `projects`
  - `export`
  - `tutorial`
  - `legal`
  - `errors`
- Keep English keys explicit and stable, for example `export.recording.success`, rather than using English sentences as keys.
- Load editor namespaces eagerly; lazy-load long tutorial/legal translations by route.
- Locale resolution order: explicit user preference → URL/query override for QA → browser language → English fallback.
- Persist the selected locale in local storage. Do not mix it into project documents.
- Set `<html lang>` and `<html dir>` whenever the locale changes.

## Implementation phases

### Phase 1 — Inventory and foundation

- Add the i18n dependencies and `src/i18n/` configuration.
- Add a development-only missing-key reporter.
- Extract every visible string, toast, dialog, aria-label, empty state, and validation message.
- Add a locale switcher to the header overflow menu and information-page header.
- Define formatting helpers for percentages, file sizes, dates, times, and project timestamps using `Intl`.

Exit criteria:

- No hard-coded user-facing English remains in `src/app` outside translation resources.
- English UI matches current behavior.
- Missing translation keys fail CI.

### Phase 2 — Vietnamese

- Translate all editor namespaces and the full tutorial/legal content into natural Vietnamese.
- Use product-consistent terminology: layer = “lớp”, canvas = “khung vẽ”, reveal = “hiện nét”, export = “xuất video”; maintain a glossary before translation review.
- Review text expansion in header, settings, sheets, dialogs, bottom controls, and export status.
- Add Vietnamese search keywords/metadata for documentation pages.

Exit criteria:

- 100% key coverage for `vi`.
- Desktop, tablet, and mobile visual QA pass.
- A Vietnamese-speaking reviewer approves terminology and tone.

### Phase 3 — Additional locales

- Add locale packs in priority order based on usage analytics or community demand.
- Require native review for tutorial/legal pages; machine translation may only be used as a draft.
- Add locale-specific font fallbacks without blocking editor startup.

### Phase 4 — RTL and localization hardening

- Replace remaining physical CSS directions (`left`, `right`) with logical properties where relevant.
- Mirror directional controls only when meaning changes; do not mirror play, download, or media icons.
- Test mixed Latin/Arabic project names, numeric inputs, shortcuts, file names, and canvas labels.
- Add pseudo-locales: accented English and 35% expanded text for overflow detection.

## Quality gates

- Unit tests for fallback, locale persistence, pluralization, and number/date formatting.
- Route tests for localized Tutorial, About, and Privacy pages.
- Screenshot coverage at 390×844, 768×1024, 1024×768, 1440×900, and 1920×1080 for `en` and `vi`.
- Keyboard and screen-reader checks in every locale.
- CI checks for missing, unused, and invalid interpolation keys.
- Translation resources must not contain HTML from the old legacy pages; rich documentation blocks should remain React components with translated text data.

## Suggested delivery slices

| Slice | Scope | Estimate |
| --- | --- | --- |
| I18N-01 | Infrastructure, extraction, English resources | 2–3 days |
| I18N-02 | Vietnamese editor and dialogs | 2 days |
| I18N-03 | Vietnamese tutorial/legal pages | 1–2 days |
| I18N-04 | Locale switcher, formatting, persistence | 1 day |
| I18N-05 | Responsive/accessibility QA and CI gates | 1–2 days |
| I18N-06 | Each additional reviewed Latin locale | 1–2 days |
| I18N-07 | RTL foundation and first Arabic release | 3–5 days |
