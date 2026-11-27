import type {HostedFile} from './hostedCampaign';
// Store-mode ZIP: level payloads are already gzip-compressed. No third-party archive parser.
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function zipHostedFiles(files:readonly HostedFile[]):Blob{
 if(!files.length||files.length>64)throw Error('Invalid hosted file count');
 const parts:BlobPart[]=[],directory:Uint8Array<ArrayBuffer>[]=[],seen=new Set<string>();let offset=0,centralSize=0;
 for(const f of files){
  if(!/^(?:index\.html|player\.js|levels\/\d{2}\.gstudio)$/.test(f.path)||seen.has(f.path))throw Error('Invalid hosted file path');seen.add(f.path);
  const name=new TextEncoder().encode(f.path),size=f.bytes.length,crc=crc32(f.bytes);if(offset+size>96_000_000)throw Error('Hosted archive exceeds size budget');
  const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(12,33,true);lv.setUint32(14,crc,true);lv.setUint32(18,size,true);lv.setUint32(22,size,true);lv.setUint16(26,name.length,true);local.set(name,30);
  const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,size,true);cv.setUint32(24,size,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);
  parts.push(local,f.bytes);directory.push(central);centralSize+=central.length;offset+=local.length+size;
 }
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
