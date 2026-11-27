import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const allowed=new Set(['MIT','Apache-2.0','ISC','BSD-3-Clause','BSD-2-Clause','0BSD']);
if(!lock.packages||lock.lockfileVersion!==3)throw Error('Expected npm v3 lockfile');
const entries=Object.entries(lock.packages).filter(([path])=>path).map(([path,p])=>({path,version:p.version,license:p.license??'UNKNOWN',dev:!!p.dev,integrity:typeof p.integrity==='string'&&/^sha512-[A-Za-z0-9+/=]+$/.test(p.integrity),registry:typeof p.resolved==='string'&&p.resolved.startsWith('https://registry.npmjs.org/')}));
const findings=entries.filter(e=>!allowed.has(e.license)||!e.integrity||!e.registry);
mkdirSync('reports',{recursive:true});writeFileSync('reports/dependency-review.json',JSON.stringify({version:1,packages:entries,findings},null,2)+'\n');
console.log(JSON.stringify({packages:entries.length,findings:findings.length,licenses:[...new Set(entries.map(e=>e.license))]}));
if(findings.length){console.error(findings.map(e=>e.path+': '+e.license+' integrity='+e.integrity+' registry='+e.registry).join('\n'));process.exitCode=1;}
