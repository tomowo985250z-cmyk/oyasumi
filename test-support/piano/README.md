# Five-song piano migration

The existing five Public Domain score inputs are retained in `source-scores.json`.
`build.cjs --check` verifies the original piano voicings. Highest notes of the
existing first voice retain their exact pitches and ordered onsets; inner voices
are octave-spaced, bass is brought to MIDI 45–57, and simultaneous duplicates
become one piano key. No external performance or arrangement was copied.

`assets/piano-v1/credits.html`, `LICENSE.txt`, `SOURCE-README.txt` and the catalog
carry Alexander Holm's Salamander Grand Piano credit, CC BY 3.0 links, sample
source URLs/hashes and a changes notice. Tone.js distributes the selected MP3
single notes. Samples and derived performances are CC BY 3.0; the app's license
does not change.

`piano-player.js` decodes the bank once and uses a worker for 24kHz mono sampled
rendering. Only the current and upcoming performances are kept by `roof-music.js`.
Each new song entry receives a fresh cryptographic seed; resuming keeps the same
take and exact position. A continuous common phrase time map, coherent attack
groups, at most 3ms group/1ms individual jitter, small hand/chord offsets, ±2.5%
note dynamics, ±3% filter color and ±6% release variation avoid pitch drift and
broken ornament rhythms. Phrase timing deviations stay below 80ms. Tuning is
fixed to the score's integer semitones. No compressor is used.

Each full take is statically normalized to -24 LUFS with a 0.70 sample-peak cap;
the existing -42 LUFS playback reference, volume preferences, master gain,
three-second song crossfades and nature-sound mixing are retained. Opening and
final safety fades prevent hard waveform edges. The root player API and stored
preference key remain compatible; the UI and credits now say piano.

Audio measurements and limitations are in `audio-verification.json`; browser
checks are in `browser-verification.json`; sizes are in `size.json`.
Run `npm run test:piano` for score, humanization, sequence and browser checks
(`OYASUMI_PLAYWRIGHT` and `OYASUMI_EDGE` can override the browser installation paths).
Windows WebKit lacks Web Audio: native sample decoding/rendered playback is
checked in Edge; WebKit widths 375/390 test actual layout, worker operation and
the playback control contract using an AudioContext adapter. These are not
physical iPhone measurements or human listening tests.
