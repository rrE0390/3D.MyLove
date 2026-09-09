import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPhotos } from './photo-library.mjs';
import { scanMusic } from './music-library.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '_site');
// Only the generated output directory inside this project may be cleaned.
if (relative(root, output) !== '_site') throw new Error('Invalid build output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'favicon.svg', 'src', 'vendor']) {
  await cp(resolve(root, path), resolve(output, path), { recursive: true });
}
const manifest = await scanPhotos(new URL('../', import.meta.url));
for (const photo of manifest.photos) {
  const path = decodeURIComponent(photo.src.slice(2));
  const target = resolve(output, path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await cp(resolve(root, path), target);
}
await writeFile(resolve(output, 'photo-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const music = await scanMusic(new URL('../', import.meta.url));
if (music.src) {
  const path = decodeURIComponent(music.src.slice(2));
  const target = resolve(output, path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await cp(resolve(root, path), target);
}
await writeFile(resolve(output, 'music-manifest.json'), JSON.stringify(music, null, 2) + '\n');
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`GitHub Pages ready: _site/ — ${manifest.photos.length} photos`);
console.log(music.src ? `Background music: ${music.src}` : 'No background music: add an audio file beside index.html or in music/');
