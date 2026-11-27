# Architecture and release gates

## Product
Manual-first browser authoring with beginner and expert workflows. Benchmark Unreal, Unity, Blender, PlayCanvas, GDevelop, Spline and Rosebud. Current implementation is an experimental scene editor with a separate browser game runtime, multi-level export and bounded authoring tools. The modules and milestones below describe the target architecture; not all capabilities are implemented.

## Modules
- Core: versioned scene schema, command history, migrations and stable IDs.
- Engine: Babylon renderer adapter; initial WebGL, feature-detected WebGPU later.
- Asset pipeline: bounded embedded GLBs and local texture/audio validation, reusable prefabs, IndexedDB, hosted content-addressed compressed GLB chunks and on-demand level/dependency loading; OPFS, production-scale CDN and general asset graph remain planned.
- Runtime: separate simulation, physics adapter, input, audio, visual-event interpreter and isolated scripts.
- Studios: mesh editing, character rigging, animation, materials, terrain, UI, audio and cinematics.
- AI: provider adapters, credential isolation, bounded schema-validated command plans, explicit review and undo. No arbitrary code in privileged editor. Offline deterministic recipe generation uses the same reviewed plan interface; live provider quality still requires opt-in evaluation. Do not persist keys in localStorage or project files.
- Plugins: initial declarative creator-tool manifests and typed parameters, explicit command capabilities and validated preview/apply. A bounded capability-only numeric Wasm worker is implemented; unrestricted executable plugins and production marketplace security remain open.
- Multiplayer: local-development presence room prototype with bounded membership, per-member tokens and level identity; authoritative synchronized gameplay, matchmaking and public transport remain future work.
- Cloud: tenant-scoped metadata in PostgreSQL, object storage and signed upload URLs, CDN, quota controls, optional Yjs collaboration. GitHub App least-privilege access and large asset strategy.
- Export: standalone offline web runtime and extracted static hosted website ZIP with lazy compressed level/model chunks; automated public hosting, native builds and cloud service integration remain separate.

## Milestones
1. Editor foundation: scene manipulation, picking, project import/export, undo, tests.
2. Playable vertical slice: player controller, collisions, event logic, play/stop, standalone web export.
3. Asset workflow: GLB import, prefab instances, materials, autosave, asset validation.
4. Model and character studio: mesh operations, skinning, animation retargeting.
5. AI and plugins: security reviewed provider and extension contracts.
6. Collaboration, deployment, observability, scale and recovery drills.

## Release gates
Reproducible lockfile, CI typecheck/test/build, browser E2E coverage, import fuzzing, CSP, accessibility, dependency/license audit, GPU/device benchmarks, memory budgets, crash recovery, tenant isolation, backup restore and measured load tests. Million-user capacity is a target, not a verified property. Measure active users, concurrency, storage and bandwidth separately.

## Operational boundary
The local gateway telemetry stores fixed-route counters and a bounded latency window, without request data. See [operations](operations.md) for future production monitoring, incident handling, load tests and durability targets. These are not deployed production services.


## Subsequent reference service modules
- Runtime: dynamic-body swept contact transfers mass-weighted normal impulse; full angular/contact solver remains open.
- Multiplayer: separate bounded /api/race development transport drives the same validated simulation under a server-owned fixed tick; common snapshots and replay-resistant movement input, independent per-racer lane state. Existing presence transport remains distinct. Shared authoritative world, prediction/reconciliation, public identity and matchmaking are still open.
- Cloud: [private backup service](backup-service.md) is a single-process filesystem adapter and scoped bearer-token reference API, not deployed object storage or production end-user authentication. The PostgreSQL/object storage, identity, encryption and off-site restore targets remain unchanged.


## Shared gameplay and cloud continuation
- Shared race mode: server-owned movement/collectibles/result, host-controlled lobby, temporary canonical level on join, actual 3D client input and state presentation; intentionally static courses and noncolliding players only. General shared rigid bodies, arbitrary rule state, interpolation/prediction, matchmaking and public transport remain open.
- Cloud adapter: content-addressed immutable bytes and per-tenant generation-CAS index on Google Cloud Storage JSON API, verified separate-store copy and restore, private service wiring with pinned refreshing RS256 signing keys. Cloud configuration, provisioned buckets, workload identity, public service integration, user login and disaster-recovery acceptance remain open.
- Responsive editor: compact full-width viewport and scrollable authoring panes, emulated-browser regression; physical-device and assistive-technology evidence remains open.
