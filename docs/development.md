# Development

Node 22+. Run npm install, npm run dev, npm test, npm run build. Dev and build first generate an embedded IIFE player bundle with Vite.

## First playable workflow
Load Treasure Run, press Play, move using WASD or arrows, collect two gems and reach the green exit. Stop restores the authored scene. Set a primitive's gameplay role in the Inspector: decoration, player, solid, collectible, or goal. One player is allowed. Duplicate objects, adjust transforms, undo/redo and export JSON for editable backups. Local autosave is limited to browser storage and can fail due to quota or browser policies.

Export playable HTML generates a self-contained document with the project and bundled player; intended for offline desktop browsers. Browser and file:// export smoke tests are required before release. No external scripts are intentionally fetched at runtime.

## Current limitations
Horizontal conservative bounding-box collisions only; no gravity, jumping, full rigid-body physics, touch controls, mesh imports, prefab inheritance, AI or cloud services. Rendering is WebGL. Local storage is not a durable backup. CI uses npm install until a verified lockfile can be generated. CI and browser results must be confirmed before merging. This is an experimental milestone, not a production release.
