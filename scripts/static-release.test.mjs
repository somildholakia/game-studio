import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {writeManifest,verifyManifest,buildManifest} from './static-release.mjs';
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'studio-release-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'assets'));writeFileSync(join(root,'index.html'),'<script src="/assets/app.js"></script>');writeFileSync(join(root,'assets/app.js'),'console.log(1)');
 return root;
}
test('manifest is deterministic, sorted and checks exact bytes',t=>{
 const root=fixture(t),first=writeManifest(root,'a'.repeat(40));assert.deepEqual(verifyManifest(root),first);assert.deepEqual(buildManifest(root,first.revision),first);
 assert.deepEqual(first.files.map(f=>f.path),['assets/app.js','index.html']);
 writeFileSync(join(root,'assets/app.js'),'console.log(2)');assert.throws(()=>verifyManifest(root),/do not match/);
});
test('rejects unexpected files, missing files, symlinks and invalid revisions',t=>{
 const root=fixture(t);assert.throws(()=>buildManifest(root,'bad'),/revision/);writeManifest(root,'local');
 writeFileSync(join(root,'extra.txt'),'x');assert.throws(()=>verifyManifest(root),/do not match/);rmSync(join(root,'extra.txt'));
 symlinkSync('index.html',join(root,'link'));assert.throws(()=>verifyManifest(root),/non-regular/);rmSync(join(root,'link'));rmSync(join(root,'assets/app.js'));assert.throws(()=>verifyManifest(root),/Missing/);
});
