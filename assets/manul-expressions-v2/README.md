# Manul expression edits

Generated with the built-in imagegen tool from `assets/wild-cats/manul-faces-calm.png`.
The reference PNG and its rendering remain unchanged (restored in `9bcb078`,
original image blob from `28bdb72`; checked against history before `b59cf4a`).
Only the five non-calm face mappings use these assets. All other artwork remains intact.

Shared prompt: Edit the original calm Pallas cat avatar, changing only eyes,
eyelids and mouth. Preserve pointed shaggy fur, broad flattened face, low rounded
ears, forehead spots, cheek stripes, gray/taupe/cream palette, illustration style,
position and scale. Preserve the peach disk, cream and navy rings as a perfect
circle, with transparent exterior. No body, text, objects or panels.

Expression prompts:
- happy: gently smiling mouth and softly smiling closed eyes.
- sleepy: nearly closed heavy eyelids and relaxed closed mouth.
- yawn: eyes squeezed shut and mouth open in a sleepy yawn.
- restless: slightly anxious sideways glancing eyes, subtly uneasy mouth.
- surprised: wide open round golden eyes and small surprised open mouth.

Validation: 270 actual app screen cases (nine screens, six expressions,
320/375/390/430/1280 px), image loading, circular avatar clipping and no horizontal
overflow. Existing 208 refresh and 16 rear-view PNG hashes checked unchanged.
Local inspection artifacts are in `output/manul-expressions-v2/`.
