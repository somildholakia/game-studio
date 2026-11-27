# Restricted executable extension SDK v1

This optional local authoring SDK executes a compiled WebAssembly module inside a disposable dedicated worker. It does not run arbitrary JavaScript, WASI, browser APIs, filesystem, network or project/credential reads. The worker receives only two numeric parameters and the module. Output is a bounded command plan, reviewed and applied through the normal validated undoable authoring path. It is not included in exported games.

Manifest JSON: format "game-studio-wasm-tool", version 1, name (1–100 chars), capabilities (add-box and/or add-sphere), module (base64 Wasm binary <=32 KiB). Maximum one module per panel session. Imports must be functions in module "studio": count() -> i32, spacing() -> f64, add_box(x:f64,y:f64,z:f64,sx:f64,sy:f64,sz:f64), add_sphere(same signature). Declare add-box or add-sphere for respective functions. Export only run() -> void. No memory, tables, elements, data, start sections or WASI imports. Coordinates ±10,000, scales 0.01–100, up to 64 emitted commands; count input 1–32 and spacing 0.1–100. No privileged callbacks. Parent terminates the worker after 1.5 seconds or cancellation; errors discard all commands. Imported binary is checked before execution and output is revalidated in the parent. The numeric example module is generated in src/core/wasmToolFixture.ts.

Example WAT:
```wat
(module
  (import "studio" "add_box" (func $add (param f64 f64 f64 f64 f64 f64)))
  (func (export "run")
    f64.const 1
    f64.const 2
    f64.const 3
    f64.const 1
    f64.const 1
    f64.const 1
    call $add))
```

Compile with a trusted local WAT-to-Wasm compiler and base64-encode the resulting bytes into a manifest. Import through Executable extensions. Unit tests exercise real Wasm and forbidden sections/imports. Browser tests exercise worker execution, reviewed apply/undo, forbidden imports and infinite loop termination. Browser engine vulnerabilities and denial of service beyond the worker/time limits require independent security assessment; do not claim unrestricted native plugin isolation.
