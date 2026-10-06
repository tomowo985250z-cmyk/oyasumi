# Rooftop cats

The current scene uses `storybook-upright.png`, `storybook-relaxed.png`, and
`storybook-rounded.png`. These new soft watercolor/gouache rear-view templates
were generated with the built-in imagegen tool, using the preceding rear-view
poses as edit targets and `calico-faces-calm.png` as a style reference only.
Existing app cat artwork was not modified. Production images preserve alpha
and are scaled to 256 × 384. The user coat colors and patterns remain applied
by `roof-cats.js`. Cat size is now 68 × 102 (previously 48 × 72), about 1.42×.

## Storybook generation prompts

### storybook-upright

Use case: precise-object-edit. Image 1 is the rear-view cat edit target. Image 2 is ONLY the app's existing soft storybook art style reference; do not edit Image 2. Redraw Image 1 in a SOFT CHILDREN'S PICTURE-BOOK ILLUSTRATION style matching Image 2: simple rounded shapes, soft watercolor/gouache fills, subtly textured broad brushwork, muted gentle outlines. NOT semi-realistic, NOT photographic, NO detailed individual hairs, NO pencil hatching. Keep a naturally feline body: modest head size, relaxed shoulder curve, gently tapered waist, round seated haunches and a graceful natural tail. Exactly ONE seated cat viewed strictly from behind, looking upward, NO eyes or face. WHITE/NEUTRAL GRAYSCALE fur and shading only, no colored patches/stripes; actual user's coat colors/patterns will be composited in the app. Full body, ears and tail fully visible within a centered portrait 2:3 frame; ear tops around 9% height and haunches/tail rest on a common baseline around 93% height. This must read warmly and clearly at 100px tall. Truly transparent alpha background, NO external glow/shadow, NO roof, sky, circle/badge, moon, stars, text or scenery. Average-size cat with a gently upright back, head turned slightly up and LEFT, tail softly curled to the RIGHT. A calm, friendly back silhouette.

### storybook-relaxed

Use case: precise-object-edit. Image 1 is the rear-view cat edit target. Image 2 is ONLY the app's existing soft storybook art style reference; do not edit Image 2. Redraw Image 1 in a SOFT CHILDREN'S PICTURE-BOOK ILLUSTRATION style matching Image 2: simple rounded shapes, soft watercolor/gouache fills, subtly textured broad brushwork, muted gentle outlines. NOT semi-realistic, NOT photographic, NO detailed individual hairs, NO pencil hatching. Keep a naturally feline body: modest head size, relaxed shoulder curve, gently tapered waist, round seated haunches and a graceful natural tail. Exactly ONE seated cat viewed strictly from behind, looking upward, NO eyes or face. WHITE/NEUTRAL GRAYSCALE fur and shading only, no colored patches/stripes; actual user's coat colors/patterns will be composited in the app. Full body, ears and tail fully visible within a centered portrait 2:3 frame; ear tops around 9% height and haunches/tail rest on a common baseline around 93% height. This must read warmly and clearly at 100px tall. Truly transparent alpha background, NO external glow/shadow, NO roof, sky, circle/badge, moon, stars, text or scenery. Slightly smaller, relaxed cat with back leaning gently inward LEFT, head turned subtly up and RIGHT, asymmetric relaxed shoulders, tail curling around LEFT haunch. Different pose from the upright cat.

### storybook-rounded

Use case: precise-object-edit. Image 1 is the rear-view cat edit target. Image 2 is ONLY the app's existing soft storybook art style reference; do not edit Image 2. Redraw Image 1 in a SOFT CHILDREN'S PICTURE-BOOK ILLUSTRATION style matching Image 2: simple rounded shapes, soft watercolor/gouache fills, subtly textured broad brushwork, muted gentle outlines. NOT semi-realistic, NOT photographic, NO detailed individual hairs, NO pencil hatching. Keep a naturally feline body: modest head size, relaxed shoulder curve, gently tapered waist, round seated haunches and a graceful natural tail. Exactly ONE seated cat viewed strictly from behind, looking upward, NO eyes or face. WHITE/NEUTRAL GRAYSCALE fur and shading only, no colored patches/stripes; actual user's coat colors/patterns will be composited in the app. Full body, ears and tail fully visible within a centered portrait 2:3 frame; ear tops around 9% height and haunches/tail rest on a common baseline around 93% height. This must read warmly and clearly at 100px tall. Truly transparent alpha background, NO external glow/shadow, NO roof, sky, circle/badge, moon, stars, text or scenery. Slightly broader seated cat with gently rounded haunches and a small relaxed shoulder hunch, head tilted up a little LEFT, tail softly curved to the RIGHT. Natural proportions, not a chibi toy. Distinct from the other two.

## Previous assets and prompts


The previous semi-realistic scene used `rear-upright.png`, `rear-relaxed.png`, and
`rear-rounded.png`: three semi-realistic rear-view poses, generated separately
with the built-in imagegen tool using the original template as the edit target.
The production PNGs preserve transparency and are scaled to 256 × 384 pixels.
Each keeps subtle grayscale fur/shading so the existing user coat mask still
applies. The scene's 132 × 76 footprint and count layout are unchanged.

## Semi-realistic pose prompts

### rear-upright

