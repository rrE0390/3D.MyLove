import { startCounter } from './counter.js';
import { loadPhotos } from './photos.js';
import { createPhotoViewer } from './photo-viewer.js';

startCounter();
const intro=document.getElementById('intro');
const page=document.getElementById('page');
const stage=document.getElementById('gallery-stage');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const progress=intro.querySelector('.intro-progress i');
let introScene, gallery, scenes, introFrame, transitionTimer, introVersion=0, paused=motion.matches;
let selected=0;
let photos=[], photoSignature=null, galleryVersion=0, refreshing=false;
const dialog=document.getElementById('photo-dialog');
let photoViewer=null;
const photoDescription=document.createElement('p');
photoDescription.id='photo-description';
photoDescription.hidden=true;
document.getElementById('photo-title').insertAdjacentElement('afterend',photoDescription);
const fallbackList=document.getElementById('fallback-photos');

function openPhoto(index){
  if(!photos.length)return;
  selected=(index+photos.length)%photos.length;
  const photo=photos[selected], content=document.getElementById('photo-content');
  photoViewer?.destroy();photoViewer=null;
  content.replaceChildren();
  if(photo.src){
    photoViewer=createPhotoViewer(content,{src:photo.src,alt:photo.alt,onError(){
      photoViewer?.destroy();photoViewer=null;content.replaceChildren(placeholder());
    }});
  }else content.append(placeholder());
  document.getElementById('photo-title').textContent=photo.src?photo.caption:`${photo.caption} · Здесь будет ваша фотография`;
  photoDescription.textContent=photo.description||'';
  photoDescription.hidden=!photo.description;
  dialog.classList.toggle('has-description',Boolean(photo.description));
  dialog.scrollTop=0;
  dialog.showModal();
}
function placeholder(){const div=document.createElement('div');div.className='photo-placeholder';const symbol=document.createElement('span');symbol.textContent='♡';const text=document.createElement('p');text.textContent='Воспоминания, которые останутся с нами';div.append(symbol,text);return div;}
function updatePhotoButtons(){
fallbackList.replaceChildren();
photos.forEach((photo,i)=>{
  const button=document.createElement('button');button.className='fallback-photo';button.type='button';button.setAttribute('aria-label',photo.alt);
  if(photo.src){const img=document.createElement('img');img.src=photo.src;img.alt=photo.alt;button.append(img);}else button.textContent=`♡ ${photo.caption}`;
  button.addEventListener('click',()=>openPhoto(i));fallbackList.append(button);
});
document.getElementById('gallery-count').textContent=photos.length?`${String(photos.length).padStart(2,'0')} ФОТО`:'НАШИ МОМЕНТЫ ВПЕРЕДИ';
document.getElementById('gallery-hint').textContent=photos.length?'Поверни наш мир':'Здесь появятся наши фотографии';
document.getElementById('previous-photo').disabled=photos.length<2;
document.getElementById('next-photo').disabled=photos.length<2;
document.getElementById('toggle-rotation').disabled=photos.length<1;
document.getElementById('open-photo').disabled=photos.length<1;
}
document.getElementById('open-photo').addEventListener('click',()=>openPhoto(gallery?.currentIndex()??selected));
document.getElementById('close-photo').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{photoViewer?.destroy();photoViewer=null;});
dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
dialog.addEventListener('keydown',event=>{if(photoViewer?.handleKey(event))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();openPhoto(selected+(event.key==='ArrowRight'?1:-1));}});

function finishIntro(){
  const version=++introVersion;
  cancelAnimationFrame(introFrame);
  intro.classList.add('is-leaving');page.inert=false;document.body.style.overflow='';
  page.classList.remove('entering');void page.offsetWidth;page.classList.add('entering');
  transitionTimer=setTimeout(()=>{
    if(version!==introVersion)return;
    intro.hidden=true;introScene?.dispose();introScene=null;
    // Move focus only if a visitor was interacting with the overlay.
    if(intro.contains(document.activeElement))document.getElementById('replay-intro').focus({preventScroll:true});
  },motion.matches?0:850);
}

