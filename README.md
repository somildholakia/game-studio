# Game Studio

Browser-native 3D game authoring with a modular editor, local project persistence, and a separate playable HTML runtime.

## Development

Node.js 22+.

```sh
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Current experimental capabilities
Scene editing, primitive and GLB model assets, prefab snapshots, parameterized characters, static character physics, PBR materials, direct transform tools, no-code gameplay events, IndexedDB autosave, decorative transform animation, basic editable mesh topology, standalone HTML export and reviewable declarative AI edit plans.

See [development](docs/development.md) for workflows, limitations and verification. See [architecture](docs/architecture.md) for planned platform modules.

**Status:** experimental development branch. No production-scale, full engine parity or live AI provider claims.