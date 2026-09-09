import { readdir, readFile } from 'node:fs/promises';
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
  const photos = await Promise.all(images.map(async (item, i) => {
    const defaultCaption = `Наш момент ${String(i + 1).padStart(2, '0')}`;
    const textPath = item.path.slice(0, -extname(item.path).length) + '.txt';
    let caption = defaultCaption, description = '';
    try {
      const textURL = new URL('./' + textPath.split('/').map(encodeURIComponent).join('/'), root);
      const text = (await readFile(textURL, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      const lines = text.split('\n');
      caption = lines[0].trim() || defaultCaption;
      description = lines.slice(1).join('\n').trim();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return { src: item.src, caption, description, alt: caption === defaultCaption ? `Наша фотография ${i + 1}` : caption };
  }));
  return { photos };
}
