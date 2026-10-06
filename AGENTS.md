# Project architecture

- Keep V1 desktop/mobile and V2 navigation grouping aligned while preserving existing route paths and permission guards, so menu organization does not change access rights or bookmarked links.
- Temporarily pause My Deductions by rendering an unavailable page at its existing route rather than changing deductions data, so direct links remain safe and the feature can be restored later.
- Package Android with Capacitor's bundled web assets instead of a remote preview URL, so installed copies do not depend on a temporary development site. Build the app bundle with `CAPACITOR_BUILD=true npm run build` (sets Vite base to './'); the normal web build keeps base '/' so deep links refresh correctly.