import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scanMusic } from '../scripts/music-library.mjs';

test('music discovery handles absence, names, priority, and removal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'liza-music-test-'));
  const root = pathToFileURL(directory + '/');
  try {
    assert.deepEqual(await scanMusic(root), { src: null });
    await mkdir(join(directory, 'music'));
    for (const name of ['photo.jpg', '.hidden.mp3', 'song.MP3', 'music/Наш трек #1.M4A']) await writeFile(join(directory, name), 'fixture');
    assert.equal((await scanMusic(root)).src, './music/' + encodeURIComponent('Наш трек #1.M4A'));
    await writeFile(join(directory, 'music/music.mp3'), 'fixture');
    assert.equal((await scanMusic(root)).src, './music/music.mp3');
    await writeFile(join(directory, 'music.mp3'), 'fixture');
    assert.equal((await scanMusic(root)).src, './music.mp3');
    await unlink(join(directory, 'music.mp3'));
    await unlink(join(directory, 'music/music.mp3'));
    await unlink(join(directory, 'music/Наш трек #1.M4A'));
    assert.equal((await scanMusic(root)).src, './song.MP3');
  } finally {
    // Only the unique fixture directory created above is removed.
    await rm(directory, { recursive: true, force: true });
  }
});
