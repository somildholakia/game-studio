# Game Studio

Browser-native 3D game authoring with a modular editor, local project persistence, and a separate playable HTML runtime.

## Development

Node.js 22+.

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Current experimental capabilities
Multi-level 3D authoring and standalone campaign HTML export; searchable scene hierarchy, transform handles, GLB and OBJ assets, linked prefabs, articulated characters, transform animation, procedural terrain, PBR materials, reusable material presets, generated textures and imported image textures, UV projection, editable mesh topology and local sculpt brushes, portable mesh GLB export, static and translational dynamic physics, moving gameplay triggers and one-way platforms, no-code events, counters and gates, imported WAV sound effects, portable campaign progress, declarative creator tools, local room presence, touch controls, IndexedDB project storage, reviewable multi-level AI plans, an offline seeded game generator, historical Git project restoration, and static hosted website ZIP export with on-demand compressed level and content-addressed model delivery. Local development gateways support BYOK and GitHub project commits; they are not public multi-tenant services.

The regular CI suite uses Chromium. A separate browser compatibility workflow runs Chromium, Firefox and WebKit on relevant pull request changes; manual dispatch requires the workflow on the default branch. Check Actions for actual results; real-device support is not yet certified.

See [game generation evaluation](docs/game-generation-evaluation.md) for procedural and opt-in live-provider regression workflows. See [static deployment and rollback](docs/static-deployment.md) for the client-only build artifact and verification process. See [completion checkpoints](docs/completion-checkpoints.md) for an explicit feature acceptance checklist and [evidence ledger](docs/acceptance-evidence.md); no percentage is inferred from commit count. See [development](docs/development.md) for workflows, limitations and verification. See [architecture](docs/architecture.md) for planned platform modules.

**Status:** experimental development branch. No production-scale, full engine parity or live AI provider claims.

Subsequent development includes mass-weighted translational body contacts, a bounded server-authoritative independent-lane race API for local development, and a separate [private backup reference service](docs/backup-service.md). These are scoped references, not production cloud/authentication or shared-world multiplayer. See the evidence ledger for verified revision and outstanding gates.