async function playIntro(){
  clearTimeout(transitionTimer);cancelAnimationFrame(introFrame);introScene?.dispose();introScene=null;
  const version=++introVersion;
  intro.hidden=false;intro.classList.remove('is-leaving');page.inert=true;document.body.style.overflow='hidden';progress.style.width='0%';
  document.getElementById('skip-intro').focus({preventScroll:true});
  let elapsed=0,previous;
  function tick(now){
    if(version!==introVersion)return;
    if(!document.hidden)elapsed+=previous===undefined?0:Math.min(now-previous,100);
    const duration=motion.matches?1800:7600;
    previous=now;progress.style.width=`${Math.min(100,elapsed/duration*100)}%`;
    if(elapsed>=duration)finishIntro();else introFrame=requestAnimationFrame(tick);
  }
  introFrame=requestAnimationFrame(tick);
  try{scenes=await import('./scenes.js');if(version===introVersion&&!motion.matches)introScene=scenes.createIntro(document.getElementById('intro-canvas'));}
  catch(error){console.warn('Звёздное сердце недоступно, показываем статичное.',error);if(version===introVersion)finishIntro();}
}
document.getElementById('skip-intro').addEventListener('click',finishIntro);
document.getElementById('replay-intro').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'instant'});playIntro();});

function syncPause(){document.getElementById('toggle-rotation').setAttribute('aria-pressed',String(paused));document.getElementById('toggle-rotation').setAttribute('aria-label',paused?'Продолжить вращение':'Приостановить вращение');document.getElementById('rotation-icon').textContent=paused?'▷':'Ⅱ';gallery?.setPaused(paused);}
syncPause();
document.getElementById('toggle-rotation').addEventListener('click',()=>{paused=!paused;syncPause();});
for(const [id,direction]of [['previous-photo',-1],['next-photo',1]])document.getElementById(id).addEventListener('click',()=>{
  if(gallery)gallery.step(direction);else fallbackList.scrollBy({left:direction*159,behavior:motion.matches?'instant':'smooth'});
});

async function initGallery(){
  const version=++galleryVersion;
  try{scenes??=await import('./scenes.js');if(version!==galleryVersion)return;gallery?.dispose();gallery=scenes.createGallery(stage,photos,openPhoto,motion.matches);syncPause();
    const canvas=stage.querySelector('canvas');canvas.addEventListener('webglcontextlost',event=>{
      if(event.target!==stage.querySelector('canvas'))return;
      event.preventDefault();gallery?.dispose();gallery=null;document.getElementById('toggle-rotation').disabled=true;document.getElementById('gallery-hint').textContent=photos.length?'Листай наши моменты':'Здесь появятся наши фотографии';
    },{once:true});
  }catch(error){console.warn('Используется обычная галерея.',error);stage.querySelector('canvas')?.remove();document.getElementById('toggle-rotation').disabled=true;document.getElementById('gallery-hint').textContent=photos.length?'Листай наши моменты':'Здесь появятся наши фотографии';}
}
async function refreshPhotos(){
  if(refreshing||document.hidden)return;refreshing=true;
  try{
    const next=await loadPhotos(),signature=JSON.stringify(next);
    if(signature!==photoSignature){photoSignature=signature;photos=next;if(dialog.open)dialog.close();updatePhotoButtons();await initGallery();}
  }catch(error){console.warn('Список фотографий недоступен.',error);if(photoSignature===null){updatePhotoButtons();await initGallery();}}
  finally{refreshing=false;}
}
if(motion.matches){intro.hidden=true;}else playIntro();
refreshPhotos();
setInterval(refreshPhotos,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPhotos();});
motion.addEventListener('change',()=>{if(motion.matches&&!intro.hidden)finishIntro();paused=motion.matches;gallery?.dispose();gallery=null;initGallery();syncPause();});
