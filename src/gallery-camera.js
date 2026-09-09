import { MathUtils } from '../vendor/three.module.js';

export function positionGalleryCamera(camera, aspect, rows) {
  camera.aspect = aspect;
  const halfFov = MathUtils.degToRad(camera.fov / 2);
  const sceneCenter = 1 + (rows - 1) * 1.15;
  const sceneHalfHeight = Math.max(3.4, rows * 1.2 + 1.4);
  const distance = Math.max(13.5, 6 / (Math.tan(halfFov) * aspect), sceneHalfHeight / Math.tan(halfFov));
  camera.position.set(0, sceneCenter + distance * .4, distance);
  // At 100% show the whole ring. By 200% aim at the middle of the nearest,
  // lowest row of actual frames (not the heart, reflections, or upper rows).
  // This stable world-space target does not jump when the ring rotates.
  const focus = MathUtils.smoothstep(camera.zoom, 1, 2);
  camera.lookAt(0, MathUtils.lerp(sceneCenter, .98, focus), 4.15 * focus);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
