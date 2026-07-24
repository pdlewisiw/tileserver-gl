import assert from 'node:assert/strict';
import { getTileGrid } from '../src/tile_grid.js';

describe('RBT tile-grid configuration', function () {
  it('selects true ellipsoidal World Mercator for EPSG:3395', function () {
    const grid = getTileGrid('EPSG:3395');

    assert.equal(grid.code, 'EPSG:3395');
    const [equatorX, equatorY] = grid.project([0, 0]);
    assert.ok(Math.abs(equatorX) < 0.000001);
    assert.ok(Math.abs(equatorY) < 0.000001);

    const [, northing] = grid.project([0, 45]);
    assert.ok(Math.abs(northing - 5591295.918553) < 0.01);

    const [pixelX, pixelY] = grid.px([-147.8586809, 64.8144016], 12);
    assert.equal(Math.floor(pixelX / 256), 365);
    assert.equal(Math.floor(pixelY / 256), 1074);

    const point = grid.ll([pixelX, pixelY], 12);
    assert.ok(Math.abs(point[0] + 147.8586809) < 0.000001);
    assert.ok(Math.abs(point[1] - 64.8144016) < 0.000001);
  });

  it('does not silently treat an unsupported grid as EPSG:3857', function () {
    assert.throws(() => getTileGrid('EPSG:9999'), /Unsupported tile grid/);
  });
});
