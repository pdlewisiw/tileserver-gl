# Rocky Linux 9 TileServer GL candidate

This is a separate candidate image, not a replacement for the active RBT Maps service. Build it as `pdlewis` with Podman in the same image store as `localhost/maplibre-node:6.4.1-rl9-verified`; do not run the candidate on the production Quadlet ports or import it into the `mappodsvc` store without a separate review and cutover.

## Build

```sh
cd /home/pdlewis/dev/tileserver-gl-rbt3395-modern
podman build --layers --pull=never --format docker -f Dockerfile.rl9 \
  -t localhost/rbtmaps-tileserver:5.6.0-rl9-candidate .
```

The recipe enables Rocky 9 AppStream's Node 24 stream, runs lockfile-controlled `npm ci --omit=dev`, and replaces the generic npm-downloaded MapLibre Native `node-v137/mbgl.node` with the separately built Rocky 9.8 artifact. It verifies MapLibre Native, canvas, and sharp module loading in the final image. It does not ship compilers, npm, or the native-addon builder image in the final runtime. `canvas@3.2.3` is installed from its prebuilt N-API distribution: forcing a source rebuild failed against Rocky 9's older librsvg headers (`rsvg_handle_get_intrinsic_size_in_pixels` missing). Its final binary's dynamic dependencies and import passed in Rocky 9, but provenance and CVE review of that prebuilt binary remain necessary.

## Candidate evidence (2026-09-30)

- Source: `rbt-3395-ubuntu24` baseline at `cf679dd` plus the Rocky 9 candidate `Dockerfile.rl9` (separate from the active runtime); package lock SHA-256 `6e2fb1ef5a83e4c18ca66d4bb6c1ba77d043610358579deb2b910580e94d86ba`.
- Native builder: `localhost/maplibre-node:6.4.1-rl9-verified`, image ID `12257e1d3f8fa807aec240be339b865f3c27888babf260e8418a02f8a96b13ab`, source commit `2177ec1bcee43b87e49766482f88dc30a1ee1310`.
- Candidate image: `localhost/rbtmaps-tileserver:5.6.0-rl9-candidate`, ID `f588c4217310d8ae8cf4587f3ea3eade5d8fdb33f5d544130860645ae2ad4eb1` in the `pdlewis` rootless store. Rocky 9.8, Node v24.19.0, ABI 137, non-root `node:node`.
- `mbgl.node` SHA-256 in the final image: `74aa61624a220bf35ca887b303cf8a0f13e319a983a80854933484f5df08bea3`, matching the Rocky 9.8 native build. MapLibre, canvas and sharp imported successfully; `ldd` found no missing libraries for the addon or canvas binary.
- An isolated loopback smoke container on `127.0.0.1:18089` returned HTTP 200 at `/health`, rendered `/styles/smoke/0/0/0.png` as a 256×256 PNG, rendered `/styles/smoke/static/0,0,1/256x256.png`, and returned WMTS XML containing `EPSG:3395`. The container health check became `healthy` and the smoke container was stopped and removed. Fixture and output: `/home/pdlewis/build-artifacts/rbtmaps-tileserver-rl9-smoke/`.

## Full suite in the separate Rocky 9 test image (2026-09-30)

Build and run without touching the active service or requiring a native addon on the host:

```sh
cd /home/pdlewis/dev/tileserver-gl-rbt3395-modern
podman build --layers --pull=never --format docker -f Dockerfile.rl9-test \
  -t localhost/rbtmaps-tileserver:5.6.0-rl9-test .
podman run --rm --pull=never --network none \
  -v /home/pdlewis/build-artifacts/rbtmaps-tileserver-rl9-test/test_data:/usr/src/app/test_data:Z \
  localhost/rbtmaps-tileserver:5.6.0-rl9-test
```

The test-only image ID was `39faa1f47f82dfd3d894a016d9273904c819696cfeea1be23b5a85d52d539ded`. It used Rocky Linux 9.8, Node 24.19.0 (ABI 137), npm 11.17.0, and the same EL-native `mbgl.node` checksum `74aa61624a220bf35ca887b303cf8a0f13e319a983a80854933484f5df08bea3`. The external upstream v1.3.0 `test_data.zip` fixture was downloaded per the repository README to `/home/pdlewis/build-artifacts/rbtmaps-tileserver-rl9-test/`, checked for unsafe archive paths, and extracted there; downloaded ZIP SHA-256: `5aab7976fbedac04122975b34c8bf420fd4947e4503b14e262653694ea611ec0`. Under `script -q -e` and Xvfb, `npm run test` completed with **181 passing (4s)** and exit code 0. The test image installs dev dependencies and npm; the production candidate does not. The build reported 25 npm advisories including dev dependencies, separate from the production install's 18.

## Outstanding gates

- The full repository suite passed against its published upstream fixture, but still test with a representative real RBT MBTiles/style/fonts/sprites dataset, including rendered EPSG:3395 z/x/y, WMTS coordinates, static-map overlays, and MapProxy integration.
- `npm ci` reported 18 dependency advisories (6 low, 7 moderate, 4 high, 1 critical). Triage the exact final image, scan it and retain SBOM/image ID; do not present this as a security-cleared image.
- The final runtime includes the canvas prebuilt N-API binary, which deserves source/provenance evaluation before promotion. Pin base image digest and record RPM manifest for a reproducible release.
- Image is only in `pdlewis`'s rootless Podman store; it has not been deployed to the active `mappodsvc` Quadlet stack or published to a registry.
