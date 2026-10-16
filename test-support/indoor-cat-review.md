# Indoor cat scale and playback review

Baseline: `origin/main` at `f2aed746d0bc23ec6e8d2b12e40d93138866345a`.
The published renderer had the original indoor sizes; the earlier pending scale work was not on main.

- Apply an exact 0.9 scale to indoor cat artwork, including daytime actions, sleep, seated and rotated night gestures. Garden and engawa retain their original scale.
- Generate alpha silhouette contacts from 256 original images, including all feeding expression variants. Scale around the visible horizontal centre and feet, preserving aspect, cushion/window/floor contact and the original artwork.
- Scale the feeding cat separately from its bowl. Keep the original six visible seconds, head movement, phases, reduced motion, pause/resume and confirmed-save behavior.
- A cold next-pose image reproduced a missing-cat frame on the baseline. Decode the next cat before changing its artwork and placement together; reject obsolete requests. Reuse image nodes in the active document rather than transferring them through a template's inert document.
- Keep the published countryside backgrounds, their 1.6-second crossfade, moon lighting, location scheduling, posting/API code and all PNG/SVG artwork unchanged. No database changes.

Verification commands (set `OYASUMI_PLAYWRIGHT_PATH` if Playwright is installed outside the checkout):

```text
node test-support/build-indoor-cat-scale.cjs --check
node test-room-cat-scale.cjs [--edge] [--published]
node test-room-cat-continuity.cjs [--edge]
node test-cat-meal-motion.cjs [--edge] [--published]
```

`test-room-cat-scale.cjs` independently measures alpha pixels in the browser, including rotation/flip, rather than comparing only image boxes. It covers 1,216 breed/pose/location/width combinations per engine at 320/375/390/430 px, checking exact indoor 90%, unchanged outdoors, fixed feet, aspect and unclipped silhouettes.

`test-room-cat-continuity.cjs` delays uncached next-pose responses and records real animation frames at all four widths. The current cat and contact remain until the new image is ready; stale requests cannot restore an older pose.

`test-cat-meal-motion.cjs` uses real elapsed time and live screenshots. The complete matrix covers 32 width/day/night/browser/standalone/motion combinations per engine and all 16 breeds. It samples the entire preparation → plate → munch → joy → resident lifetime, counts the head/body composition as one cat, rejects unloaded or duplicate visible cats, checks stationary bodies and vertically moving heads, and compares painted pixels. Standalone is emulated. Windows WebKit uses DPR 1; Edge uses DPR 3.

Also run the existing background/paint, three-place, home post choices, home cat care, night cat, moon, loading and two-user timeline synchronization suites for both engines, plus the clock/sleep/asset/scheduling unit checks. Browser API traffic is isolated from production data.

The complete home-care display loops passed all 64 breed/width combinations and three meal stages in each engine. The subsequent 06:00 assertion initially expected an immediate image swap. After adding decode-settlement waits, boundary and interaction checks were rerun with `--interactions-only`; the already-passed display loops were not repeated.

Physical iPhone hardware is **not tested**. Windows WebKit and Edge results do not establish physical iPhone behavior.

Local release `c60f7dd8f8019221` passed 24 report checks across both engines. Each engine measured 1,216 actual silhouettes and checked 576 background scenes. The 64 complete live meal cases recorded 15,585 frames with one loaded cat in every sampled frame, visible playback of at least 6,000 ms, stationary bodies and at least 1.95 CSS px of head travel. Head screenshot differences were nonzero in every case. Independently rasterized foot contact differed by less than 0.06 CSS px, including rotated night images.

Local artifacts: `output/room-cat-scale/`, `output/indoor-cat-review/`, `output/cat-meal-motion/` and the existing regression report directories. Verify the public HTML, release marker and every versioned resource after deployment, then run browser checks against the published release with mocked API traffic.
