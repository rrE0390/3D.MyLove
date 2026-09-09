import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scanPhotos } from '../scripts/photo-library.mjs';

test('photo count tracks additions and removals beside HTML and in photos/',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'liza-photos-test-'));
  const root=pathToFileURL(directory+'/');
  try{
    assert.equal((await scanPhotos(root)).photos.length,0);
    await mkdir(join(directory,'photos'));
    for(const name of ['10.JPG','2.jpg','index.html','photos/Наш день #1.png','photos/readme.md','.hidden.jpg'])await writeFile(join(directory,name),'test');
    const data=await scanPhotos(root);
    assert.equal(data.photos.length,3);
    assert.deepEqual(data.photos.slice(0,2).map(p=>p.src),['./2.jpg','./10.JPG']);
    assert.equal(data.photos[2].src,'./photos/'+encodeURIComponent('Наш день #1.png'));
    await unlink(join(directory,'2.jpg'));
    assert.equal((await scanPhotos(root)).photos.length,2);
  }finally{
    // Only the unique directory created by this test, never the workspace.
    await rm(directory,{recursive:true,force:true});
  }
});

test('text descriptions follow filenames and retain paragraphs and Cyrillic',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'liza-descriptions-test-'));
  const root=pathToFileURL(directory+'/');
  try{
    await mkdir(join(directory,'photos'));
    await writeFile(join(directory,'photos','Наш день #1.JPG'),'test');
    await writeFile(join(directory,'photos','Наш день #1.txt'),'\uFEFFНаш закат ❤️\r\n\r\nПервая строка.\r\n\r\nВторой абзац с «кавычками».','utf8');
    await writeFile(join(directory,'2.png'),'test');
    await writeFile(join(directory,'2.txt'),'Только название','utf8');
    await writeFile(join(directory,'orphan.txt'),'Без фотографии');
    let data=await scanPhotos(root);
    assert.equal(data.photos.length,2);
    let photo=data.photos.find(p=>p.src.includes('%23'));
    assert.equal(photo.caption,'Наш закат ❤️');
    assert.equal(photo.description,'Первая строка.\n\nВторой абзац с «кавычками».');
    assert.equal(data.photos.find(p=>p.src==='./2.png').description,'');
    await writeFile(join(directory,'1.jpg'),'test');
    data=await scanPhotos(root);
    assert.equal(data.photos.find(p=>p.src.includes('%23')).caption,'Наш закат ❤️');
    await writeFile(join(directory,'photos','Наш день #1.txt'),'Новое название\nНовый текст','utf8');
    data=await scanPhotos(root);
    assert.equal(data.photos.find(p=>p.src.includes('%23')).description,'Новый текст');
    await unlink(join(directory,'photos','Наш день #1.txt'));
    data=await scanPhotos(root);
    photo=data.photos.find(p=>p.src.includes('%23'));
    assert.match(photo.caption,/^Наш момент/);assert.equal(photo.description,'');
  }finally{await rm(directory,{recursive:true,force:true});}
});
