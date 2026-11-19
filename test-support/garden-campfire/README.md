# Garden campfire

The fire sits at (270,311) in the existing 400×330 garden, in front of the
cat's support rock and left of the shishi-odoshi. It does not change any existing
object geometry, cat pose, controls, or background filter bounds. The overlay
ignores pointer events. One 192×77 alpha WebP (7,968 bytes) supplies thick logs,
endgrain, charcoal, stones and material detail; separate rear/front copies use
an occlusion clip so flames grow between logs. Contact shadow and continuous
day/night tint ground the object. Small local light gradients tint the ground
and nearby rock edge at night. The four seasonal backgrounds remain intact.

Four flame layers and one light pulse use staggered long Web Animations with
bounded irregular keyframes. They pause when hidden/out of view, cancel on scene
removal, and respect reduced motion. No frame-by-frame JavaScript runs.

The sound is original procedural wood crackle, with no downloaded recording or
new audio asset/license. Each fresh 48-second mono 16kHz segment contains colored
noise, irregular small grains, soft attacks and bounded peaks. Adjacent segments
overlap for 2.5 seconds with equal-power envelopes. There is no audio-source loop
and at most two segments are retained. OFF and navigation fade/stop sources;
hidden pages and global mute stop the scheduler and sources immediately.

The individual fire toggle defaults OFF and is saved separately. Fire sound uses
the existing NatureSounds AudioContext, master volume and mute. It requires the
nature-sound switch ON, nonzero volume and a visible garden, after a trusted user
gesture. It adds no AudioContext and does not change clock, shishi or piano
preferences. The existing nature/piano roof attenuation is preserved.

Generated image method, complete prompt and source hash:
`assets/garden-campfire-v1/provenance.json` (built-in image_gen, genuine alpha).
The generated source PNG remains in the private build output; only the small
WebP and provenance ship in the repository.

Run `node test-garden-campfire.cjs` for bounded PCM, independent segments,
three simulated minutes of joins, duplicate-start prevention and stop/restart.
Run `node test-support/garden-campfire/verify.cjs` for four seasons × day/night
at 375/390px, original cat/shishi geometry, existing controls, individual toggle,
shared volume/mute, shishi coexistence, scene changes, reduced motion and hidden
pause. Edge checks native PCM/playback including a real 48-second join. Windows
WebKit lacks Web Audio, so its audio controls use an explicit adapter; its actual
rendering and animation remain native. No physical iPhone or human listening
test was performed. Results are in `verification.json`; screenshots are private
under `output/garden-campfire`.
