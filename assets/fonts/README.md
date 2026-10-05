# App typography

M PLUS Rounded 1c is bundled as full Japanese/Latin WOFF2 fonts, so the app does not depend on an external font CDN or device-installed Japanese fonts. The regular face is preloaded; all faces use `font-display: swap` and content-hashed filenames.

Source: Google Fonts, https://github.com/google/fonts/tree/main/ofl/mplusrounded1c (Google Fonts CSS v22). Copyright 2016 The Rounded M+ Project Authors. The SIL Open Font License 1.1 is included in OFL.txt; the original font includes the OFL license URL in its name table. Only the distribution format was converted from TTF to WOFF2, using wawoff2 2.0.1; no glyphs or names were edited.

The family has native weights 400, 500 and 700. CSS requests 600 for headings and primary buttons, which the browser matches to the nearest available bold face (700). Body/profile text requests 400–500; numeric displays request 500. Existing font sizes and layout rules are retained. Pictorial symbols, including the floating heart and moon, retain their original font families.
