# RBT EPSG:3395 downstream patch workflow

## Purpose

This branch carries the RBT projection support as a small downstream patch
series on top of a pinned, unmodified upstream TileServer GL release. Upstream
acceptance is welcome but is not a prerequisite for operating this fork.

## Baseline

- Upstream remote: `https://github.com/maptiler/tileserver-gl.git`
- Current baseline: `v5.6.0` / `000c365f3d6948733355be167f09d5585697c4c6`
- Downstream branch: `rbt-3395`
- Runtime target: Node 20 and an RL9-native MapLibre Native `mbgl.node`

## Non-negotiable design rule

Do not infer the tile grid solely from an MBTiles `crs` metadata value.
The authoritative RBT tile-matrix definition must specify, together:

- CRS and ellipsoid;
- top-left origin;
- tile size;
- zoom-zero resolution/extent;
- axis order and row convention;
- valid latitude bounds;
- the WMTS TileMatrixSet identifier.

The legacy RBT MBTiles label themselves `EPSG:3395` but record an
approximately `±20037508.343` metre square origin/extent, which is also the
common Web Mercator grid extent. Treat that as a data-contract question to
resolve with the product owner/source specification before implementing a
standards-facing EPSG:3395 service.

## Patch-series layout

Keep every commit focused and independently reviewable:

1. `rbt: add tested tile-grid definitions`
   - owns EPSG:3857 and true EPSG:3395 transforms;
   - must reject unsupported grid identifiers rather than silently falling
     back to 3857.
2. `rbt: read tile grid from server configuration`
   - one explicit server option, defaulting to upstream EPSG:3857 behavior.
3. `rbt: apply the selected grid to rendered and static endpoints`
   - no direct `SphericalMercator` use on the EPSG:3395 path.
4. `rbt: generate matching WMTS and viewer metadata`
   - metadata, tile URLs, and client CRS must use the same grid definition.
5. `rbt: add projection fixtures and integration regression tests`
   - includes high-latitude and known-landmark checks.

Do not mix the RBT patches with container, MapLibre Native, dependency, or
formatting changes. Those belong in separate commits/branches.

## Upgrade procedure

```bash
# Start clean and preserve the known working downstream branch.
git switch rbt-3395
git status --short

# Obtain upstream releases and create a new candidate branch.
git fetch --tags upstream
git switch -c rbt-3395-vNEXT upstream/vNEXT

# Replay only the RBT-owned commits, in order.
git cherry-pick <rbt-grid-commit> <rbt-config-commit> \
  <rbt-render-commit> <rbt-template-commit> <rbt-tests-commit>

# Resolve conflicts by preserving upstream structure and reapplying the tested
# RBT behavior; never copy legacy spherical-mercator 3395 calls verbatim.
npm ci
npx mocha test/tile_grid.js --timeout 10000
npm test
npm run lint:js
```

After validation, tag the downstream baseline with both upstream and RBT
identity, for example: `rbt-v5.6.0-3395.1`.

## Acceptance evidence

Before enabling the EPSG:3395 configuration in a deployment, capture:

1. The source tile-matrix specification or an authoritative NGA/RBT statement.
2. MBTiles metadata extracted with only projection-relevant fields retained.
3. At least three named reference locations, including a high-latitude point.
4. Reference rendered images/tile hashes approved by the data owner.
5. A WMTS capabilities document validated against the chosen matrix set.

Until those exist, the branch can safely provide the default EPSG:3857 path,
but must not advertise the RBT data as standards-correct EPSG:3395.
