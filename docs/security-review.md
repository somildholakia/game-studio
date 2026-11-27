# Security review and threat model

Scope: experimental local browser editor and static offline export. This is a first-party review, not an independent penetration test or production security certification.

| Boundary / threat | Existing control and regression evidence | Remaining exposure |
|---|---|---|
| Project/pack/plan import: malformed data, prototype injection, huge decoded resources | Schema allowlists, raw project/pack/plan size bounds, geometry/image/audio quotas, deterministic project and GLB mutation corpus, validated preview and undo | Full coverage-guided fuzzing, all glTF semantic validation, renderer/decoder vulnerabilities |
| Shader and modifiers: code injection, graph/resource exhaustion | Fixed compiler grammar, forward-reference rejection, operation and reference caps, evaluated mesh validation | Hardware driver-specific failure paths |
| BYOK/GitHub: key exfiltration, SSRF, hostile origins, uncontrolled upstream calls | Memory-only credentials, fixed upstream routes, loopback host/origin checks, strict JSON, rate/concurrency budgets, no credential logging, mock and loopback tests | Production auth, tenant budgets, encryption, independent review |
| Local rooms: cross-room injection, membership theft, exhaustion | Token/sequence checks, membership caps and TTL, real HTTP maximum-slot load tests | Authoritative simulation, public identity, WAN protections |
| Export: stored script injection and external resources | Escaped project JSON/title, embedded runtime, restrictive CSP, offline tests | Hosted editor CSP and external hosting configuration |
| Extensions: arbitrary execution | Declarative manifests only; code rejected | Executable sandbox security remains open |
| Supply chain: vulnerable or unexpected packages | Locked install, license/integrity/registry inventory, npm advisory audit at high severity | Human review of all advisory findings including moderate/low; license notices, action pinning, SBOM and provenance |

## Reproduce
Run npm ci, node scripts/dependency-review.mjs, npm audit --audit-level=high --json, npm test, npm run build, node --test scripts/*.test.mjs, node scripts/room-load.mjs and the browser matrix. The deterministic mutation corpus covers 600 project mutations, 600 GLB mutations and focused rejection tests. Accepted project mutations must round-trip idempotently. A failing audit is not suppressed; retain its JSON artifact and remediate before claiming an audit pass. Advisory databases change, so retain exact revision, date and audit output. The SPDX allowlist is a conservative review trigger, not a legal opinion or complete license compliance review.

## Report and remediate
Report suspected vulnerabilities privately to the repository owner; avoid publishing credentials or exploit payloads in issues. Reproduce with sanitized fixtures, assign severity, isolate affected functionality, rotate exposed secrets and add a regression before releasing a fix. Re-run the audit on every dependency update. Independent security review, public service threat modeling and real-device tests remain release gates.
