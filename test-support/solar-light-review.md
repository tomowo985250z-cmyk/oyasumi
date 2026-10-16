# Solar lighting integration

Continue the approved solar study on top of `f786165df39d73aa2a241ce2b23bd28b616979eb`, preserving both previously published cat sizing changes. The original dirty checkout remains separate and is checked against the pre-integration SHA256 snapshot in `output/solar-light-release/baseline-lock.json`.

The JST/Tokyo reference solar model computes the sun's altitude, azimuth and seasonal sunrise/sunset. One light vector drives the illustrated sun, window light, structure shadows and alpha silhouettes of the existing cat artwork. Morning/evening shadows point in opposite directions; noon shadows shorten. Cloud and rain soften and suppress direct light. Night reuses the existing illustrated moon trajectory and illumination. No geolocation, new images or database changes.

Blend palette weights continuously, update the mounted scenery each minute and fade backgrounds and shadows over 1,600 ms. Preserve the decoded resident node during lighting updates. Clip shadows to the supporting floor or sill. Observe changes in the active feeding phase so lighting uses the existing feeding cat. Reduced motion and hidden documents skip fades; stale background requests cannot replace the newest scene.

Preserve the current cat image selection, body geometry, location schedule, six-second visible meal playback, post/API behavior and 06:00/18:00 activity boundaries. The scene is an artistic 2.5D projection with bounded shadow lengths, not a geographical 3D simulation.

Validation:

- `node test-solar-model.cjs`: 5,760 minute samples; seasonal daylight, finite shadows, opposite morning/evening direction, shorter noon shadows, weather and continuous palette weights.
- `node test-solar-lighting.cjs [--edge] [--published]`: 576 seasonal/time/weather/location scenes and 768 unchanged cat comparisons per engine across 320/375/390/430 px. Save 375 px comparison boards, check shadow/light direction, image decode, errors and external traffic.
- `node test-solar-transitions.cjs [--edge] [--published]`: mounted minute updates, identical resident nodes, 1,600 ms light/shadow fades, cleanup, newest-request wins, reduced motion and hidden documents at four widths.
- Existing scale, complete meal playback, cold pose decode continuity, three-place, painted background transition, home post choice, meal control, night cat, two-user timeline and loading suites for both engines. Browser API traffic is mocked; production DB writes remain zero.
- `node test-support/verify-solar-release.cjs`: require all fresh reports, release/syntax/model checks, unchanged original pending files and unchanged cat/background assets and DB sources. Run before committing.
- After push, `node test-support/verify-solar-deployment.cjs` checks the normal public HTML, release marker and every versioned resource hash. Run solar, transition, meal and home post browser checks against the published release with mocked APIs.

Artifacts remain local under `output/solar-light-release/` and the existing regression directories. Physical iPhone hardware is not tested; Windows WebKit and Edge do not establish physical iPhone behavior.

The night regression's former empty-style assertion now excludes exactly the three ambient light variables while still comparing all geometry properties. Its completed 256-case matrix can be checkpointed in `matrix.json` and reused with `--interactions-only` for the same release. Edge's first full matrix passed before the old style assertion stopped its boundary checks; those checks resume from that recorded run. WebKit completes the matrix and interactions together.
