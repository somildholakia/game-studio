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

## Candidate additions in this continuation — not yet certified

| Acceptance item | Implementation | Required evidence at latest source revision |
|---|---|---|
| Assets/materials: material library (+2) | [643716a](https://github.com/somildholakia/game-studio/commit/643716a1b27776dce67473d0db120c838acb64e8), named reusable presets with validated snapshots, project-wide persistence, history, four built-ins; image textures excluded | materialLibrary.test.ts and save/reuse/undo/reload E2E pass |
| Editor: accessible keyboard-first workflow (+2) | [871c8da](https://github.com/somildholakia/game-studio/commit/871c8da1c06247db79d65951f1aaf94a9076d2f8) and [e59f542](https://github.com/somildholakia/game-studio/commit/e59f542e54493cc22b0a42d14f907512c3bccedc), focus jumps, selection state, keyboard file picker, editing/history/export | keyboard authoring E2E passes in required browsers; basic workflow only, full screen-reader and real-device accessibility gate remains open |
| Foundation: documented deployment and upgrade process (+2) | [84f7104](https://github.com/somildholakia/game-studio/commit/84f71041f7519f95d24ab1354cc8f28ea2d571f1), [static deployment](static-deployment.md), deterministic manifest, static artifact and rollback procedure | Validate static release tests and manifest verification pass; tested artifact produced; no public deployment claimed |
| Foundation: recovery with retained authored data on supported GPUs (+2) | [e59f542](https://github.com/somildholakia/game-studio/commit/e59f542e54493cc22b0a42d14f907512c3bccedc), simulated context loss, exact authored data export during loss and restore/reload | mandatory Chromium simulated WebGL loss test passes; software renderer only, hardware/driver testing remains open |

If all four additions and the historical items pass at the current revision, the planning rubric could reach 50 / 100 (25 acceptance items). A skipped, cancelled or failing run cannot certify a candidate. Do not present 50% as achieved before checking the actual current-head results. See the [pull request continuation notes](https://github.com/somildholakia/game-studio/pull/1) for the latest run IDs/results; the ledger must not confuse the last successful revision with a newer pending revision.

The remaining unchecked acceptance items and all [production release gates](release-gates.md) remain mandatory. No hosted service, live provider, full rigid-body engine, skeletal skinning/retargeting, executable plugins, authoritative multiplayer, real-device acceptance or production-scale claim is made.
