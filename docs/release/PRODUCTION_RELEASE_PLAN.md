# Void Motion production release plan

## Release target

- Candidate: `v1.0.0-rc.1` on a Vercel Preview deployment.
- Stable: `v1.0.0` after the candidate passes every release gate below.
- Scope: React editor, migrated information pages, i18n, local project storage, legacy animation runtime, and browser-side video export.
- Rollback unit: the previous known-good Vercel deployment.

## Release prerequisites

1. **Resolved — package the animation runtime.** The build plugin copies the isolated runtime into `dist/legacy`, and `pnpm verify:production` fails when required runtime or SEO files are missing.
2. **Resolved — configure SPA routes on Vercel.** `vercel.json` rewrites direct visits for `/tutorial`, `/docs`, `/about`, and `/privacy` while leaving `/legacy/*` files directly addressable.
3. **Resolved — add production browser coverage.** Playwright verifies editor boot, the same-origin runtime frame, compact dock access, React information routes, SEO endpoints, and public GitHub links.
4. **Resolved — define asset caching.** Fingerprinted Vite assets and stable runtime hand images receive immutable cache headers; runtime HTML explicitly revalidates.
5. **Resolved — make CI deterministic.** The lockfile, pnpm, Node, Playwright, Vercel CLI, production artifact verification, and blue/green promotion flow are pinned in GitHub Actions.

## Release gates

### Gate 1 — repository and artifact readiness

- Freeze release scope and move unrelated work to the next milestone.
- Update package version, changelog, README repository links, privacy/contact links, and release notes.
- Ensure all user-facing source/support links point to:
  - `https://github.com/voidstation-dev/void-motion`
  - `https://github.com/voidstation-dev/void-motion/issues`
- Build from a clean checkout using the committed lockfile.
- Confirm `dist/legacy/index.html` and every referenced runtime asset exist.

### Gate 2 — automated quality checks

Run in CI and require all commands to pass:

```bash
pnpm install --frozen-lockfile
pnpm i18n:check
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm build
pnpm test:e2e
```

Add/retain regression coverage for:

- Progress is compositor-paced, monotonic within a playback run, and stable across zigzag direction changes, sequential groups, and parallel layers.
- Restart is the only permitted progress reset from `1` to `0`.
- Repository/support URLs and React information routes never fall back to a user-facing legacy page.
- Missing translation keys fail CI for every supported locale.

### Gate 3 — Vercel Preview acceptance

Deploy `v1.0.0-rc.1` to Vercel Preview and verify these URLs directly and after refresh:

- `/`
- `/tutorial`
- `/about`
- `/privacy`
- `/legacy/index.html?migration-runtime=1`

Run the following workflows on Chromium, Firefox, and WebKit where supported:

- Create, rename, switch, persist, and delete projects.
- Upload PNG/JPG/GIF/SVG/WEBP; add and edit text.
- Add, reorder, group, hide, resize, crop, and slice layers.
- Generate every animation and drawing mode; play, pause, restart, and seek.
- Verify Scanner zigzag progress has zero backward steps while playing.
- Switch language, reload, and confirm locale persistence and translated editor/info pages.
- Export WebM and MP4 where the browser supports the required codec APIs; verify duration, dimensions, playback, and downloaded filename.
- Confirm repository and support links open the expected GitHub destinations in a new tab.

### Gate 4 — responsive, accessibility, and performance QA

Viewport matrix:

- Mobile: 360×800 and 390×844.
- Tablet: 768×1024 and 1024×768.
- Desktop: 1280×720, 1440×900, and 1920×1080.

Acceptance criteria:

- No overlap between canvas tools, animation badge, transport, bottom controls, or side panels.
- All dialogs/sheets remain keyboard reachable and closable; focus returns to the opener.
- No horizontal page overflow, clipped primary actions, or inaccessible hidden navigation.
- Browser console has no uncaught errors or failed same-origin runtime requests.
- Progress measurement during playback: zero backward steps, updates at frame cadence when the browser is active, and no React tree-wide render on each frame.
- Capture production bundle sizes and Lighthouse/Web Vitals as a baseline; investigate any severe regression before promotion.

### Gate 5 — production promotion

- Record the approved Preview deployment ID, commit SHA, test report, bundle sizes, and known limitations.
- Tag `v1.0.0`, publish release notes, and promote the exact approved Preview artifact to Production.
- Smoke-test `/`, one direct React route, the legacy runtime URL, one image animation, one persisted project reload, and one supported export.
- Keep the prior production deployment available for immediate rollback.

## Go / no-go checklist

Release only when every item is true:

- [ ] Runtime assets are present in the production artifact.
- [ ] All CI checks and cross-browser critical flows pass.
- [ ] Direct-route refreshes work on Vercel.
- [ ] No data-loss issue exists in IndexedDB project persistence.
- [ ] Playback progress is smooth and monotonic.
- [ ] Exported videos pass manual playback verification.
- [ ] Vietnamese and English have no missing or visibly overflowing critical strings.
- [ ] Privacy, repository, support, and license information are current.
- [ ] A named rollback deployment and rollback owner are recorded.

Any unchecked item is a no-go for stable production. It may remain documented for an RC only when it cannot cause data loss, broken core workflows, or misleading output.

## Rollout and monitoring

- Start with the RC Preview URL and a small internal test group.
- After promotion, check error logs and user-reported issues at 1 hour, 24 hours, and 7 days.
- Track runtime load failures, project persistence failures, export failures by browser, animation generation exceptions, and unusually large asset transfer.
- Roll back immediately for project data loss, editor boot failure, missing runtime assets, or broken export across a previously supported browser.

## Post-release follow-up

- Triage GitHub issues using severity and browser/version labels.
- Convert accepted known limitations into scheduled issues.
- Use the production measurements as the baseline for the next bundle, runtime-migration, and performance milestones.
