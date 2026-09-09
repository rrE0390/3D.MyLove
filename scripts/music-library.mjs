import { readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const extensions = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac', '.webm']);
const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

// An explicitly named music.mp3 wins; otherwise prefer the music/ folder.
export async function scanMusic(root) {
  const tracks = [];
  for (const directory of ['', 'music/']) {
    let entries;
    try { entries = await readdir(new URL(directory || './', root), { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.') || !extensions.has(extname(entry.name).toLowerCase())) continue;
      const path = directory + entry.name;
      const rank = entry.name.toLowerCase() === 'music.mp3' ? (directory ? 1 : 0) : (directory ? 2 : 3);
      tracks.push({ path, rank });
    }
  }
  tracks.sort((a, b) => a.rank - b.rank || collator.compare(a.path, b.path) || a.path.localeCompare(b.path));
  return { src: tracks.length ? './' + tracks[0].path.split('/').map(encodeURIComponent).join('/') : null };
}
