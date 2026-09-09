import * as THREE from '../vendor/three.module.js';
import { createGalleryControls } from './gallery-controls.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
function seeded(seed = 137) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function rendererFor(container) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  return renderer;
}

function disposeScene(scene, renderer) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (material.map) textures.add(material.map);
    }
  });
  textures.forEach(t => { t.userData.cancel?.(); t.dispose(); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
}

function pointMaterial(color, size, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uOpacity: { value: opacity } },
    vertexShader: `uniform float uSize; void main(){vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(uSize/max(1.,-p.z),1.,15.);}`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; void main(){float r=length(gl_PointCoord-.5)*2.; if(r>1.) discard; float a=exp(-r*r*4.)*(1.-smoothstep(.65,1.,r)); gl_FragColor=vec4(uColor,a*uOpacity);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function ring(radius, color, opacity = .3) {
  const points = Array.from({ length: 161 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * TAU) * radius, 0, Math.sin(i / 160 * TAU) * radius));
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

export function createIntro(container) {
  const renderer = rendererFor(container);
  const fallback = container.querySelector('.intro-fallback');
  fallback.hidden = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 60);
  const random = seeded();
  const count = window.innerWidth < 600 ? 4400 : 7400;
  const target = new Float32Array(count * 3), positions = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let x, y, z, f;
    do {
      x = (random() - .5) * 2.5; y = (random() - .5) * 2.7; z = (random() - .5) * 1.5;
      f = Math.pow(x*x + 2.25*z*z + y*y - 1, 3) - x*x*y*y*y - .1125*z*z*y*y*y;
    } while (f > 0 || (f < -.025 && random() > .18));
    target[i*3] = x * 1.18; target[i*3+1] = y * 1.18 + .28; target[i*3+2] = z * 1.18;
    seeds[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const heart = new THREE.Points(geometry, pointMaterial('#6fcfff', 18 * renderer.getPixelRatio()));
  heart.frustumCulled = false;
  scene.add(heart);
  const heartGlow = new THREE.Points(geometry, pointMaterial('#a5e8ff', 48 * renderer.getPixelRatio(), .10));
  heartGlow.frustumCulled = false; scene.add(heartGlow);
  const halo = new THREE.Group();
  for (let j = 0; j < 8; j++) {
    const r = ring(.66 + j * .018, '#23caff', .11 + (j % 3) * .08);
    r.position.y = -1.34 + j * .006; halo.add(r);
  }
  scene.add(halo);
  const orbitPositions = new Float32Array(1400 * 3);
  const orbitGeometry = new THREE.BufferGeometry();
  orbitGeometry.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3));
  const orbit = new THREE.Points(orbitGeometry, pointMaterial('#1ebaff', 30 * renderer.getPixelRatio(), .9));
  orbit.frustumCulled = false; scene.add(orbit);
  let width = 1, height = 1, running = true, frame, time = 0, previous;
  function resize() {
    width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height); camera.aspect = width / height;
    camera.position.set(0, .6, Math.max(6.2, 4.9 / camera.aspect));
    camera.lookAt(0, -.05, 0); camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function animate(now) {
    if (!running) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) { previous = now; return; }
    time += previous === undefined ? 0 : Math.min((now - previous) / 1000, .05); previous = now;
    const assemble = THREE.MathUtils.smoothstep(time, .5, 3.2);
    const swirl = Math.sin(clamp((time - 3.3) / 2.1, 0, 1) * Math.PI) * .22;
    for (let i = 0; i < count; i++) {
      const t = seeds[i], angle = t * TAU * 8 + time * (1.1 + t), radius = .3 + t * 1.4;
      const pulse = 1 + Math.sin(time * 2.8) * .018;
      const a = i*3;
      positions[a] = target[a] * assemble * pulse + Math.cos(angle) * radius * (1 - assemble) + Math.sin(angle) * swirl * t;
      positions[a+1] = (-1.34 + t * 3.6) * (1 - assemble) + target[a+1] * assemble * pulse + Math.sin(time * 2 + t * 40) * .012;
      positions[a+2] = target[a+2] * assemble + Math.sin(angle) * radius * (1 - assemble) + Math.cos(angle) * swirl * t;
    }
    geometry.attributes.position.needsUpdate = true;
    heart.rotation.y = Math.sin(time * .48) * .18;
    heartGlow.rotation.copy(heart.rotation);
    heart.material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(time, 0, .8);
    for (let i = 0; i < 1400; i++) {
      const p = i / 1400, angle = p * TAU * 13 + time * 2.3;
      const lift = swirl * 8 * p;
      const radius = .7 + Math.sin(p*121) * .055 + lift * .08;
      orbitPositions[i*3] = Math.cos(angle) * radius;
      orbitPositions[i*3+1] = -1.32 + Math.sin(p * 78 + time) * .04 + lift;
      orbitPositions[i*3+2] = Math.sin(angle) * radius;
    }
    orbitGeometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return { dispose() { running = false; cancelAnimationFrame(frame); observer.disconnect(); disposeScene(scene, renderer); fallback.hidden = false; } };
}

