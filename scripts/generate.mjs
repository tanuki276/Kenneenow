// Original fantasy-anime character built from parametric meshes; zero binary source dependencies.
import fs from 'node:fs';
import path from 'node:path';
const OUTPUT = path.resolve('public/models/lyra.glb');
const materials = [];
const meshes = [];
const nodes = [];
const pieces = [];
const f = n => Math.round(n*100000)/100000;
const vadd=(a,b)=>a.map((x,i)=>x+b[i]);
const vsub=(a,b)=>a.map((x,i)=>x-b[i]);
const vmul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const unit=a=>{let n=Math.hypot(...a)||1;return a.map(x=>x/n)};
const lerp=(a,b,t)=>a+(b-a)*t;
const p3=(a,b,t)=>a.map((x,i)=>lerp(x,b[i],t));
const rgb=h=>{let c=h.replace('#','');return [0,2,4].map(i=>{let s=parseInt(c.slice(i,i+2),16)/255;return s<=0.04045?s/12.92:((s+.055)/1.055)**2.4});};
function mat(name,hex,metallic=0.04,emissive){const m={name,pbrMetallicRoughness:{baseColorFactor:[...rgb(hex),1],metallicFactor:metallic,roughnessFactor:0.68},doubleSided:true};if(emissive)m.emissiveFactor=rgb(emissive);materials.push(m);return materials.length-1;}
const M={
skin:mat('Porcelain warm skin','#f8d8c8'),blush:mat('Soft blush','#eb9c9e'),hair:mat('Midnight blue hair','#253652'),hair2:mat('Teal hair highlights','#437c93'),hairdeep:mat('Hair shadows','#172641'),
navy:mat('Royal midnight fabric','#202b55'),blue:mat('Cerulean brocade','#31598a'),plum:mat('Violet mantle','#5b4d91'),lilac:mat('Pale lavender silk','#b6a9d8'),cream:mat('Ivory shirt','#fff0dc'),white:mat('Eye white','#fffefa'),
gold:mat('Antique golden trim','#dba85d',0.76),lightgold:mat('Bright gold','#ffe0a0',0.55),purple:mat('Amethyst','#8565b9',0.35),boots:mat('Boot leather','#20243d'),eyes:mat('Iris blue','#3aa7c5'),eyesdark:mat('Iris dark','#174e73'),black:mat('Lashes','#222034'),shine:mat('Eye shine','#ffffff',0,'#ffffff'),star:mat('Starlight crystal','#7dd7ea',0.2,'#37a6ca'),silver:mat('Silver details','#cad7e4',0.6)
};
// Meshes use flat PBR materials; vertex normals generated from triangles.
function add(name, verts, faces, material) {
  const nv=verts.length/3, normals=new Float64Array(verts.length);
  for(let i=0;i<faces.length;i+=3){let a=faces[i]*3,b=faces[i+1]*3,c=faces[i+2]*3;
    let u=[verts[b]-verts[a],verts[b+1]-verts[a+1],verts[b+2]-verts[a+2]];
    let w=[verts[c]-verts[a],verts[c+1]-verts[a+1],verts[c+2]-verts[a+2]];
    let n=cross(u,w);
    for(let j of [a,b,c]){normals[j]+=n[0];normals[j+1]+=n[1];normals[j+2]+=n[2];}
  }
  for(let j=0;j<normals.length;j+=3){const len=Math.hypot(normals[j],normals[j+1],normals[j+2])||1;normals[j]/=len;normals[j+1]/=len;normals[j+2]/=len;}
  pieces.push({name,verts:new Float32Array(verts),normals:new Float32Array(normals),faces:new Uint16Array(faces),material});
}
function ell(name,c,r,m,S=20,R=13){let verts=[],faces=[];
  for(let i=0;i<=R;i++){let t=Math.PI*i/R;for(let j=0;j<=S;j++){let p=Math.PI*2*j/S;verts.push(c[0]+r[0]*Math.sin(t)*Math.cos(p),c[1]+r[1]*Math.cos(t),c[2]+r[2]*Math.sin(t)*Math.sin(p));}}
  for(let i=0;i<R;i++)for(let j=0;j<S;j++){let a=i*(S+1)+j,b=a+S+1;faces.push(a,a+1,b,b,a+1,b+1);}
  add(name,verts,faces,m);
}
// Smooth tapered swept tube between polyline controls, optionally elliptical cross section.
function tube(name,pts,radii,m,S=10){let verts=[],faces=[];
  for(let i=0;i<pts.length;i++){
    let tangent=unit(vsub(pts[Math.min(i+1,pts.length-1)],pts[Math.max(0,i-1)]));
    let A=unit(cross(tangent,[0,0,1]));if(Math.hypot(...A)<0.1)A=[1,0,0];
    let B=unit(cross(A,tangent));
    let r=Array.isArray(radii[i])?radii[i]:[radii[i],radii[i]];
    for(let j=0;j<S;j++){let a=j*2*Math.PI/S;verts.push(...vadd(pts[i],vadd(vmul(A,Math.cos(a)*r[0]),vmul(B,Math.sin(a)*r[1]))));}
  }
  for(let i=0;i<pts.length-1;i++)for(let j=0;j<S;j++){let a=i*S+j,b=i*S+(j+1)%S,c=(i+1)*S+j,d=(i+1)*S+(j+1)%S;faces.push(a,c,b,b,c,d);}
  let first=verts.length/3;verts.push(...pts[0]);let last=verts.length/3;verts.push(...pts.at(-1));
  for(let j=0;j<S;j++){faces.push(first,(j+1)%S,j);faces.push(last,(pts.length-1)*S+j,(pts.length-1)*S+(j+1)%S);}
  add(name,verts,faces,m);
}
function curve(name,pts,r,m){tube(name,pts,pts.map(()=>r),m,7);}
// Layered tapered fabric with wavy hems.
function skirt(name,start,end,top,bottom,upper,lower,material,depth=0){let V=[],F=[],S=12,R=6;
  for(let i=0;i<=R;i++){let t=i/R;let rr=lerp(upper,lower,t);let yy=lerp(top,bottom,t);
    for(let j=0;j<=S;j++){let a=lerp(start,end,j/S),wave=.035*Math.cos(a*5+depth)*t*t;V.push((rr+wave)*Math.sin(a),yy+.033*t*Math.sin(a*3+depth),depth+(rr+wave)*Math.cos(a));}}
  for(let i=0;i<R;i++)for(let j=0;j<S;j++){let a=i*(S+1)+j,b=a+S+1;F.push(a,b,a+1,a+1,b,b+1);}
  add(name,V,F,material);
  // Braid on the outside hem
  let edge=[];for(let j=0;j<=S;j++){let a=lerp(start,end,j/S);let rr=lower+.035*Math.cos(a*5+depth);edge.push([rr*Math.sin(a),bottom+.033*Math.sin(a*3+depth),depth+rr*Math.cos(a)+.006]);}
  curve(name+' hem',edge,.009,M.gold);
}
function ribbon(name,pts,widths,material){let V=[],F=[];
  for(let i=0;i<pts.length;i++){let pr=pts[Math.max(0,i-1)],nx=pts[Math.min(pts.length-1,i+1)],t=unit(vsub(nx,pr));let s=unit([-t[1],t[0],0]);V.push(...vadd(pts[i],vmul(s,widths[i]/2)),...vsub(pts[i],vmul(s,widths[i]/2)));}
  for(let i=0;i<pts.length-1;i++){let a=i*2;F.push(a,a+1,a+2,a+1,a+3,a+2);}
  add(name,V,F,material);
}
function star(name,c,outer,inner,m,points=5){let V=[...c],F=[];
  for(let i=0;i<points*2;i++){let a=Math.PI/2+i*Math.PI/points,r=i%2?inner:outer;V.push(c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[2]);}
  for(let i=0;i<points*2;i++)F.push(0,i+1,(i+1)%(points*2)+1);
  add(name,V,F,m);
}
// Legs, embroidered stockings, leather heels and gold ankle bands.
for(let s of [-1,1]){
  let x=s*.135;
  tube('Silk stocking '+s,[[x,1.19,-.005],[x,1.01,0],[x+s*.012,.70,.016],[x+s*.025,.35,.005]],[[.092,.086],[.075,.074],[.064,.067],[.063,.065]],M.navy,16);
  tube('Tall boot '+s,[[x+s*.025,.47,.012],[x+s*.025,.25,.025],[x+s*.02,.105,.018]],[[.079,.076],[.073,.082],[.076,.083]],M.boots,16);
  ell('Boot toe '+s,[x+s*.017,.093,.104],[.098,.074,.178],M.boots);
  tube('Boot top filigree '+s,[[x+s*.025,.46,.012],[x+s*.025,.437,.012]],[[.081,.08],[.082,.08]],M.gold,16);
  for(let h of [.28,.34])ell('Boot gemstone '+s+' '+h,[x+s*.025,h,.106],[.019,.025,.009],M.gold,12,8);
  curve('Stocking ornament '+s,[[x,1.09,.09],[x+s*.022,.97,.088],[x+s*.015,.83,.09]],.009,M.lightgold);
}
// Body, structured jacket and layered skirt. Front points toward +Z.
ell('Hips',[0,1.22,.003],[.255,.173,.174],M.navy);
for(let i=0;i<8;i++){let a=-Math.PI+2*Math.PI*i/8;skirt('Deep indigo skirt panel '+i,a,a+Math.PI/4,1.36,.90,.17,.43,i%2?M.blue:M.navy,-.015);}
for(let i=0;i<5;i++){let a=-1.45+i*.60;skirt('Lavender underskirt '+i,a,a+.62,1.31,.81,.17,.39,M.lilac,.012);}
for(let i=0;i<4;i++){let a=-1.35+i*.9;skirt('Front split embroidered petal '+i,a,a+.73,1.36,.98,.185,.42,i%2?M.plum:M.blue,.040);}
for(let i=0;i<5;i++){let a=-1.4+i*.7;star('Skirt hem constellation '+i,[.38*Math.sin(a),.95,.40*Math.cos(a)+.07],.026,.012,M.lightgold);}
tube('Bodice dark royal jacket',[[0,1.34,0],[0,1.44,0],[0,1.68,-.017],[0,1.83,-.018]],[[.193,.135],[.182,.13],[.235,.151],[.265,.16]],M.navy,22);
ell('Cream blouse inset',[0,1.617,.156],[.128,.228,.037],M.cream,18,12);
for(let s of [-1,1]){
  ribbon('V-shaped jacket lapel '+s,[[s*.04,1.824,.18],[s*.155,1.73,.177],[s*.115,1.51,.16]],[.055,.075,.034],M.blue);
  ribbon('Lapel golden edging '+s,[[s*.054,1.821,.214],[s*.167,1.721,.209],[s*.129,1.525,.194]],[.012,.012,.009],M.gold);
  ell('Shoulder puff '+s,[s*.279,1.765,-.018],[.17,.125,.160],M.plum);
  tube('Upper arm '+s,[[s*.31,1.735,0],[s*.425,1.57,.018],[s*.50,1.415,.052]],[[.122,.128],[.112,.116],[.103,.117]],M.blue,14);
  tube('Flared sleeve '+s,[[s*.49,1.48,.047],[s*.56,1.36,.078],[s*.62,1.28,.11]],[[.096,.115],[.115,.128],[.142,.137]],M.lilac,14);
  tube('Gold sleeve rim '+s,[[s*.612,1.289,.106],[s*.635,1.269,.116]],[[.145,.139],[.144,.139]],M.gold,14);
  tube('Wrist skin '+s,[[s*.626,1.264,.115],[s*.65,1.18,.139]],[[.053,.05],[.048,.048]],M.skin,12);
  ell('Hand '+s,[s*.657,1.137,.153],[.052,.093,.041],M.skin,12,9);
  for(let k=0;k<3;k++)curve('Shoulder trim '+s+' '+k,[[s*(.21+k*.031),1.843,-.005],[s*(.31+k*.036),1.825,.088],[s*(.352+k*.035),1.758,.113]],.007,M.gold);
}
tube('Gilded waist belt',[[0,1.328,.012],[0,1.37,.012]],[[.202,.167],[.203,.167]],M.gold,22);
ell('Waist blue enamel',[0,1.352,.178],[.089,.059,.025],M.blue);
star('Belt star',[0,1.356,.21],.049,.022,M.lightgold);
// Neck, collar, neck brooch and tie.
tube('Neck',[[0,1.876,.011],[0,2.037,.011]],[[.085,.085],[.08,.08]],M.skin,16);
for(let s of [-1,1])ribbon('Wing collar '+s,[[s*.02,1.86,.16],[s*.135,1.935,.13],[s*.083,1.988,.075]],[.065,.084,.052],M.cream);
star('Throat crystal',[0,1.842,.206],.053,.022,M.star);
ribbon('Long trailing tie',[[0,1.831,.209],[.038,1.68,.224],[0,1.56,.229]],[.056,.043,.003],M.lilac);
// Back cape swishes behind the body.
for(let i=0;i<4;i++){let a=2.2+i*.60;skirt('Trailing cape '+i,a,a+.58,1.78,1.14,.20,.55,i%2?M.navy:M.plum,-.19);}
// Anime head and large two-tone swept hair.
ell('Face',[0,2.265,.055],[.28,.312,.257],M.skin,28,20);
ell('Back hair volume',[0,2.34,-.115],[.326,.349,.295],M.hair,30,20);
ell('Crown cap',[0,2.515,-.008],[.316,.154,.242],M.hairdeep,24,13);
for(let s of [-1,1]){
  // Ear peeks under locks.
  ell('Ear '+s,[s*.28,2.24,.075],[.053,.083,.033],M.skin,12,9);
  ell('Rosy cheek '+s,[s*.155,2.168,.292],[.078,.035,.014],M.blush,12,8);
  ell('Eye white '+s,[s*.117,2.278,.293],[.074,.091,.025],M.white,18,12);
  ell('Blue iris '+s,[s*.119,2.269,.318],[.049,.071,.012],M.eyes,16,11);
  ell('Inner pupil '+s,[s*.119,2.267,.330],[.026,.055,.008],M.eyesdark,16,10);
  ell('Large sparkle '+s,[s*.107,2.308,.338],[.017,.022,.007],M.shine,12,8);
  ell('Tiny sparkle '+s,[s*.138,2.250,.337],[.008,.01,.005],M.shine,9,6);
  curve('Eyelash upper '+s,[[s*.045,2.319,.300],[s*.100,2.358,.306],[s*.168,2.350,.295],[s*.191,2.323,.272]],.014,M.black);
  curve('Outer lash wing '+s,[[s*.172,2.341,.286],[s*.218,2.370,.263]],.010,M.black);
  curve('Soft brow '+s,[[s*.062,2.400,.264],[s*.135,2.41,.259],[s*.188,2.390,.243]],.008,M.hairdeep);
  // Side locks formed by pointed sculpted strand segments.
  tube('Deep cascading side hair '+s,[[s*.261,2.486,-.005],[s*.322,2.32,-.024],[s*.354,2.09,-.025],[s*.334,1.865,-.018],[s*.380,1.66,-.045]],[[.117,.114],[.105,.116],[.095,.10],[.067,.083],[.008,.012]],M.hair,12);
  tube('Cerulean side hair sheen '+s,[[s*.306,2.453,.076],[s*.370,2.24,.047],[s*.399,2.03,.031],[s*.385,1.80,.025]],[[.039,.034],[.038,.034],[.035,.032],[.003,.005]],M.hair2,9);
  tube('Long flowing back lock '+s,[[s*.17,2.47,-.292],[s*.227,2.17,-.32],[s*.245,1.82,-.33],[s*.21,1.47,-.35],[s*.29,1.27,-.35]],[[.11,.11],[.145,.12],[.118,.12],[.075,.10],[.008,.015]],M.hair,12);
  tube('Back lock stripe '+s,[[s*.17,2.33,-.418],[s*.231,2.03,-.428],[s*.22,1.69,-.441],[s*.257,1.39,-.449]],[[.024,.02],[.032,.025],[.025,.02],[.003,.006]],M.hair2,8);
}
// Layered long back braids for depth and movement.
for(let i=0;i<5;i++){let x=(i-2)*.092; tube('Five flowing hair strands '+i,[[x*.72,2.47,-.28],[x,2.18,-.335],[x*1.14,1.85,-.351],[x*1.05+.045*Math.sin(i),1.49,-.35],[x*.92,1.12,-.34]],[[.084,.074],[.095,.08],[.079,.071],[.047,.051],[.003,.006]],i%2?M.hair:M.hairdeep,10);}
// Asymmetric sweeping fringe; hair tapers into stylized triangular ends.
const bangs=[[-.245,2.48,-.23,2.32],[-.175,2.535,-.115,2.386],[-.066,2.553,-.020,2.345],[.065,2.542,.092,2.392],[.190,2.51,.204,2.34],[.263,2.47,.245,2.39]];
for(let i=0;i<bangs.length;i++){let [x,y,ex,ey]=bangs[i];tube('Indigo angular bang '+i,[[x,y,.182],[lerp(x,ex,.58),lerp(y,ey,.43),.259],[ex,ey,.282]],[[.102,.058],[.079,.039],[.005,.004]],i%3===0?M.hair2:M.hair,10);}
// Delicate face details (glasses-free, simple illustration-like smile).
ell('Nose',[0,2.210,.316],[.014,.020,.012],M.skin,10,8);
curve('Tiny smile',[[-.031,2.137,.291],[0,2.128,.305],[.031,2.139,.290]],.006,M.blush);
// Hair ornament crescent arc and star earrings.
for(let s of [-1,1]){
  curve('Diadem chain '+s,[[s*.018,2.599,.164],[s*.153,2.582,.150],[s*.26,2.508,.093]],.013,M.gold);
  star('Ear jewel '+s,[s*.300,2.211,.101],.041,.018,M.star);
  curve('Earring chain '+s,[[s*.302,2.177,.112],[s*.306,2.102,.119]],.007,M.gold);
  ell('Earring teardrop '+s,[s*.307,2.084,.12],[.020,.038,.012],M.star,10,8);
}
star('Crown star',[.113,2.663,.116],.105,.042,M.lightgold,6);
ell('Crown gem',[.113,2.663,.142],[.029,.043,.012],M.star);
// Shoulder star constellation decorations and glowing talisman at waist.
for(let s of [-1,1]){
  star('Shoulder gem '+s,[s*.32,1.84,.12],.061,.026,M.gold);
  ell('Shoulder heart '+s,[s*.32,1.84,.132],[.021,.023,.01],M.star);
}
curve('Sash across skirt',[[-.19,1.377,.18],[-.04,1.312,.26],[.23,1.25,.242]],.022,M.lightgold);
star('Sash pendant',[.22,1.22,.249],.088,.034,M.star);
for(let i=0;i<3;i++){let x=.22+i*.045;curve('Dangling constellation '+i,[[x,1.18,.25],[x+.01,1.038-i*.025,.248]],.005,M.gold);star('Hanging star '+i,[x+.01,1.045-i*.026,.26],.028,.012,M.lightgold);}
// Astral familiar orbit: understated jewels, does not obstruct the face.
for(let i=0;i<12;i++){let a=2*Math.PI*i/12,r=.64;let pos=[r*Math.cos(a),2.20+r*.82*Math.sin(a),-.46];if(i%3===0)star('Floating constellation '+i,pos,.039,.019,M.star);else ell('Tiny astral mote '+i,pos,[.012,.012,.012],M.star,9,6);}
// Pack GLB with accessor ranges and PBR materials.
const chunks=[], views=[], accessors=[];let offset=0;
function push(data,target){let buffer=Buffer.from(data.buffer,data.byteOffset,data.byteLength);let padding=(4-buffer.length%4)%4;let view={buffer:0,byteOffset:offset,byteLength:buffer.length,target};views.push(view);chunks.push(buffer);offset+=buffer.length;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}return views.length-1;}
function accessor(data,type,componentType,target,withExtrema=false){let view=push(data,target);let a={bufferView:view,componentType,count:data.length/(type==='VEC3'?3:1),type};if(withExtrema){let mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=3)for(let j=0;j<3;j++){mn[j]=Math.min(mn[j],data[i+j]);mx[j]=Math.max(mx[j],data[i+j]);}a.min=mn;a.max=mx;}accessors.push(a);return accessors.length-1;}
for(let p of pieces){let pos=accessor(p.verts,'VEC3',5126,34962,true),nor=accessor(p.normals,'VEC3',5126,34962),ind=accessor(p.faces,'SCALAR',5123,34963);meshes.push({name:p.name,primitives:[{attributes:{POSITION:pos,NORMAL:nor},indices:ind,material:p.material,mode:4}]});nodes.push({name:p.name,mesh:meshes.length-1});}
const bin=Buffer.concat(chunks);const doc={asset:{version:'2.0',generator:'Kenneenow Original Fantasy Character Studio'},scene:0,scenes:[{name:'Lyra • Astral Weaver',nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,buffers:[{byteLength:bin.length}],bufferViews:views,accessors,extras:{character:'Lyra',license:'Original character concept',style:'Fantasy anime inspired',rigged:false}};
let jbuf=Buffer.from(JSON.stringify(doc),'utf8');jbuf=Buffer.concat([jbuf,Buffer.alloc((4-jbuf.length%4)%4,0x20)]);
const head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+jbuf.length+8+bin.length,8);jh.writeUInt32LE(jbuf.length);jh.write('JSON',4);bh.writeUInt32LE(bin.length);bh.write('BIN\0',4);
fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});fs.writeFileSync(OUTPUT,Buffer.concat([head,jh,jbuf,bh,bin]));
console.log(`Generated ${OUTPUT}: ${(fs.statSync(OUTPUT).size/1024).toFixed(1)}KiB, ${pieces.length} mesh parts, ${pieces.reduce((n,p)=>n+p.faces.length/3,0)} triangles`);