Use case: precise-object-edit. Edit the supplied rear-view cat template ONLY for a Japanese bedtime app. A soft SEMI-REALISTIC hand-painted illustration, not a photograph, not chibi or cartoon. Natural feline anatomy: a smaller head relative to body, realistically sized triangular ears, narrower neck, defined shoulders and shoulder blades, a gently arched back tapering at the waist into seated haunches, natural slender tail. Very subtle fine fur and soft grayscale shading readable at 65px. Exactly ONE WHITE/NEUTRAL GRAYSCALE cat viewed from behind looking up into the night sky. No colored patches or stripes: the app adds users' coat colors via alpha mask. FULL BODY with tail and ears fully inside frame; matching portrait 2:3 frame with feet at roughly 93% height, cat top at 9% and subject horizontally centered. Truly transparent alpha background, clean cutout without shadow or glow outside silhouette. No roof, scenery, text, stars, badge, circle, eyes or face. Keep the gentle calm mood. Pose A: a lean average-size cat sits fairly upright, with neck and head subtly tilted up and 8 degrees LEFT. View remains strictly from the rear, no visible face. Shoulders relaxed, spine gently curved, tail resting to the RIGHT with a small natural curl.

### rear-relaxed

Use case: precise-object-edit. Edit the supplied rear-view cat template ONLY for a Japanese bedtime app. A soft SEMI-REALISTIC hand-painted illustration, not a photograph, not chibi or cartoon. Natural feline anatomy: a smaller head relative to body, realistically sized triangular ears, narrower neck, defined shoulders and shoulder blades, a gently arched back tapering at the waist into seated haunches, natural slender tail. Very subtle fine fur and soft grayscale shading readable at 65px. Exactly ONE WHITE/NEUTRAL GRAYSCALE cat viewed from behind looking up into the night sky. No colored patches or stripes: the app adds users' coat colors via alpha mask. FULL BODY with tail and ears fully inside frame; matching portrait 2:3 frame with feet at roughly 93% height, cat top at 9% and subject horizontally centered. Truly transparent alpha background, clean cutout without shadow or glow outside silhouette. No roof, scenery, text, stars, badge, circle, eyes or face. Keep the gentle calm mood. Pose B: a slightly smaller slender cat sits in a relaxed lower posture, back gently leaning inward to the LEFT and head turning up 12 degrees RIGHT while remaining a rear view, no visible face. One shoulder slightly lower than the other, natural tapered waist, tail relaxed around its LEFT haunch. Make this visibly different from an upright symmetrical cat.

### rear-rounded

Use case: precise-object-edit. Edit the supplied rear-view cat template ONLY for a Japanese bedtime app. A soft SEMI-REALISTIC hand-painted illustration, not a photograph, not chibi or cartoon. Natural feline anatomy: a smaller head relative to body, realistically sized triangular ears, narrower neck, defined shoulders and shoulder blades, a gently arched back tapering at the waist into seated haunches, natural slender tail. Very subtle fine fur and soft grayscale shading readable at 65px. Exactly ONE WHITE/NEUTRAL GRAYSCALE cat viewed from behind looking up into the night sky. No colored patches or stripes: the app adds users' coat colors via alpha mask. FULL BODY with tail and ears fully inside frame; matching portrait 2:3 frame with feet at roughly 93% height, cat top at 9% and subject horizontally centered. Truly transparent alpha background, clean cutout without shadow or glow outside silhouette. No roof, scenery, text, stars, badge, circle, eyes or face. Keep the gentle calm mood. Pose C: a slightly larger sturdy cat with natural rounded haunches (not fat or chibi), sits slightly hunched with relaxed asymmetric shoulders, head angled upward a little to the LEFT. Ears naturally unequal in perspective, no face visible. Tail curves beside the RIGHT hip, with tail tip extending gently forward. Natural anatomical proportions, visibly different from the slender upright cat.


`rear-template.png` is a new, transparent rear-view grayscale template generated
with the built-in imagegen tool. Existing cat artwork was neither used as an edit
target nor modified. `roof-cats.js` applies actual users' coat colors and patterns
through an alpha mask; the small roof silhouette is drawn in the home scene.
Missing coat information uses a neutral silhouette rather than an invented coat.

## Generation prompt

Use case: stylized-concept. Asset type: reusable transparent cat silhouette and grayscale shading template for a small Japanese bedtime app illustration. Draw exactly ONE seated cat viewed STRICTLY FROM BEHIND, looking upward at the night sky (sky not drawn), full body including two triangular ears, rounded head, shoulders, haunches, and a relaxed tail curved to the RIGHT beside its paws. Soft warm hand-drawn illustration, gentle rounded contours, calm cozy posture. Centered symmetrical upright seated pose, entire cat visible, generous transparent margins, subject occupies roughly 80% image height. Fur must be PURE WHITE with subtle neutral grayscale soft shadow and thin charcoal outline ONLY: no colored fur, no colored lighting, no patches, no stripes. This neutral grayscale template will be programmatically masked and colored to match actual user fur colors. Facing directly away from viewer: NO face, NO eyes, NO mouth, NO nose, NO visible front paws. Actual transparent alpha background. NO roof, NO moon, NO stars, NO scenery, NO circle, NO badge, NO frame, NO text, NO additional animals. The silhouette should read clearly at 50px tall. This is an entirely new asset; do not modify any existing assets.
