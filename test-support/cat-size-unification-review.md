# Cat visible size review

Baseline: `origin/main` at `7fe1996fff747d0e2e7899cae6509f5b95219a5a`.

The supplied smaller screenshot matches `fishing/day-groom` at the indoor corner's existing 35% width and 90% scale. Its visible height is about 95.62 CSS px in a 331 px scene (375 px viewport). Use that silhouette's longest side as a common upper limit relative to scene width. Limit both height and width so reclining or wide cats cannot exceed it; never enlarge cats already below the limit. Compact profile scenes keep their smaller scene scale.

The original 256 alpha measurements exclude transparent margins and include rotated/flipped night gestures plus every meal expression. Apply a uniform scale around each silhouette's visible horizontal centre and foot contact. Share the calculation between home, the meal/treat screens and another person's profile. Apply the limit separately to meal cats and the composite body/head, leaving the dish and motion timing unchanged.

Only `indoor-cat-scale.js`, its call arguments in `day-room.js`, and the final scaling rules in `day-room.css` change behavior. Background v2, original cat images, scene placement, schedules, image decoding, save/post/API code and database files remain unchanged. Earlier sunlight/shadow study files are not included.

Verification:

```text
node test-room-cat-scale.cjs [--edge] [--published]
node test-cat-meal-motion.cjs [--edge] [--published]
node test-cat-places-browser.cjs [--edge] [--published]
```

`test-room-cat-scale.cjs` independently rasterizes full-resolution alpha in each browser. It covers 1,984 breed/pose/place/width cases plus 1,344 meal-expression/composite cases per engine at 320/375/390/430 px. Compare the old indoor .9 / outdoor 1 geometry against the limit, check that smaller silhouettes stay unchanged, preserve aspect and visible feet/centres, reject clipping, and require identical dish geometry. Reference and engawa before/after screenshots are saved at 375 px.

Live meal tests sample the entire six-second lifecycle, require exactly one loaded cat on every sampled frame, measure head movement and stationary bodies, and compare painted screenshots. Test browser and emulated standalone modes with normal and reduced motion, daytime/nighttime and all four widths. Other suites exercise home/profile agreement, meal/treat save flows in three places, scene movement, reloads, sleep/night boundaries, background crossfades, home posts, timeline synchronization and image loading. API traffic is replaced with fixtures: no production database writes.

Windows WebKit and Microsoft Edge are the tested engines. Physical iPhone hardware is **not tested**; standalone mode is emulated.

Verified release `b4f2c4c17f4c0405`: all 22 local reports passed. Across both engines, the 64 complete live meal cases recorded 15,351 frames with one loaded cat, at least 6,000 ms of visible playback and at least 1.74 CSS px of head travel. Independent visible-foot measurements differed by less than 0.095 CSS px before/after shrinking. Each engine also passed 192 home/visitor-profile pairs, 576 seasonal/weather backgrounds, 256 night scenes, 320 posting-state checks and 40 cold-loading/browser/standalone scenarios. Original pending workspace files matched their initial SHA256 hashes.

Release artifacts and result reports remain under the ignored `output/` directory. Verify the public release marker, all versioned resources, browser size checks and real playback after deployment.
