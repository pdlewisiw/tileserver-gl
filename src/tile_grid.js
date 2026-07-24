import proj4 from 'proj4';

const TILE_GRIDS = new Map([
  [
    'EPSG:3857',
    {
      code: 'EPSG:3857',
      wmtsIdentifier: 'GoogleMapsCompatible',
    },
  ],
  [
    'EPSG:3395',
    {
      code: 'EPSG:3395',
      wmtsIdentifier: 'WorldMercatorWGS84Quad',
    },
  ],
]);

// proj4js includes EPSG:3857 but not the ellipsoidal World Mercator definition.
// Keep this explicit and local so RBT configuration cannot accidentally fall back
// to the spherical Web Mercator math used by the legacy fork.
proj4.defs(
  'EPSG:3395',
  '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs',
);

/**
 * Return an explicit, testable tile-grid transform.
 * @param {string} code Supported CRS code.
 * @returns {{code: string, wmtsIdentifier: string, project: (lonLat: number[]) => number[], unproject: (coordinate: number[]) => number[]}} Tile-grid transforms from and to EPSG:4326.
 */
export function getTileGrid(code) {
  const grid = TILE_GRIDS.get(code);
  if (!grid) {
    throw new Error(`Unsupported tile grid: ${code}`);
  }

  const transform = proj4('EPSG:4326', code);
  return {
    ...grid,
    project: (lonLat) => transform.forward(lonLat),
    unproject: (coordinate) => transform.inverse(coordinate),
  };
}
