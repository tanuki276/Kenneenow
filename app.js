import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id);
const canvas=$('scene');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.6;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,100);
camera.position.set(0,1.5,6.0);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=2.7;controls.maxDistance=9;controls.minPolarAngle=.33;controls.maxPolarAngle=Math.PI-.12;
controls.target.set(0,1.42,0);controls.update();
scene.add(new THREE.HemisphereLight(0xdfeeff,0x4c4c76,3.5));
const key=new THREE.DirectionalLight(0xffe2bb,4.0);key.position.set(3,6,5);scene.add(key);
const fill=new THREE.DirectionalLight(0x8fb9f8,3.0);fill.position.set(-4,4,-2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xbba9f7,3.0);rim.position.set(1,2,-4);scene.add(rim);
const ground=new THREE.Mesh(new THREE.CircleGeometry(1.6,90),new THREE.MeshBasicMaterial({color:0x7291bf,transparent:true,opacity:.065,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-.035;scene.add(ground);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.007,8,110),new THREE.MeshBasicMaterial({color:0xd8bf8c,transparent:true,opacity:.38}));ring.rotation.x=Math.PI/2;ring.position.y=.015;scene.add(ring);
for(let i=0;i<4;i++){let a=Math.PI*i/2;const mark=new THREE.Mesh(new THREE.SphereGeometry(.019,8,6),new THREE.MeshBasicMaterial({color:0xffdfad}));mark.position.set(1.15*Math.cos(a),.02,1.15*Math.sin(a));scene.add(mark);}
const gltfLoader=new GLTFLoader();let currentRoot=null, active=null, latestUrl=null, objectURL=null, catalog=[], loadingToken=0;
let activeAutoRotate=false;
const loading=$('loading');
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
  $('counter').textContent=`${String(i+1).padStart(2,'0')} / ${String(catalog.length).padStart(2,'0')}`;
  $('collection-count').textContent=String(catalog.length).padStart(2,'0');document.title=`${c.name} — ASTRAL ARCHIVE`;
}
function disposeRoot(root){root.traverse(obj=>{if(!obj.isMesh)return;obj.geometry?.dispose();for(const m of(Array.isArray(obj.material)?obj.material:[obj.material]))m?.dispose()});scene.remove(root);}
function loadModel(c){let token=++loadingToken;setLoading(true);
  gltfLoader.load(c.model,gltf=>{if(token!==loadingToken)return;
    if(currentRoot)disposeRoot(currentRoot);
    const root=gltf.scene;
    const bound=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();bound.getSize(size);bound.getCenter(center);
    const scale=3.10/(size.y||1);root.scale.setScalar(scale);root.position.set(-center.x*scale,-bound.min.y*scale+.08,-center.z*scale);
    root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){let mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.side=THREE.DoubleSide;});}}});
    currentRoot=root;scene.add(root);resetCamera();setLoading(false);
  },undefined,err=>{if(token!==loadingToken)return;console.error(err);setLoading(true,'モデルを読み込めませんでした。再度お試しください。')});
}
function resetCamera(){camera.position.set(0,1.58,6.15);controls.target.set(0,1.58,0);controls.update();}
function selectCharacter(c,index){if(active?.id===c.id)return;active=c;latestUrl=c.model;setInfo(c,index);renderList($('search').value);loadModel(c);}
$('search').addEventListener('input',e=>renderList(e.target.value));
$('reset-view').addEventListener('click',resetCamera);
$('toggle-rotate').addEventListener('click',()=>{activeAutoRotate=!activeAutoRotate;controls.autoRotate=activeAutoRotate;controls.autoRotateSpeed=.7;$('toggle-rotate').classList.toggle('selected',activeAutoRotate);$('toggle-rotate').setAttribute('aria-pressed',String(activeAutoRotate));});
$('capture').addEventListener('click',()=>{renderer.render(scene,camera);const link=document.createElement('a');link.download=(active?.id||'character')+'-preview.png';link.href=renderer.domElement.toDataURL('image/png');link.click();});
$('import-glb').addEventListener('click',()=>$('file-input').click());
$('file-input').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>60_000_000){alert('60MB以下のGLBを選択してください。');return;}if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);let id='local-'+Date.now();const item={id,name:file.name.replace(/\.glb$/i,'').slice(0,24).toUpperCase(),title:'インポートしたモデル',subtitle:'LOCAL 3D MODEL',quote:'あなたのオリジナルモデルを展示中。',description:'このモデルはブラウザ上でのみ表示されます。サーバーにはアップロードされません。',element:'CUSTOM / GLB',region:'LOCAL FILE',rarity:5,model:objectURL,fileName:file.name,tag:'YOUR COLLECTION'};catalog.push(item);$('search').value='';selectCharacter(item,catalog.length-1);$('file-input').value='';});
try{const response=await fetch('/characters.json',{cache:'no-store'});if(!response.ok)throw Error('characters.json fetch failed');const data=await response.json();catalog=data.characters||[];if(!catalog.length)throw Error('No characters registered');$('collection-count').textContent=String(catalog.length).padStart(2,'0');selectCharacter(catalog[0],0);}catch(err){console.error(err);setLoading(true,'キャラクター一覧を読み込めませんでした。');}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);resize();
let last=0;function animate(t){requestAnimationFrame(animate);controls.update();ring.rotation.z+=.0004;if(currentRoot)currentRoot.rotation.y+=0;renderer.render(scene,camera);last=t;}requestAnimationFrame(animate);