function photoTexture(photo, index) {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 500;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e3e3df'; ctx.fillRect(0, 0, 384, 500);
  const grad = ctx.createLinearGradient(0, 0, 360, 480); grad.addColorStop(0, photo.palette); grad.addColorStop(1, '#182330');
  ctx.fillStyle = grad; ctx.fillRect(15, 15, 354, 414);
  // An intentionally abstract, code-drawn placeholder, not a substitute personal photo.
  ctx.save(); ctx.beginPath(); ctx.rect(15,15,354,414); ctx.clip();
  const glow = ctx.createRadialGradient(230, 125, 3, 230, 125, 200); glow.addColorStop(0, '#eee2d266'); glow.addColorStop(1, '#ddd1c100');
  ctx.fillStyle = glow; ctx.fillRect(15,15,354,414);
  ctx.strokeStyle = '#f0e0d33d'; ctx.lineWidth = 1;
  for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(192, 210, 67+j*20, 115+j*23, .3+index*.12, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#e8e4e2'; ctx.textAlign = 'center'; ctx.font = '48px Georgia'; ctx.fillText('♡',192,218);
  ctx.font = 'italic 22px Georgia'; ctx.fillText('Место для',192,298); ctx.fillText('нашего фото',192,328);
  ctx.restore();
  ctx.fillStyle = '#52545b'; ctx.font = '17px Georgia'; ctx.textAlign = 'left'; ctx.fillText('мы с тобой',23,469);
  ctx.font = '13px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(String(index+1).padStart(2,'0'),358,469);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  if (photo.src) {
    const img = new Image(); img.onload = () => {
      const targetRatio = 354 / 414, ratio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (ratio > targetRatio) { sw = img.height * targetRatio; sx = (img.width-sw)/2; } else { sh = img.width/targetRatio; sy = (img.height-sh)/2; }
      ctx.drawImage(img,sx,sy,sw,sh,15,15,354,414); texture.needsUpdate = true;
    };
    texture.userData.cancel = () => { img.onload = null; img.onerror = null; };
    img.src = photo.src;
  }
  return texture;
}

