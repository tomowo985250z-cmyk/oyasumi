# Optional first-use introduction

Baseline: published `origin/main` at `44ae59a8f2f5c09d8087a8c83c5bbc9ab65bffda` (solar release `e27abe4ac6b774b8`). Work is isolated in `output/first-use-guide-release`; the original dirty main checkout and previous solar release worktree retain their files and Git indexes.

First-time visitors see a small inline invitation below the cat scene. Only an explicit click opens three short topics: how the cat spends time, everyone's records, and reporting bedtime. Skip and close remember a device-local choice. Settings always offers “使い方の案内”, including for returning visitors and when browser storage is blocked or full. There is no automatic dialog, focus trap, scroll, report, meal or API call. Explicit open moves focus to the introduction title without scrolling; close returns focus to the settings entry or home heading. Escape closes an introduction only when focus is inside it.

Read first-use eligibility before the existing app initializes device defaults. Keep the old app/legacy keys and their persistence semantics. The sole new value is `oyasumi-first-guide-v1=seen`, written only after an explicit guide action. Opening a guide updates its own slot and keeps the current cat node and post data intact. Existing palette variables, typography, rounded panels and 44 px controls are reused. The content remains in normal document flow; navigation stays available.

The app integration adds only a home slot and a settings slot. All sixteen cat types, three locations, cat scale/assets, backgrounds, sun/shadow projection, feeding, post handlers, API and database sources remain unchanged. The three-place test now captures the scene with a locator that waits for visibility, avoiding a null bounding box during an asynchronous refresh. The home-post test retries a screenshot only when a refresh detaches its target, with a limit of three attempts. Their behavioral assertions remain intact.

Validation on Windows WebKit and Microsoft Edge at 320/375/390/430 CSS px:

- `test-first-use-guide.cjs [--edge] [--published]`: first-time invitation, explicit open, three topics, both themes, width/overflow, 44 px controls, navigation, unchanged cat node and post state, skip/close/Escape, persisted reload and settings replay. Exercise returning/legacy visitors and read-only/blocked local storage. No production API traffic.
- Existing three-place suite: 192 all-breed home/profile pairs per engine, reload/timezone stability, meal/treat saves, six visible seconds, day/night and background resume.
- Existing solar transitions at all four widths, focused live meal playback, home post choices and two-user timeline/save synchronization.
- Release/syntax checks and solar model; hash/index comparison of both pre-existing worktrees and a strict allowlist for this change.
- After push, verify the normal public HTML, release marker and every versioned resource. Run guide, solar transition, focused meal and home post checks against the published release with mocked APIs.

Reports and screenshots: `output/first-use-guide/` and the existing regression directories in this checkout. Physical iPhone hardware is not tested; no database changes or production DB writes are performed.
