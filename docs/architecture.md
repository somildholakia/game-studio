# Architecture and release gates

## Product
Manual-first browser authoring with beginner and expert workflows. Benchmark Unreal, Unity, Blender, PlayCanvas, GDevelop, Spline and Rosebud. Current implementation is an experimental scene editor with a separate browser game runtime, multi-level export and bounded authoring tools. The modules and milestones below describe the target architecture; not all capabilities are implemented.

## Modules
- Core: versioned scene schema, command history, migrations and stable IDs.
- Engine: Babylon renderer adapter; initial WebGL, feature-detected WebGPU later.
- Asset pipeline: content-addressed GLB/textures, workers, dependency graph, reusable prefabs, OPFS and IndexedDB.
- Runtime: separate simulation, physics adapter, input, audio, visual-event interpreter and isolated scripts.
- Studios: mesh editing, character rigging, animation, materials, terrain, UI, audio and cinematics.
- AI: provider adapters, credential isolation, bounded schema-validated command plans, explicit review and undo. No arbitrary code in privileged editor. Do not persist keys in localStorage or project files.
- Plugins: initial declarative creator-tool manifests and typed parameters, explicit command capabilities and validated preview/apply. Executable plugins still require sandboxed workers/iframes and message validation.
- Multiplayer: local-development presence room prototype with bounded membership, per-member tokens and level identity; authoritative synchronized gameplay, matchmaking and public transport remain future work.
- Cloud: tenant-scoped metadata in PostgreSQL, object storage and signed upload URLs, CDN, quota controls, optional Yjs collaboration. GitHub App least-privilege access and large asset strategy.
- Export: standalone web runtime first; native builds require separate toolchains.

## Milestones
1. Editor foundation: scene manipulation, picking, project import/export, undo, tests.
2. Playable vertical slice: player controller, collisions, event logic, play/stop, standalone web export.
3. Asset workflow: GLB import, prefab instances, materials, autosave, asset validation.
4. Model and character studio: mesh operations, skinning, animation retargeting.
5. AI and plugins: security reviewed provider and extension contracts.
6. Collaboration, deployment, observability, scale and recovery drills.

## Release gates
Reproducible lockfile, CI typecheck/test/build, browser E2E coverage, import fuzzing, CSP, accessibility, dependency/license audit, GPU/device benchmarks, memory budgets, crash recovery, tenant isolation, backup restore and measured load tests. Million-user capacity is a target, not a verified property. Measure active users, concurrency, storage and bandwidth separately.