export function createGallery(container, photos, onSelect, reducedMotion) {
  const renderer = rendererFor(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
  scene.add(new THREE.AmbientLight('#b4cce5', 1.8));
  const key = new THREE.DirectionalLight('#ffe2ef', 4.2); key.position.set(-3,6,5); scene.add(key);
  const rim = new THREE.PointLight('#75ddff', 22, 15); rim.position.set(3,3,-2); scene.add(rim);
  const pink = new THREE.PointLight('#ff7cab', 14, 10); pink.position.set(-1,2.4,3); scene.add(pink);
  const orbit = new THREE.Group(); scene.add(orbit);
  for (const radius of [2.6, 4.15, 5.05]) {
    const r = ring(radius, '#7599b5', radius===4.15?.3:.12); r.position.y = -.44; scene.add(r);
  }
  const random = seeded(417);
  const starPositions = new Float32Array(280 * 3);
  for (let i=0;i<280;i++) { starPositions[i*3]=(random()-.5)*13; starPositions[i*3+1]=random()*5-.6; starPositions[i*3+2]=(random()-.5)*9; }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
  const stars = new THREE.Points(starGeo,pointMaterial('#8cb5ce',14*renderer.getPixelRatio(),.48)); scene.add(stars);
  const shape = new THREE.Shape();
  for(let i=0;i<=96;i++) {
    const t=i/96*TAU, x=16*Math.sin(t)**3/17, y=(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  const heartGeo = new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.15,bevelThickness:.16,curveSegments:32});
  heartGeo.center();
  const heart = new THREE.Mesh(heartGeo,new THREE.MeshPhysicalMaterial({color:'#d68aaa',metalness:.25,roughness:.2,clearcoat:1,clearcoatRoughness:.16,emissive:'#5c1836',emissiveIntensity:.18}));
  heart.position.set(0,2.1,0); heart.scale.setScalar(.82); scene.add(heart);
  const pedestal = ring(1.16,'#c593b1',.45); pedestal.position.y=-.42; scene.add(pedestal);
  const cards = [], reflections = [];
  const columns = Math.min(16,Math.max(1,photos.length));
  const rows = Math.max(1,Math.ceil(photos.length/16));
  const cardScale = Math.min(1, 2 * Math.PI * 4.15 / columns / 2.1);
  const photoGeo = new THREE.PlaneGeometry(1.38*cardScale,1.8*cardScale);
  photos.forEach((photo,i)=>{
    const texture = photoTexture(photo,i);
    const material = new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    const card = new THREE.Mesh(photoGeo,material); card.userData.index=i; orbit.add(card); cards.push(card);
    const reflection = new THREE.Mesh(photoGeo,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,opacity:.095,depthWrite:false}));
    reflection.scale.y=-.65; orbit.add(reflection); reflections.push(reflection);
  });
  let frame, running=true, inView=false, paused=reducedMotion, angle=.18, targetAngle=.18, time=0, previous;
  let dragging=false;
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
  let width=1,height=1;
  function resize(){
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);
    renderer.setSize(width,height);camera.aspect=width/height;
    // Fit the complete orbit to BOTH axes, including portrait phones.
    const halfFov=THREE.MathUtils.degToRad(camera.fov/2);
    const sceneCenter=1+(rows-1)*1.15;
    const sceneHalfHeight=Math.max(3.4,rows*1.2+1.4);
    const distance=Math.max(13.5,6.0/(Math.tan(halfFov)*camera.aspect),sceneHalfHeight/Math.tan(halfFov));
    camera.position.set(0,sceneCenter+distance*.4,distance);camera.lookAt(0,sceneCenter,0);camera.updateProjectionMatrix();
    draw(0);
  }
  function draw(dt){
    time+=dt;
    if(!paused&&!dragging)targetAngle+=dt*.115;
    angle+= (targetAngle-angle)*Math.min(1,dt?dt*9:1);
    cards.forEach((card,i)=>{
      const row=Math.floor(i/16),inRow=Math.min(16,photos.length-row*16);
      const a=(i%16)/inRow*TAU+angle+row*.18;
      card.position.set(Math.sin(a)*4.15,.98+row*2.3+(reducedMotion?0:Math.sin(time*.65+i)*.045),Math.cos(a)*4.15);
      card.quaternion.copy(camera.quaternion);
      card.rotateY(Math.sin(a)*-.22);
      const ref=reflections[i];ref.position.set(card.position.x,-.99,card.position.z);ref.quaternion.copy(card.quaternion);
      ref.visible=row===0;ref.material.opacity=clamp((Math.cos(a)+1)*.048,.018,.095);
    });
    heart.rotation.y=reducedMotion?-.2:Math.sin(time*.55)*.24;
    heart.rotation.z=reducedMotion?-.05:Math.sin(time*.4)*.04;
    heart.position.y=2.1+(reducedMotion?0:Math.sin(time*1.8)*.07);
    heart.scale.setScalar(.82+(reducedMotion?0:Math.sin(time*2.5)*.016));
    renderer.render(scene,camera);
  }
  function animate(now){
    if(!running)return;frame=requestAnimationFrame(animate);
    if(!inView||document.hidden){previous=now;return;}
    const dt=previous===undefined?0:Math.min((now-previous)/1000,.05);previous=now;
    draw(dt);
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  const intersectionObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'80px'});intersectionObserver.observe(container);
  const navigation=createGalleryControls(container,{
    stepAngle:TAU/columns,
    onInteraction(active){dragging=active;},
    onRotate(delta){targetAngle+=delta;},
    onZoom(value){camera.zoom=value;camera.updateProjectionMatrix();draw(0);},
    onSelect(clientX,clientY){
      const bounds=container.getBoundingClientRect();pointer.set((clientX-bounds.left)/bounds.width*2-1,-(clientY-bounds.top)/bounds.height*2+1);
      raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(cards);if(hits.length)onSelect(hits[0].object.userData.index);
    },
  });
  container.classList.add('has-webgl'); resize();frame=requestAnimationFrame(animate);
  return {
    currentIndex(){return cards.length?cards.reduce((best,card)=>card.position.z>best.position.z?card:best).userData.index:0;},
    step(direction){if(photos.length)targetAngle+=direction*TAU/columns;},
    setPaused(value){paused=value;},
    dispose(){running=false;cancelAnimationFrame(frame);resizeObserver.disconnect();intersectionObserver.disconnect();navigation.dispose();container.classList.remove('has-webgl');disposeScene(scene,renderer);},
  };
}
