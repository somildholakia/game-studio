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

No live third-party credentials are used in tests. Recheck the current PR head's Actions before treating these checkpoint results as current.

Verified baseline: `4a5eecdd9c34c9d7bee6eed703b340e51ddebf0f` passed [Validate 45997452632](https://github.com/somildholakia/game-studio/actions/runs/45997452632) and [Browser compatibility 45997452539](https://github.com/somildholakia/game-studio/actions/runs/45997452539). The new static release manifest and CI artifact are subject to verification at the updated revision. See [static deployment](static-deployment.md) for scope, artifact integrity, staged rollout and rollback. No public deployment or rollback drill has been performed.
