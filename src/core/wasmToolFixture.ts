import type {WasmTool} from './wasmTools';
// Tiny reproducible ABI example, built directly as Wasm binary sections.
// (module (import "studio" "add_box" (func $add (param f64 f64 f64 f64 f64 f64)))
// (func (export "run") f64.const 1 f64.const 2 f64.const 3 f64.const 1 f64.const 1 f64.const 1 call $add))
const name=(s:string)=>[s.length,...Array.from(s,c=>c.charCodeAt(0))];
const section=(id:number,data:number[])=>[id,data.length,...data];
const f64=(v:number)=>{const a=new Uint8Array(8);new DataView(a.buffer).setFloat64(0,v,true);return [0x44,...a];};
const header=[0,97,115,109,1,0,0,0];
export function sampleModule(importName='add_box'):Uint8Array<ArrayBuffer>{
 const body=[0,...[1,2,3,1,1,1].flatMap(f64),0x10,0,0x0b];
 return Uint8Array.from([...header,...section(1,[2,0x60,6,0x7c,0x7c,0x7c,0x7c,0x7c,0x7c,0,0x60,0,0]),...section(2,[1,...name('studio'),...name(importName),0,0]),...section(3,[1,1]),...section(7,[1,...name('run'),0,1]),...section(10,[1,body.length,...body])]);
}
export function infiniteModule():Uint8Array<ArrayBuffer>{return Uint8Array.from([...header,...section(1,[1,0x60,0,0]),...section(3,[1,0]),...section(7,[1,...name('run'),0,0]),...section(10,[1,7,0,0x03,0x40,0x0c,0,0x0b,0x0b])]);}
export function fixtureTool(bytes=sampleModule()):WasmTool{return {format:'game-studio-wasm-tool',version:1,name:'Executable box builder',capabilities:['add-box'],module:btoa(String.fromCharCode(...bytes))};}
