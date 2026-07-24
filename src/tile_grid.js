import { SphericalMercator } from '@mapbox/sphericalmercator';
import proj4 from 'proj4';

const WORLD_EXTENT = 20037508.342789244;
const sphericalMercator = new SphericalMercator();

const TILE_GRIDS = new Map([
  ['EPSG:3857', { code: 'EPSG:3857', wmtsIdentifier: 'GoogleMapsCompatible' }],
  [
    'EPSG:3395',
    { code: 'EPSG:3395', wmtsIdentifier: 'WorldMercatorWGS84Quad' },
  ],
]);

// proj4js includes EPSG:3857 but not the ellipsoidal World Mercator definition.
// The RBT matrix is a square, top-left-origin XYZ grid whose zoom-zero extent is
// +/-20037508.342789244 metres.  Its extent happens to match Web Mercator's;
// its latitude-to-northing transform does not.
proj4.defs(
  'EPSG:3395',
  '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs',
);

/**
 * Return an explicit, testable tile-grid transform.
 * @param {string} code Supported CRS code.
 * @returns {{code: string, wmtsIdentifier: string, project: (lonLat: number[]) => number[], unproject: (coordinate: number[]) => number[], px: (lonLat: number[], zoom: number) => number[], ll: (pixel: number[], zoom: number) => number[]}} Tile-grid transforms from and to EPSG:4326.
 */
export function getTileGrid(code) {
  const grid = TILE_GRIDS.get(code);
  if (!grid) {
    throw new Error(`Unsupported tile grid: ${code}`);
  }

  if (code === 'EPSG:3857') {
    return {
      ...grid,
      project: (lonLat) => sphericalMercator.forward(lonLat),
      unproject: (coordinate) => sphericalMercator.inverse(coordinate),
      px: (lonLat, zoom) => sphericalMercator.px(lonLat, zoom),
      ll: (pixel, zoom) => sphericalMercator.ll(pixel, zoom),
    };
  }

  const transform = proj4('EPSG:4326', code);
  const pixelsAtZoomZero = 256;
  return {
    ...grid,
    project: (lonLat) => transform.forward(lonLat),
    unproject: (coordinate) => transform.inverse(coordinate),
    px: (lonLat, zoom) => {
      const [x, y] = transform.forward(lonLat);
      const pixelsPerMetre =
        (pixelsAtZoomZero * Math.pow(2, zoom)) / (2 * WORLD_EXTENT);
      return [
        (x + WORLD_EXTENT) * pixelsPerMetre,
        (WORLD_EXTENT - y) * pixelsPerMetre,
      ];
    },
    ll: (pixel, zoom) => {
      const metresPerPixel =
        (2 * WORLD_EXTENT) / (pixelsAtZoomZero * Math.pow(2, zoom));
      return transform.inverse([
        pixel[0] * metresPerPixel - WORLD_EXTENT,
        WORLD_EXTENT - pixel[1] * metresPerPixel,
      ]);
    },
  };
}
