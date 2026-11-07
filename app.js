import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id);
const canvas=$('scene');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,100);
camera.position.set(0,1.5,6.0);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=2.7;controls.maxDistance=9;controls.minPolarAngle=.33;controls.maxPolarAngle=Math.PI-.12;
controls.target.set(0,1.42,0);controls.update();
scene.add(new THREE.HemisphereLight(0xdfeeff,0x4c4c76,2.2));
const key=new THREE.DirectionalLight(0xffe2bb,3.1);key.position.set(3,6,5);scene.add(key);
const fill=new THREE.DirectionalLight(0x8fb9f8,1.8);fill.position.set(-4,4,-2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xbba9f7,2.2);rim.position.set(1,2,-4);scene.add(rim);
const ground=new THREE.Mesh(new THREE.CircleGeometry(1.6,90),new THREE.MeshBasicMaterial({color:0x7291bf,transparent:true,opacity:.065,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-.035;scene.add(ground);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.007,8,110),new THREE.MeshBasicMaterial({color:0xd8bf8c,transparent:true,opacity:.38}));ring.rotation.x=Math.PI/2;ring.position.y=.015;scene.add(ring);
for(let i=0;i<4;i++){let a=Math.PI*i/2;const mark=new THREE.Mesh(new THREE.SphereGeometry(.019,8,6),new THREE.MeshBasicMaterial({color:0xffdfad}));mark.position.set(1.15*Math.cos(a),.02,1.15*Math.sin(a));scene.add(mark);}
const gltfLoader=new GLTFLoader();let currentRoot=null, active=null, latestUrl=null, objectURL=null, catalog=[], loadingToken=0;
let activeAutoRotate=false;
const isAndroidApp=Boolean(window.Android && typeof window.Android.saveAsset==='function');
const qualitySelect=$('model-quality'),renderSelect=$('render-quality'),qualityStatus=$('quality-status');
const getPref=(key,defaultValue)=>{try{return localStorage.getItem(key)||defaultValue}catch{return defaultValue}};
const setPref=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
qualitySelect.value=getPref('kenneenow-model-quality',isAndroidApp?'studio':'standard');
renderSelect.value=getPref('kenneenow-render-quality',isAndroidApp?'high':'balanced');
let modelQuality=qualitySelect.value,renderQuality=renderSelect.value;
const modelUrl=c=>modelQuality==='studio'&&c.highResModel?c.highResModel:c.model;
const reportQuality=text=>{qualityStatus.textContent=text||('現在のモデル: '+(modelQuality==='studio'?'約238万':'約8万')+'三角形')};
qualitySelect.addEventListener('change',()=>{modelQuality=qualitySelect.value;setPref('kenneenow-model-quality',modelQuality);if(active)loadModel(active)});
renderSelect.addEventListener('change',()=>{renderQuality=renderSelect.value;setPref('kenneenow-render-quality',renderQuality);resize()});
const loading=$('loading');
const studioLink=document.createElement('a');
studioLink.id='studio-download';
studioLink.textContent='✧ 高精細 GLB (約238万三角形) · 42 MB を保存';
studioLink.style.cssText='display:block;margin-top:12px;padding:14px 16px;border:1px solid rgba(218,181,117,.38);border-radius:10px;color:#ebd2a0;font-size:12px;letter-spacing:.04em;text-decoration:none;background:rgba(220,184,130,.06);';
$('download-link').insertAdjacentElement('afterend',studioLink);
for(const anchor of [$('download-link'),studioLink])anchor.addEventListener('click',event=>{
  if(!isAndroidApp)return;
  const u=new URL(anchor.href,location.href);
  if(!u.pathname.startsWith('/models/')||!u.pathname.endsWith('.glb'))return;
  event.preventDefault();
  window.Android.saveAsset(u.pathname,anchor.download||u.pathname.split('/').pop());
});

function setLoading(on,message='星の記録を読み込み中...'){loading.classList.toggle('loaded',!on);$('loading-text').textContent=message;}
const pad=n=>String(n).padStart(3,'0');
function renderList(filter=''){
  const list=$('character-list');list.innerHTML='';let count=0;
  for(const [index,c] of catalog.entries()){
    if(!`${c.name} ${c.nameJa} ${c.title}`.toLowerCase().includes(filter.toLowerCase()))continue;
    count++;
    const button=document.createElement('button');button.type='button';button.className='character-option'+(active?.id===c.id?' active':'');button.setAttribute('role','option');button.setAttribute('aria-selected',String(active?.id===c.id));
    button.innerHTML=`<span class="portrait" aria-hidden="true">✧</span><span class="option-info"><small>${escapeHTML(c.tag||`ORIGINAL · ${pad(index+1)}`)}</small><strong>${escapeHTML(c.name)}</strong><span>${escapeHTML(c.title)}</span></span><span class="option-mark">${active?.id===c.id?'✦':'↗'}</span>`;
    button.addEventListener('click',()=>selectCharacter(c,index));list.append(button);
  }
  if(!count){const d=document.createElement('div');d.className='empty-results';d.textContent='該当するキャラクターがありません。';list.append(d);}
}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function setInfo(c,i){$('character-name').innerHTML=escapeHTML(c.name)+'<span class="name-period">.</span>';
  $('character-title').textContent=c.title||'';$('character-subtitle').textContent=c.subtitle||'3D CHARACTER';
  $('character-quote').textContent=c.quote||'';$('character-description').textContent=c.description||'';
  $('character-element').textContent=c.element||'ORIGINAL';$('character-region').textContent=c.region||'—';
  $('record-number').textContent='NO. '+pad(i+1);$('figure-number').textContent=pad(i+1);
  $('rarity').textContent='✦ '.repeat(c.rarity||5).trim();
  $('download-link').setAttribute('href',c.model);$('download-link').setAttribute('download',c.fileName||`${c.id}.glb`);
  studioLink.hidden=!c.highResModel;studioLink.style.display=c.highResModel?'block':'none';
  if(c.highResModel){studioLink.href=c.highResModel;studioLink.download=c.highResFileName||`${c.id}-studio.glb`;}

  $('counter').textContent=`${String(i+1).padStart(2,'0')} / ${String(catalog.length).padStart(2,'0')}`;
  $('collection-count').textContent=String(catalog.length).padStart(2,'0');document.title=`${c.name} — ASTRAL ARCHIVE`;
}
function disposeRoot(root){root.traverse(obj=>{if(!obj.isMesh)return;obj.geometry?.dispose();for(const m of(Array.isArray(obj.material)?obj.material:[obj.material]))m?.dispose()});scene.remove(root);}
function loadModel(c){let token=++loadingToken;const detailed=modelQuality==='studio'&&!!c.highResModel;
  setLoading(true,detailed?'高精細GLB（約42MB）を読み込み中…':'モデルを読み込み中…');
  reportQuality(detailed?'高精細モデルを読み込み中…':'標準モデルを読み込み中…');
  gltfLoader.load(modelUrl(c),gltf=>{if(token!==loadingToken)return;
    if(currentRoot)disposeRoot(currentRoot);
    const root=gltf.scene;
    const bound=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();bound.getSize(size);bound.getCenter(center);
    const scale=3.10/(size.y||1);root.scale.setScalar(scale);root.position.set(-center.x*scale,-bound.min.y*scale+.08,-center.z*scale);
    root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){let mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.side=THREE.DoubleSide;});}}});
    currentRoot=root;scene.add(root);resetCamera();setLoading(false);reportQuality();
  },undefined,err=>{if(token!==loadingToken)return;console.error(err);if(modelQuality==='studio'&&c.highResModel){modelQuality='standard';qualitySelect.value='standard';setPref('kenneenow-model-quality','standard');loadModel(c)}else{setLoading(true,'モデルを読み込めませんでした。再度お試しください。');reportQuality('モデルを読み込めませんでした')}});
}
function resetCamera(){camera.position.set(0,1.58,6.15);controls.target.set(0,1.58,0);controls.update();}
function selectCharacter(c,index){if(active?.id===c.id)return;active=c;latestUrl=c.model;setInfo(c,index);renderList($('search').value);loadModel(c);}
$('search').addEventListener('input',e=>renderList(e.target.value));
$('reset-view').addEventListener('click',resetCamera);
$('toggle-rotate').addEventListener('click',()=>{activeAutoRotate=!activeAutoRotate;controls.autoRotate=activeAutoRotate;controls.autoRotateSpeed=.7;$('toggle-rotate').classList.toggle('selected',activeAutoRotate);$('toggle-rotate').setAttribute('aria-pressed',String(activeAutoRotate));});
$('capture').addEventListener('click',()=>{renderer.render(scene,camera);const name=(active?.id||'character')+'-preview.png';const image=renderer.domElement.toDataURL('image/png');if(isAndroidApp && typeof window.Android.saveScreenshot==='function'){window.Android.saveScreenshot(image,name)}else{const link=document.createElement('a');link.download=name;link.href=image;link.click()}});
$('import-glb').addEventListener('click',()=>$('file-input').click());
$('file-input').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>250_000_000){alert('250MB以下のGLBを選択してください。');return;}if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);let id='local-'+Date.now();const item={id,name:file.name.replace(/\.glb$/i,'').slice(0,24).toUpperCase(),title:'インポートしたモデル',subtitle:'LOCAL 3D MODEL',quote:'あなたのオリジナルモデルを展示中。',description:'このモデルはブラウザ上でのみ表示されます。サーバーにはアップロードされません。',element:'CUSTOM / GLB',region:'LOCAL FILE',rarity:5,model:objectURL,fileName:file.name,tag:'YOUR COLLECTION'};catalog.push(item);$('search').value='';selectCharacter(item,catalog.length-1);$('file-input').value='';});
try{const response=await fetch('/characters.json',{cache:'no-store'});if(!response.ok)throw Error('characters.json fetch failed');const data=await response.json();catalog=data.characters||[];if(!catalog.length)throw Error('No characters registered');$('collection-count').textContent=String(catalog.length).padStart(2,'0');selectCharacter(catalog[0],0);}catch(err){console.error(err);setLoading(true,'キャラクター一覧を読み込めませんでした。');}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
const desired=renderQuality==='ultra'?Math.min(devicePixelRatio,3):renderQuality==='high'?Math.min(devicePixelRatio,2.25):Math.min(devicePixelRatio,1.35);
const maxPixels=renderQuality==='ultra'?6800000:renderQuality==='high'?4500000:2500000;
renderer.setPixelRatio(Math.max(.75,Math.min(desired,Math.sqrt(maxPixels/(w*h)))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();
let last=0;function animate(t){requestAnimationFrame(animate);controls.update();ring.rotation.z+=.0004;if(currentRoot)currentRoot.rotation.y+=0;renderer.render(scene,camera);last=t;}requestAnimationFrame(animate);