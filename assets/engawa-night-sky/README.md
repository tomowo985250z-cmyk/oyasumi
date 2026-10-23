# Engawa night sky

Adopts the reviewed output/engawa-night-sky-study-v1 runtime and catalog without visual changes. Catalog fetch is deferred until engawa night; the existing lighting clock drives updates. Daytime and roof rendering remain in the original SolarSky implementation.

The original landscape implementation and all countryside assets are retained. Add ?sky=existing to restore the previous sky immediately; reverting the adoption commit restores the previous default. The preceding production commit is a8f980597969d77fb9aee56f5a5a7a42317f95aa.

Catalog source and BSD-3 license are included alongside the unchanged catalog.
