# Production release gates

The project is an experimental browser editor and runtime. A green CI build is necessary but insufficient for production.

| Gate | Required evidence |
|---|---|
| Reproducibility | Checked-in verified lockfile, pinned toolchain, repeatable clean build |
| Browser coverage | Chromium, Firefox and WebKit; real mobile and desktop GPU tests; context loss and recovery |
| Authoring correctness | Full create/edit/save/reopen/export and undo regression coverage; asset and schema migrations |
| Runtime | Physics, input, audio, gameplay, animation and export benchmarks; resource budgets |
| Security | Threat model, import fuzzing and quotas, CSP, dependency/license audit, isolated extension execution |
| Credentialed services | Authentication, tenant isolation, rate limiting, encryption, audit logs, secure OAuth/GitHub App |
| Cloud durability | Versioned object storage, backup and restore drills, collaborative conflict handling |
| Scale | Explicit concurrency targets and measured load tests, latency budgets, observability and capacity model |
| Product completeness | Advanced modeling and rigging, level and scene management, texture and shader workflows, richer gameplay, multiplayer, plugin SDK and publishing |
| Accessibility | Keyboard workflows, screen reader labels, focus management, contrast, mobile usability |

Verified historical baselines:
- Physics and transform editor: GitHub Actions 45789953908.
- Browser save/restore, playable HTML export and rules: 45790613839.
- Mesh/animation inspector duplicate key fix: 45797326406.
- Local integrations, project library, audio and mobile-control source: 45797765323.
- Extension pack source: 45797856001.
- Procedural terrain and unit tests: 45798213881.

- Articulated characters, environment and expanded tests: 45798633060.
- Multi-level source checkpoint: 45803417454.
- HUD and camera checkpoint: 45803505307.

- Complete advanced modeling / linked prefab baseline: 45805425149.
- Complete dynamics, patrol and diagnostics baseline: 45806635083.

The cross-browser workflow is configured for relevant pull request changes and manual dispatch (the latter depends on default-branch availability). Configuration alone does not certify browser compatibility. The texture accessibility fix passed Validate run 45829261366; this is a historical baseline only.

A dependency lockfile was generated in successful Validate run 45829995781; CI now uses npm ci. The current PR head `faf31081f385acd939dc436d3d8f6e2d9021bbca` passed Validate run 45832800472, including clean install, unit tests, production build, and Chromium end-to-end tests. Browser compatibility run 45832800491 passed the end-to-end suite in Chromium, Firefox, and WebKit. These checks cover automated desktop browser runs only; real-device, GPU, context-loss, performance, security, durability, scale, and full product release gates remain open.

Context-loss handling now suspends the simulation during Babylon resource restoration and defers editor updates. A browser regression uses WEBGL_lose_context when supported; real-device recovery and failure-path validation remain open.

Normal CI uses mocked third-party provider calls. The separate, explicitly scoped live Git project acceptance uses a short-lived GitHub Actions repository token and synthetic temporary branch; no live AI keys are used in default CI. Recheck the current PR head's Actions before treating these checkpoint results as current.

Verified baseline: `4a5eecdd9c34c9d7bee6eed703b340e51ddebf0f` passed [Validate 45997452632](https://github.com/somildholakia/game-studio/actions/runs/45997452632) and [Browser compatibility 45997452539](https://github.com/somildholakia/game-studio/actions/runs/45997452539). The new static release manifest and CI artifact are subject to verification at the updated revision. See [static deployment](static-deployment.md) for scope, artifact integrity, staged rollout and rollback. No public deployment or rollback drill has been performed.

Controlled midpoint baseline `507af7a427d6d8c2b570d4174025e5627370ad6e`: [Validate 45998483598](https://github.com/somildholakia/game-studio/actions/runs/45998483598) and [Browser compatibility 45998483415](https://github.com/somildholakia/game-studio/actions/runs/45998483415) succeeded (192 unit tests, two manifest tests, 38 E2E tests in each of Chromium, Firefox and WebKit). See the evidence ledger for the bounded 50-point planning score and stricter 48-point physical-GPU interpretation. The subsequent local gateway admission patch has five locally passing Node tests with source hashes checked against GitHub, but requires new Actions verification. Production release gates remain open.

See [performance budgets](performance-budgets.md) and [operations plan](operations.md) for the new reference tests and explicit proposed production SLOs, load ramps and incident procedures. Pending latest Actions. No physical-device, public multiplayer, cloud durability or production operations gate is closed.

Controlled 60-point baseline 6e77de02be5d98e53655e0cb00d0a5a08faa459b: [Validate 46000128663](https://github.com/somildholakia/game-studio/actions/runs/46000128663) and [Browser compatibility 46000128675](https://github.com/somildholakia/game-studio/actions/runs/46000128675) succeeded. 200 Vitest tests, nine Node tests, 41 E2E tests in each browser. See acceptance ledger for measured load/CPU/browser data and strict hardware caveat. Additional modifier/visual controls are under verification. All public service, hardware and production gates remain open.

New candidate checkpoints: weighted procedural skeletal skinning, scalar animation retargeting/blending, asynchronous conflict-reviewed project merging, seeded import fuzz/security inventory, restricted Wasm worker SDK. Full current matrix and audit must pass; independent security, device, service and production gates remain open.

Verified controlled 72-point checkpoint 53290c2250f9eb3bbbfdf22b64aa026a8313ed5a: [Validate 46003016867](https://github.com/somildholakia/game-studio/actions/runs/46003016867) and [Browser compatibility 46003017004](https://github.com/somildholakia/game-studio/actions/runs/46003017004) both passed (226 unit, nine Node, 49 E2E per browser, zero npm advisory findings). See acceptance ledger for the stricter 70-point score and scoped evidence. Compressed local packages and decode scheduling follow this tested revision and require their own CI. No production release authorization, physical-device certification, or public service readiness is implied.


The hosted website ZIP and compressed content-addressed delivery have controlled static-host tests, not a public deployment/rollback drill. The live Git gateway smoke verifies real repository history and optimistic concurrency, not production tenant isolation. See the acceptance ledger for controlled planning scope. A physical GPU/device test and real live AI evaluation remain mandatory where required.


Runtime profiling at df19bb7272f8d358ce3e44b8795fa04180b38d4e passed [Validate 46009752598](https://github.com/somildholakia/game-studio/actions/runs/46009752598) and [Browser compatibility 46009752620](https://github.com/somildholakia/game-studio/actions/runs/46009752620), establishing the 82-point controlled baseline in the existing rubric. Physical-device and GPU budgets remain unverified. Subsequent reference backup/auth API, mass-weighted dynamic contact, and server-authoritative independent-lane race implementation do not waive any production release gate. Actual cloud deployment, OIDC/end-user isolation, off-site restoration, shared-world multiplayer, full rigid-body physics, live AI and physical-device/accessibility acceptance remain open. See the evidence ledger and PR for current-head checks.
