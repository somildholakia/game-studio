# Reference performance budgets

These reproducible checks measure the current bounded implementation, not parity with desktop engines or real hardware/mobile certification.

| Profile | Workload | Regression threshold |
|---|---|---|
| Complex model CPU | 1,986 vertices, 3,968 triangles; validate, smooth normals, UVs, GLB export and validation | p95 <300 ms, 12 samples |
| Runtime CPU | 1,024 static, 16 dynamic bodies, 32 collectible triggers; compiled world at 60 Hz input | p95 <16.7 ms, 180 samples after warmup |
| Software browser | Eight near-quota meshes (31,744 triangles, 95,232 expanded corner vertices), full-resolution 1280x800 and compact 430x800 at half resolution | p95 RAF interval <500 ms, 30 samples each |
| Local room transport | 32 rooms, 256 clients, 2,048 real HTTP updates | p95 <3 seconds, zero incorrect updates |

Run npm test and npm run build, then npm run test:e2e. CI logs contain JSON reports. Browser metrics are deliberately generous smoke/regression budgets for software WebGL, not acceptable production frame rate targets. RAF intervals are not a GPU-only timing measurement. Run node scripts/room-load.mjs reports/room-load.json for a separate room transport report.

## Physical-device acceptance still required
On an explicitly recorded desktop and low/mid-tier mobile device, record OS/browser/GPU/driver, screen resolution, render scale, memory, thermal state and sustained frame/simulation times for a reproducible five-minute playtest. Proposed targets are desktop p95 <= 33 ms and mobile p95 <= 50 ms, simulation p95 <= 8 ms, no crashes, no unbounded memory growth, and usable touch authoring. Measure before raising supported scene budgets. Do not claim these targets are met from software-browser CI. Profile CPU/GPU separately and repeat after upgrades.
