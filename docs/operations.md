# Monitoring, load and incident plan

Scope: the browser editor is static; the three gateways are local development prototypes. No production alert destination, on-call team, or internet service is configured. These are explicit operating requirements and a reproducible local telemetry baseline, not a deployed production SLO.

## Local monitoring
The dev server exposes POST /api/local/metrics with application/json and matching loopback Origin. This is process-local data, cleared at restart. From a developer console on the editor origin:
```js
await (await fetch('/api/local/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json()
```
It returns fixed-route request/active/success/client-error/server-error/rate-limit/abort counters and p95 over the last 256 completions. It never records body, raw URL, identity, credential, project or room token. It is not in the static build. Use scripts/room-load.mjs for a measured capacity run and docs/performance-budgets.md for editor/runtime budgets.

## Production launch targets and alerts (not yet measured)
- Static editor: 99.9% monthly successful loading from supported regions; p95 TTFB <500 ms; synthetic author/save/export every five minutes from approved environments. Alert after three failed probes or >1% 5xx over five minutes.
- Authenticated project API: 99.9% monthly availability, p95 metadata request <500 ms, error ratio <1%, upload/download measured separately; page on repeated backup/restore failures or data-integrity mismatch immediately.
- Multiplayer: initially validate 1,000 concurrent authenticated users in 125 eight-player rooms, 10 Hz messages, p95 server processing <50 ms, no cross-room data and <1% dropped updates under defined WAN impairment. Start with 100/250/500/1000-user staging ramps; 30-minute steady state each and 2-hour soak at peak. Stop on data isolation or integrity errors, OOM, sustained latency violations or CPU >80%.
- AI gateway: distinguish provider 429 and timeout from internal 5xx; measure per-provider latency/cost without storing prompts or keys. Alert on sustained quota exhaustion, unexpected spend, or token leakage. Enforce per-tenant budgets, circuit breakers and secret rotation before launch.
- Monitor CPU, RSS, event-loop lag, request rates, latency histograms, connection counts, database pool usage, queue depth and object-storage failures. Use sampled, redacted traces with random request IDs. No project content, API keys, full URLs, or player coordinates in telemetry. Restrict access; proposed retention 14 days for logs and 90 days for aggregates.

## Incident procedure
Assign an incident commander, engineering responder and communications owner before opening a public service. P0: credential exposure, tenant boundary breach or durable data loss; isolate affected routes, revoke credentials, preserve redacted evidence, notify affected users according to applicable obligations and do not restore traffic until verified. P1: widespread outage or severe degradation; pause releases, compare deploy and metric changes, roll back the static release or disable affected service via feature flag. P2: localized regressions; create tracked issue and schedule corrective release. Record UTC timestamps, affected versions, measured impact and mitigations. Never silently overwrite user projects to restore service.

## Recovery and capacity evidence
Store versioned artifacts and independent encrypted backups. Target RPO 15 minutes and RTO 60 minutes for future cloud project storage; run isolated restore drills and compare content hashes. In load reports record revision, infrastructure, dataset, concurrency, throughput, latency percentiles, errors, resources and cost; do not extrapolate the loopback presence benchmark to internet scale. Rehearse alert delivery, credential rotation, rollback and restore before public beta. Assign owners and validate all targets with measured evidence; this plan alone does not satisfy production scale, cloud durability or security gates.
