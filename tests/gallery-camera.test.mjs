import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from '../vendor/three.module.js';
import { positionGalleryCamera } from '../src/gallery-camera.js';

test('zoom centers nearest bottom frames across aspect ratios and multiple rows', () => {
  for (const aspect of [.6, 1, 2.2]) for (const rows of [1, 2, 4]) {
    const camera = new PerspectiveCamera(37, aspect, .1, 100);
    positionGalleryCamera(camera, aspect, rows);
    const original = camera.matrixWorld.toArray();
    const bottom = new Vector3(0, .98, 4.15);
    assert.ok(bottom.clone().project(camera).y < 0);
    for (const zoom of [2, 3]) {
      camera.zoom = zoom;
      positionGalleryCamera(camera, aspect, rows);
      const projected = bottom.clone().project(camera);
      assert.ok(Math.abs(projected.x) < 1e-10);
      assert.ok(Math.abs(projected.y) < 1e-10);
      assert.ok(projected.z > -1 && projected.z < 1);
    }
    camera.zoom = 1;
    positionGalleryCamera(camera, aspect, rows);
    assert.deepEqual(camera.matrixWorld.toArray(), original);
  }
});
