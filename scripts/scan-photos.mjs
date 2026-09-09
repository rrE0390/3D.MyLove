import { writeFile } from 'node:fs/promises';
import { scanPhotos } from './photo-library.mjs';
const root = new URL('../', import.meta.url);
const manifest = await scanPhotos(root);
await writeFile(new URL('photo-manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Найдено фотографий: ${manifest.photos.length}. photo-manifest.json обновлён.`);
