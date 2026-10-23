# Approved engawa clouds

Adopts output/engawa-cloud-study-v1/clouds.js and the approved 512x512 cloud-atlas.webp without changes to its pixels or visual parameters. Atlas SHA256: 4520be7164e53700360ac6ce12a7f39db9360a200041817a1bc3afbdd4c42e3e.

The existing clock, lazy low-priority decode, morning/day/evening tones and cloud layout are retained. Night rendering is bypassed exactly as in the approved study. No new timers or loading gates.

The old cloud material and rendering code remain in place. Add ?clouds=existing to restore the former clouds. Revert this adoption commit to restore the previous default. Previous production commit: 09885599637115f25bdfc8c6a4591a7efe54940d.
