# Acceptance evidence ledger

The scoring rules and unchanged ten-category rubric are in [completion checkpoints](completion-checkpoints.md). Each accepted item is two points. This is a provisional engineering rubric, not feature parity, a percentage of engineering effort, or a release certificate.

## Verified historical baseline

Revision [4a5eecd](https://github.com/somildholakia/game-studio/commit/4a5eecdd9c34c9d7bee6eed703b340e51ddebf0f): [Validate 45997452632](https://github.com/somildholakia/game-studio/actions/runs/45997452632) and [Chromium/Firefox/WebKit compatibility 45997452539](https://github.com/somildholakia/game-studio/actions/runs/45997452539) both concluded success. Validate logs show 33 unit test files / 188 passing tests and 36 passing Chromium E2E tests. The following evidence is historical until the current revision's required checks succeed. Test names refer to repository tests, not live-service or hardware verification.

| Category | Accepted at historical baseline | Evidence | Score |
|---|---|---|---:|
| Foundation | repeatable locked build; browser matrix; modular typed editor/runtime | npm ci, TypeScript build, separate embedded runtime, three-browser Actions matrix | 6 |
| Editor | scene/object editing and undo; multi-level workflows; reusable prefab editing | editor.spec.ts author/save, create/reorder/duplicate levels, linked prefab workflows; history.test.ts, scenes.test.ts, assets.test.ts | 6 |
| Modeling | bounded topology editing; mesh import/export; smooth normals/UV editing | meshOperations.test.ts, assets.test.ts, glbExport.test.ts, meshNormals.test.ts, textures.test.ts; E2E mesh authoring and GLB roundtrip | 6 |
| Animation | transform keyframes; articulated character timeline | animation.test.ts, characterRig.test.ts and E2E animation controls/timeline persistence | 4 |
| Assets/materials | local asset validation; image/procedural textures | assets.test.ts import bounds, textures.test.ts, E2E texture import/reload and sculpt/texture editing | 4 |
| Gameplay/runtime | scoped events and gates; movement/checkpoints/lives/platforms; campaign progression and portable saves | rules.test.ts, simulation.test.ts, progress.test.ts; editor and export E2E | 6 |
| AI/tools | validated preview/undo; reusable declarative tools | plan.test.ts, creatorTools.test.ts, E2E review/apply/undo and parameterized tools | 4 |
| Multiplayer/collaboration | local presence transport | rooms.test.js real ephemeral loopback server, roomClient.test.ts and mocked E2E room UI | 2 |
| Publishing/cloud | playable offline export | editor.spec.ts exported standalone game and campaign | 2 |
| Release quality | automated regression coverage | current baseline Validate and browser compatibility runs | 2 |
| **Historical total** | **21 of 50 acceptance items** | **No credit for other items** | **42 / 100** |

Notes: Modeling credit is for bounded basic UV projection and smooth normals, not professional UV island editing. The GitHub provider gateway has mocked optimistic concurrency coverage but no live authenticated project save verification, so versioned Git project persistence is not yet credited. Local presence is not synchronized gameplay. Recovery was not credited at this baseline because its test did not verify retention of authored data.

## Additional items verified at 507af7a (controlled browser environment)

| Acceptance item | Implementation | Required evidence at latest source revision |
|---|---|---|
| Assets/materials: material library (+2) | [643716a](https://github.com/somildholakia/game-studio/commit/643716a1b27776dce67473d0db120c838acb64e8), named reusable presets with validated snapshots, project-wide persistence, history, four built-ins; image textures excluded | materialLibrary.test.ts and save/reuse/undo/reload E2E pass |
| Editor: accessible keyboard-first workflow (+2) | [871c8da](https://github.com/somildholakia/game-studio/commit/871c8da1c06247db79d65951f1aaf94a9076d2f8) and [e59f542](https://github.com/somildholakia/game-studio/commit/e59f542e54493cc22b0a42d14f907512c3bccedc), focus jumps, selection state, keyboard file picker, editing/history/export | keyboard authoring E2E passes in required browsers; basic workflow only, full screen-reader and real-device accessibility gate remains open |
| Foundation: documented deployment and upgrade process (+2) | [84f7104](https://github.com/somildholakia/game-studio/commit/84f71041f7519f95d24ab1354cc8f28ea2d571f1), [static deployment](static-deployment.md), deterministic manifest, static artifact and rollback procedure | Validate static release tests and manifest verification pass; tested artifact produced; no public deployment claimed |
| Foundation: recovery with retained authored data on supported GPUs (+2) | [e59f542](https://github.com/somildholakia/game-studio/commit/e59f542e54493cc22b0a42d14f907512c3bccedc), simulated context loss, exact authored data export during loss and restore/reload | mandatory Chromium simulated WebGL loss test passes; software renderer only, hardware/driver testing remains open |

At [507af7a](https://github.com/somildholakia/game-studio/commit/507af7a427d6d8c2b570d4174025e5627370ad6e), [Validate 45998483598](https://github.com/somildholakia/game-studio/actions/runs/45998483598) and [Browser compatibility 45998483415](https://github.com/somildholakia/game-studio/actions/runs/45998483415) both concluded success: 34 unit files / 192 unit tests, two Node manifest tests, 38 E2E tests each in Chromium, Firefox and WebKit (no skips), and [verified 30-file static artifact](https://github.com/somildholakia/game-studio/actions/runs/45998483598/artifacts/15196649020). The four items have their listed controlled-environment evidence. The provisional planning rubric reaches **50 / 100 (25 of 50 acceptance items) at that tested revision**, interpreting the graphics recovery item as a supported software-rendered WebGL configuration; if physical-GPU verification is required for that item, the stricter score is **48 / 100**. No real-device/accessibility or hardware recovery release gate is closed. A new branch head requires rechecking; a cancelled or pending run cannot certify it. See the [pull request continuation notes](https://github.com/somildholakia/game-studio/pull/1) for current-head status.

The remaining unchecked acceptance items and all [production release gates](release-gates.md) remain mandatory. No hosted service, live provider, full rigid-body engine, skeletal skinning/retargeting, executable plugins, authoritative multiplayer, real-device acceptance or production-scale claim is made.

## Five additions verified at 6e77de0 (controlled environment)

| Unchanged acceptance item | New implementation and evidence required |
|---|---|
| Animation: inverse kinematics (+2) | [308b20e](https://github.com/somildholakia/game-studio/commit/308b20e0b683af7b8b3d2dc4d3709348200a3d48), bounded planar two-link IK for procedural arms and legs; numerical endpoint and UI pose capture/undo/reload tests. Imported skeletons remain open. |
| Multiplayer: multi-client network/load testing (+2) | [58bdae9](https://github.com/somildholakia/game-studio/commit/58bdae9ed119e3ea74b4e5009e3cabc0e0485f23), real loopback maximum-capacity load and isolation checks (32 rooms, 256 clients); report must pass. Does not count authoritative internet gameplay. |
| Modeling: complex model performance benchmark (+2) | [e520186](https://github.com/somildholakia/game-studio/commit/e5201860e195551b943856c00e1eae916c9368e8), near-quota CPU mesh pipeline and 31,744-triangle browser benchmark, measured reference budgets; all tests must pass. Physical devices and higher topology quotas are separate. |
| Assets/materials: shader editing (+2) | [9ed720b](https://github.com/somildholakia/game-studio/commit/9ed720b52546446cd57f27b94b9de532fb3ebbdf), validated editable GPU surface graph in editor/export, undo/reload and shader compile tests. Not full PBR node editor. |
| Release quality: monitoring/load/incident plan (+2) | [operations plan](operations.md), fixed-route aggregate telemetry, bounded storage, local tests and explicit proposed production load/incident/restore targets. Actual production monitoring/scale remains open. |

At [6e77de0](https://github.com/somildholakia/game-studio/commit/6e77de02be5d98e53655e0cb00d0a5a08faa459b), [Validate 46000128663](https://github.com/somildholakia/game-studio/actions/runs/46000128663) and [Browser compatibility 46000128675](https://github.com/somildholakia/game-studio/actions/runs/46000128675) both succeeded: 37 unit files / 200 passing tests, nine passing Node tests, and 41/41 E2E tests in each of Chromium, Firefox and WebKit without skips. The controlled planning score is **60/100 (30 of 50 items)** at that revision; **58/100** if the existing recovery item requires physical-GPU evidence. See the exact evidence and scope in the table above. No extra credit for physical-device profiling, full imported-skeleton IK, production monitoring, WAN multiplayer, or full professional shader parity.

Measured reference results: near-quota mesh CPU pipeline p95 107.841 ms; compiled runtime CPU p95 0.963 ms; 256 clients completed 2,048 loopback updates at 1,413 updates/s, p95 108 ms. [Room load report](https://github.com/somildholakia/game-studio/actions/runs/46000128663/artifacts/15197124775). 31,744-triangle software browser p95 desktop/compact frame intervals: Chromium 66.7/50.1 ms, Firefox 50.42/50.36 ms, WebKit 53/46 ms (matrix jobs). [Verified static artifact](https://github.com/somildholakia/game-studio/actions/runs/46000128663/artifacts/15198151114). These are reference regression measurements, not production FPS targets or internet-scale results.

## Next candidate, beyond controlled 60/100

[8fced3e](https://github.com/somildholakia/game-studio/commit/8fced3e2b0dab1a2d9aaee13ac2c0fc2c7540f73) adds source-preserving modifier stacks, mirror/subdivision/smoothing and bounded exact rectangular Boolean operations. [2ee26d6](https://github.com/somildholakia/game-studio/commit/2ee26d651776e373f7e9ccc0a7522226a4b4a5e2) and [8cb84b6](https://github.com/somildholakia/game-studio/commit/8cb84b65a7f085fac940c387978cb51111829758) add shader reference limits, a rendered-pixel regression and visual shader/modifier controls. An isolated TypeScript geometry harness passed exact union/intersection/difference volume and subdivision checks; the tested core modifier blob matched GitHub SHA 26a91920ceb2e37c9d03b9e966f7e7f92207f71c. Full repository CI is required. The modeling modifier/Boolean acceptance item is a candidate (+2) at its bounded cuboid scope; arbitrary mesh CSG and professional modifier parity remain open. No score above the tested 60/58 baseline until current-head verification.
