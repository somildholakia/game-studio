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

Historical baselines do not certify the current branch head. Latest CI results must be checked separately. No live third-party credentials are used in tests.
