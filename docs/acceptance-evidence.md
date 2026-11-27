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

## Candidate increments toward 70/100 — verification in progress

The prior 60/58 baseline at 6e77de0 remains the last fully green revision. At bb57660 Validate 46000917599 succeeded (205 unit, 44 E2E), Chromium and WebKit passed 44 each; Firefox 46000917725 failed the first Play/HUD test after reload (43 passed). A renderer readiness guard is included in the next candidate; cause not proven. At 287842e Validate 46001745276 reported 219 passed and one merge-fixture failure (shared base object mutated); the fixture now independently clones the base.

| Candidate item | Evidence required |
|---|---|
| Modeling: non-destructive modifiers and Boolean workflows (+2) | Previously implemented bounded cuboid CSG, original mesh retained, apply/remove/bake and browser regressions. Requires a green combined matrix. |
| Animation: skeletal skinning (+2) | [98f3fa6](https://github.com/somildholakia/game-studio/commit/98f3fa62f4b9249252dfe6050141e05d2288b03f): two-bone weighted procedural limbs, numerical and browser pose tests. Arbitrary full-body/imported weight painting remains open. |
| Animation: blending/retargeting (+2) | [76c9ae7](https://github.com/somildholakia/game-studio/commit/76c9ae780fbf9e2f3bdb243bf6e2d8470d505a95): two-clip blend, speed and mapped scalar joint channels, preview and round-trip tests; not arbitrary imported quaternion rigs. |
| Multiplayer/collaboration: collaborative editing/conflict resolution (+2) | [b4e2e26](https://github.com/somildholakia/game-studio/commit/b4e2e266bb198caea45baca9e03c10ddf533f050): reviewed asynchronous three-way project merge, conflicts and invariant checks; not real-time collaboration. |
| Release quality: security/dependency/fuzz audit (+2) | [fe3f43d](https://github.com/somildholakia/game-studio/commit/fe3f43d059cd615f2e238cc57c3a0745d94744f6): 1,200 seeded import mutations, threat model, locked dependency metadata and advisory audit reports. Credit only after audit and suite succeed; independent penetration test remains open. |
| AI/tools: isolated executable extension SDK (+2) | [d5234ca](https://github.com/somildholakia/game-studio/commit/d5234cae196afdaa6edaefb5f78284fb03c4a791): restricted numeric Wasm ABI, disposable worker, no memory/table/start, imports and output capability checks, timeout and reviewed undoable apply. Requires real browser worker and infinite-loop tests; not unrestricted JavaScript or marketplace security. |

These six bounded candidates could yield 72/100 controlled or 70/100 with the existing physical-GPU caveat, only after all required evidence succeeds. No score inflation for production claims. See PR #1 for current Actions.

At b0f1de4, the upgraded Vitest 5.1.2 lockfile matches CI-generated Git blob 9663e1724c955ffaa53684b5312efa2779598ba1. Validate 46002409854 passed unit tests, metadata review, advisory audit, production build and local load/manifest checks. The downloaded audit artifact 15198038946 confirms zero known npm advisory vulnerabilities and 97 packages with zero metadata findings. The Chromium matrix job 140517127303 reported 45 passes and three ambiguous leftElbow locator failures caused by the retarget JSON textarea label. Tests now target slider roles and textareas have explicit accessible names; full rerun required. Previous Firefox trace confirms WebGL driver exhaustion; added bounded fresh-canvas startup retries, actual injected failure regression, linked merge order and renderer mesh-buffer tests. Do not credit a failed or superseded run.

## Verified 72-point controlled checkpoint (70-point strict interpretation)

At [53290c2](https://github.com/somildholakia/game-studio/commit/53290c2250f9eb3bbbfdf22b64aa026a8313ed5a), [Validate 46003016867](https://github.com/somildholakia/game-studio/actions/runs/46003016867) and [Browser compatibility 46003017004](https://github.com/somildholakia/game-studio/actions/runs/46003017004) both concluded success on November 27, 2026. All six previously listed candidate increments are now credited at their stated bounded scope. Evidence: 44 unit files / 226 passing unit tests, nine passing Node tests, 49/49 end-to-end tests each in Chromium, Firefox and WebKit without skips, production build, [verified static artifact](https://github.com/somildholakia/game-studio/actions/runs/46003016867/artifacts/15198563635), [dependency security review](https://github.com/somildholakia/game-studio/actions/runs/46003016867/artifacts/15198423370) (97 packages, no inventory findings, zero known npm vulnerabilities), and [room load report](https://github.com/somildholakia/game-studio/actions/runs/46003016867/artifacts/15198843108). The previously failing Firefox startup and ambiguous animation selectors now pass.

| Category | Controlled score |
|---|---:|
| Foundation | 10/10 (8/10 under physical-GPU interpretation) |
| Editor | 8/10 |
| Modeling | 10/10 |
| Animation | 10/10 |
| Assets/materials | 8/10 |
| Gameplay/runtime | 6/10 |
| AI/tools | 6/10 |
| Multiplayer/collaboration | 6/10 |
| Publishing/cloud | 2/10 |
| Release quality | 6/10 |
| **Total** | **72/100 (36/50); strictly 70/100 (35/50)** |

Measured CI reference: mesh pipeline p95 90.727 ms; simulation CPU p95 1.016 ms; loopback 256 clients, 1,426 updates/s, p95 100 ms. Software-rendered 31,744-triangle browser p95 desktop/compact frame intervals: Chromium 66.7/116.6 ms, Firefox 34/33.18 ms, WebKit 47/37 ms. These are bounded reference workloads, not physical GPU or production-scale certification. The six new items are not evidence of general arbitrary CSG, full imported skeleton skinning, arbitrary quaternion retargeting, real-time coediting, independent penetration testing or unrestricted plugins. Mandatory production gates remain open.

Development continued beyond that checkpoint: [0845612](https://github.com/somildholakia/game-studio/commit/0845612779369cfccc9125187d79de157dcd6b2a) adds bounded gzip project packages with integrity checks and a two-slot model decoder queue; [15fa27b](https://github.com/somildholakia/game-studio/commit/15fa27b7294e1d4b6e7d8b99543987a5b6cc1b09) prevents stale queued jobs from starting. Isolated local Node checks passed for the exact decoder queue blob, plus compression/checksum/size tests using a stub project parser. Full integration and browser CI are required at the new head. This is not CDN/progressive network asset streaming or durable cloud backup; no extra rubric points are claimed.


## Candidate 80-point continuation at b342165
Starting revision [7a9d624](https://github.com/somildholakia/game-studio/commit/7a9d6242c5ff5bf30a53942e96db81faa4d6191a) passed [Validate 46005084414](https://github.com/somildholakia/game-studio/actions/runs/46005084414) and [browser compatibility 46005084604](https://github.com/somildholakia/game-studio/actions/runs/46005084604). Four additional unchanged acceptance items are evaluated at [b342165](https://github.com/somildholakia/game-studio/commit/b3421656dd1c9f28294c58e3367079bf5c536c2e).

| Candidate acceptance item | Evidence and scope |
|---|---|
| Publishing/cloud: versioned Git project persistence (+2) | [Live Git 46007682054](https://github.com/somildholakia/game-studio/actions/runs/46007682054) succeeded; real GitHub create/read/update, stale-write rejection, history read, restore as new commit and cleanup with a synthetic project and scoped CI token. [Report](https://github.com/somildholakia/game-studio/actions/runs/46007682054/artifacts/15201723723). Browser restore UI uses mocked gateway; not production OAuth. |
| Publishing/cloud: hosted publishing workflow (+2) | [6783bb5](https://github.com/somildholakia/game-studio/commit/6783bb5bce285c6bdc4b0777b422abcaf5cd8418), ZIP website export, real static loopback HTTP browser hosting, level transitions and corruption recovery; not automatic public deployment. |
| Assets/materials: scalable asset streaming and compression (+2) | [9b297fd](https://github.com/somildholakia/game-studio/commit/9b297fd75fffa232bab594083bf150b3e4107ec2), independent gzip level/model chunks, raw content deduplication, bounded concurrent loading and integrity checks, 32-level reference test. Bounded current asset quotas, not CDN/large-world production scale. |
| AI/tools: substantial end-to-end game generation evaluation (+2) | [a4791f3](https://github.com/somildholakia/game-studio/commit/a4791f32c961fdd518dc1d32fdf60c1f57d25614) and [b342165](https://github.com/somildholakia/game-studio/commit/b3421656dd1c9f28294c58e3367079bf5c536c2e): 45 actual procedural generated-game evaluations, eight authored runtime scenarios, mocked BYOK-to-export and offline generator browser tests. Scope is local procedural generation and the validated pipeline; no live LLM quality/provider credit. |

[Browser compatibility 46008707476](https://github.com/somildholakia/game-studio/actions/runs/46008707476) succeeded (55/55 tests each in Chromium, Firefox and WebKit, zero skips). [Validate 46008708002](https://github.com/somildholakia/game-studio/actions/runs/46008708002) also concluded success, establishing the controlled 80/100 (78/100 strict) checkpoint. Later profiling candidate needs its own verification and must not be credited for physical GPU/device testing.

## Verified 80-point checkpoint

At b342165 both workflows above passed. Validate recorded 50 unit files / 294 tests, nine Node tests, 55 Chromium E2E tests, production build, dependency review and audit, room load and static manifest checks. The browser matrix recorded 165/165 executions. [Static artifact](https://github.com/somildholakia/game-studio/actions/runs/46008708002/artifacts/15202549719), [security evidence](https://github.com/somildholakia/game-studio/actions/runs/46008708002/artifacts/15203140144), [load report](https://github.com/somildholakia/game-studio/actions/runs/46008708002/artifacts/15202249547). Credit the four bounded acceptance items above without changing the rubric.

| Category | Controlled score |
|---|---:|
| Foundation | 10/10 (8/10 strict) |
| Editor | 8/10 |
| Modeling | 10/10 |
| Animation | 10/10 |
| Assets/materials | 10/10 |
| Gameplay/runtime | 6/10 |
| AI/tools | 8/10 |
| Multiplayer/collaboration | 6/10 |
| Publishing/cloud | 6/10 |
| Release quality | 6/10 |
| **Total** | **80/100 (40/50); 78/100 strict (39/50)** |

Additional candidate: bounded gameplay profiling, frame/simulation/render-submission measurements across desktop and compact software-rendered browser profiles (92b102b). Full CI required before credit; this is not physical GPU timing or physical-device validation. Additional GLB streaming regression and optional opt-in live AI harness do not independently earn points. No production gate is waived.


## Verified runtime profiling checkpoint at df19bb7

At [df19bb7](https://github.com/somildholakia/game-studio/commit/df19bb7272f8d358ce3e44b8795fa04180b38d4e), [Validate 46009752598](https://github.com/somildholakia/game-studio/actions/runs/46009752598) and [browser compatibility 46009752620](https://github.com/somildholakia/game-studio/actions/runs/46009752620) both succeeded. Validate recorded 51 unit files / 296 tests, 56 Chromium E2E tests, dependency audit, production build, local load and static manifest checks. All three matrix jobs independently passed 56 E2E tests (168 executions).

The unchanged gameplay/runtime profiling and device-budget benchmarks item has its controlled reference evidence: 126-entity active gameplay in both full-size desktop and compact software-rendered browser profiles. Desktop/compact p95 frame intervals in ms: Chromium 61.2/97.2, Firefox 45/19, WebKit 32/19. Corresponding simulation p95: 1.4/2, 3/1, 2/1; render submission p95: 6.9/3.5, 7/2, 6/2. The larger compiled simulation CPU workload p95 was 3.078 ms (16.7 ms budget). These meet the documented controlled regression budgets, not physical-device FPS/GPU budgets.

**82/100 (41/50) controlled at this tested revision.** 80/100 if only physical GPU recovery is excluded under the previous strict interpretation; 78/100 if both GPU recovery and the new device-profile item require physical hardware. No physical device evidence is added. No other acceptance item or production gate is credited.

### Subsequent backup/authentication implementation (no additional credit)

The filesystem backup adapter and authenticated HTTP reference API add immutable version history, SHA-256 integrity checking, optimistic revision conflicts, restore as a new revision, private tenant namespaces, read/write scoped opaque credentials, bounded request and per-tenant storage quotas. Six new Node tests passed locally on Node 22.16.0, including actual loopback HTTP across independent tenant credentials and reopen/restore. Tested Git blob hashes: backup-store.mjs b16badefe0962021bcf7b5713f3d23834e820bbf; backup-store.test.mjs 3398842c1878f4514873a542d86dcc4f4c909fc2; backup-api.mjs 75e32bb45015d481499c09846ac8289b64547fbc; backup-api.test.mjs 546dc70203e0e98bb73e5d79aaa4596284f57248. All four blobs were read back from GitHub and matched. Latest-head full CI must pass. This is not deployed object storage, disaster recovery, public identity/OIDC, production tenant isolation, or editor integration; no cloud/auth rubric points are added.


### Subsequent dynamic contact and authoritative race work (uncredited)

[5fb5f0f](https://github.com/somildholakia/game-studio/commit/5fb5f0f11ee8313305a7d6ffb475d5a95e3a3eca) changes the existing shared AABB dynamics to transfer mass-weighted normal impulses to contacted dynamic bodies; [cf33b09](https://github.com/somildholakia/game-studio/commit/cf33b093051014d486e9eecbaf65261837d1132f) adds equal/unequal mass and momentum regression tests. An isolated strict TypeScript harness with the exact runtime and collision source blobs (a93cdc9df6abd01debd510875916e95a3a0abdb9, c4b6aed86c1e8ef18205b888593bedd8bc35448b) and minimal project types passed both numerical checks. Validate [46014021457](https://github.com/somildholakia/game-studio/actions/runs/46014021457) passed unit, audit, production build, Node tests (including backup/API), local room load and static manifest checks, then was superseded before browser tests. Not complete rigid-body/contact physics.

[cacb701](https://github.com/somildholakia/game-studio/commit/cacb7010947495c631b49e779a02bee2d7631f45) through [2486eec](https://github.com/somildholakia/game-studio/commit/2486eecf0d4876a65d55a534fd1169cc86b0090e) add a bounded independent-lane race mode with actual compiled server gameplay, fixed tick, monotonic time, replay rejection, stale-input expiry, token membership, real loopback multi-client tests and a mounted Vite endpoint test. The intermediate Validate [46014285442](https://github.com/somildholakia/game-studio/actions/runs/46014285442) passed the unit suite and dependency audit when inspected. Full latest-head verification remains required; no shared-world multiplayer, matchmaking, production authentication, durable cloud backup, physical device or release acceptance credit is added. Last fully verified controlled score remains 82/100 at df19bb7 (strict 78 if both hardware-dependent items require physical devices).


### Signed access-token verification (uncredited)

[f517637](https://github.com/somildholakia/game-studio/commit/f51763781d9e39b61d1825808657aba90abf67cb) and [947df28](https://github.com/somildholakia/game-studio/commit/947df28aac6715b796b5de1b5e4766c5b80ad447) add a strict RS256 access-token verifier for the private backup API, with pinned issuer/audience/public keys, lifetime/scope checks and server-side subject membership. Eight combined local backup/API/JWT Node tests passed, including signed real HTTP cross-tenant access denial and tampered signature/claim rejection. GitHub blob hashes matched locally tested source 1c66cbc56d0eb4b1ef253142889b080828d7c093 and tests bab3f29b4f70d0f749f18d883e1ddffd19e8e521. No live issuer, login flow, distributed auth, production storage or full latest-head CI claim. No additional acceptance credit.


## Continuation toward 90 points — candidates, no additional credit yet

- Previous head a65d463 passed all non-browser steps in [Validate 46014683583](https://github.com/somildholakia/game-studio/actions/runs/46014683583), then the full workflows were superseded before browser completion. No new fully green baseline is inferred.
- Shared synchronized race: [d252c65](https://github.com/somildholakia/game-studio/commit/d252c65fa8ab8823794d8522c967460305e74bda) through [838dbd3](https://github.com/somildholakia/game-studio/commit/838dbd3d7e580a094f38e480df90dc359e0ee7af) implement host lobby/start, one shared set of pickups, common winner, client movement only, server-derived 3D viewport state, exact-once pickup claims and real two-browser create/join/play/finish/leave regression against mounted Vite. Candidate +2 for authoritative synchronized gameplay only when complete current matrix passes; no credit for general shared worlds or secure public matchmaking.
- [44b6522](https://github.com/somildholakia/game-studio/commit/44b652294f718b686c364bc321694e34e4b222e5), [929e4c6](https://github.com/somildholakia/game-studio/commit/929e4c63f686f2c2d1a8496ac31bd398d0211d8d), [e2ada17](https://github.com/somildholakia/game-studio/commit/e2ada17acc67814f01afcdde4639d8d95bb11fb7): GCS JSON API generation preconditions, cross-instance tenant CAS, immutable checksummed content, asynchronous authenticated API, simulated primary loss/recovery, pinned JWKS refresh and runnable private service/live acceptance harness. HTTP contract and recovery tests use synthetic local storage; no provisioned cloud/identity evidence. No cloud/auth points.
- Intermediate [Validate 46015901661](https://github.com/somildholakia/game-studio/actions/runs/46015901661) passed 53 files / 305 unit tests and 24 Node tests, dependency audit, production build, room-load, static manifest and browser install. It was cancelled during 57-test Chromium E2E by later commits. No cancelled run is credited.
- [2f70d22](https://github.com/somildholakia/game-studio/commit/2f70d22f1945acbf003b117ee1d8926fea08bbf0): bounded inverse-mass overlap correction and tangential friction contact tests. [03701b4](https://github.com/somildholakia/game-studio/commit/03701b46568cc32ecf4e0ffa6505079536d210c1): compact full-width authoring layout and emulated browser test. Neither closes full rigid-body physics or physical mobile/accessibility gates. [596e586](https://github.com/somildholakia/game-studio/commit/596e58603f08cc4c3b6bb2de58878deb3c84d8bf): explicit protected manual live-provider workflow; no live provider call or credentials available. The unchanged last fully verified score remains 82/100 controlled (80 excluding GPU recovery only; 78 if both hardware-dependent items require physical devices). Latest full Actions required; 90 has not been reached.
