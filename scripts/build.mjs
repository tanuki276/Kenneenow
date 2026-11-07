import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
const packed=fs.readFileSync('scripts/lyra-enhancer.gz.b64','utf8').trim();
const temp='scripts/.enhance-runner.mjs';
fs.writeFileSync(temp,zlib.gunzipSync(Buffer.from(packed,'base64')));
try { const result=spawnSync(process.execPath,[temp],{stdio:'inherit'});if(result.status!==0)throw Error('GLB generation failed: '+result.status); }
finally { fs.rmSync(temp,{force:true}); }
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist/models',{recursive:true});
for(const file of ['index.html','styles.css','app.js','characters.json','favicon.svg'])fs.copyFileSync(file,path.join('dist',file));
for(const file of fs.readdirSync('public/models'))if(file.endsWith('.glb'))fs.copyFileSync(path.join('public/models',file),path.join('dist/models',file));
console.log('Built ASTRAL ARCHIVE with mobile and studio quality GLBs.');
