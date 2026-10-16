# Quiet grooming detail

The existing daytime grooming painting now makes one small, slow lick while the
cat is visible. The original image remains in place. A feathered interior patch
uses the same PNG, moves by at most 0.9% of its width, and blends in and out over
4.6 seconds. Feet, silhouette, placement, scale and care playback are untouched.

The first movement waits 35–75 seconds; subsequent movements wait 2–4 minutes.
Each resident has an independent deterministic delay. Leaving the viewport,
backgrounding, unresolved cat state, feeding or reduced motion cancels the
movement and prevents catch-up. No preference, clock or application data is saved.

## Existing behavior audited

All 16 breeds use the existing assets: calico, orange, brown, silver, black,
white, tuxedo, gray, manul, sand, black-footed, fishing, snow-leopard, leopard,
cheetah and jaguar. The breed IDs and assets are unchanged.

| Time / location | Existing behavior retained |
| --- | --- |
| 06:00–18:00 JST, room | Relax, play, groom, doze, window gaze; equal weights |
| 06:00–18:00 JST, garden | Relax/play/groom/doze weights 1/4/4/1 |
| 06:00–18:00 JST, engawa | Relax/groom/doze weights 4/1/5 |
| Daytime schedules | Places 30–120 minutes, moods 10–30 minutes; season/weather preferences |
| 18:00–06:00 JST, own awake cat | Seated, curl, stretch, window; existing 15-minute slots |
| Sleeping / morning / care | Existing sleeping image, begging and meal/treat animation |

Grooming and stretching poses already exist, and a yawn expression already
exists. This adds the previously absent local lick movement without adding
duplicate poses or replacing images. Nighttime and other daytime poses stay as
they were.

## Verification

`test-cat-idle-motion.cjs` runs Windows WebKit and installed Edge at
320/375/390/430 CSS pixels. It checks all 16 breeds at all three locations,
compares painted pixels, and checks the original image identity, fixed geometry,
unchanged feet and return to the original painting. Matrix fixtures suppress
background painting to isolate mouth pixels; the initial scene and separate
solar/background regression tests use normal backgrounds. Lifecycle checks
cover reduced motion, feeding, hidden/offscreen and unresolved state.

Existing size, location, solar transition, guide, care, posting and timeline tests
are also run. Public tests use isolated API fixtures and make no production DB
writes. Physical iPhone testing is not performed.

Long tests support `--width=390` (and the other requested widths). Motion,
location and care tests checkpoint successful cases. An interrupted run can
continue without discarding successful checks. The resumed run retains the
earlier successful WebKit widths from captured logs and post-assertion image
artifacts; `output/cat-idle-motion/resume-evidence.json` records that provenance.

The implementation is isolated in `cat-idle-motion.js` and
`cat-idle-motion.css`, with two resource inclusions and static server routes.
No original cat/background/care/application/storage/database sources change.
Work is based on origin/main in a separate worktree, preserving the three prior
worktrees and their Git indexes.
