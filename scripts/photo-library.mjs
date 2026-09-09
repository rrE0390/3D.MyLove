import { readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const sort = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export async function scanPhotos(root) {
  const images = [];
  for (const directory of ['', 'photos/']) {
    let entries;
    try { entries = await readdir(new URL(directory || './', root), { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.') || !extensions.has(extname(entry.name).toLowerCase())) continue;
      const path = directory + entry.name;
      images.push({ path, src: './' + path.split('/').map(encodeURIComponent).join('/') });
    }
  }
  images.sort((a, b) => sort.compare(a.path, b.path));
  return { photos: images.map((item, i) => ({ src: item.src, caption: `Наш момент ${String(i + 1).padStart(2, '0')}`, alt: `Наша фотография ${i + 1}` })) };
}
