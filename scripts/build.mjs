import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/generate.mjs'], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('GLB generation failed: '+result.status);
fs.rmSync('dist', {recursive:true,force:true});
fs.mkdirSync('dist/models', {recursive:true});
for (const name of ['index.html','styles.css','app.js','characters.json','favicon.svg']) {
  fs.copyFileSync(name,path.join('dist',name));
}
for (const name of fs.readdirSync('public/models')) {
  if (name.toLowerCase().endsWith('.glb')) {
    fs.copyFileSync(path.join('public/models',name),path.join('dist/models',name));
  }
}
console.log('Built ASTRAL ARCHIVE static GLB gallery in dist/');
