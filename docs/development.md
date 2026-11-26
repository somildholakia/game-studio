# Development

Node 22+. Run npm install, npm run dev, npm test, npm run build. Dev and build first generate an embedded IIFE player bundle with Vite.

## First playable workflow
Load Treasure Run, press Play, move using WASD or arrows, collect two gems and reach the green exit. Stop restores the authored scene. Set a primitive's gameplay role in the Inspector: decoration, player, solid, collectible, or goal. One player is allowed. Duplicate objects, adjust transforms, undo/redo and export JSON for editable backups. Local autosave uses IndexedDB, with legacy localStorage migration. It can fail due to browser quotas or policies.

Export playable HTML generates a self-contained document with the project and bundled player; intended for offline desktop browsers. Browser and file:// export smoke tests are required before release. No external scripts are intentionally fetched at runtime.

## Assets and character prototypes
Import a self-contained GLB (2 MiB per file, 3 MiB aggregate) in the asset panel, then Place it. The conservative envelope policy rejects external URIs and all glTF extensions, including Draco and KTX2. Imported models are visual decorations; internal materials are retained. Loading errors are shown in the viewport. This is not a full glTF security validator; resource complexity limits and fuzz testing are required before accepting untrusted public uploads.
Save the selected object as a prefab, then Place as many independent copies as needed. Asset references are retained and deletion is blocked while referenced. Prefabs are snapshots, not linked hierarchies. Character primitives expose body width, head size and limb length; they are unrigged, low-poly geometry and can be assigned a gameplay role. Cylinder, cone and torus primitives are available. All these settings are included in the existing project format and runtime export.
IndexedDB stores the current project with embedded assets. Export backups; large assets still need a separate content-addressed object store and OPFS support. Repeated imported instances currently have independent GPU allocations.

## Physics and direct editing
Use WASD/arrows to move and Space to jump. Sky Steps demonstrates raised platforms and a collectible. The runtime compiles static bounds once per play session; swept axis-aligned collision tests, bounded integration substeps, gravity, ceiling and platform contact, fall respawn and height-aware triggers are supported. A world without explicit ground receives an implicit floor at y=0 for compatibility. Ground meshes use conservative bounds; rotated slopes are not simulated accurately. Spawn points should be above the floor and outside obstacles.
Choose Move, Rotate or Scale in the viewport toolbar, select an object and drag a handle. Snap uses 0.25-unit translation, 15-degree rotation and 0.1 scale increments. A completed drag is recorded in undo history. Imported GLB materials remain unchanged; primitive and character materials use Babylon PBR with color, metallic, roughness and emission controls. The scene has direct lighting, not an environment reflection pipeline.
World physics settings, material parameters and transform changes are saved in project JSON and exported games.

## Gameplay, animation and modeling
Gameplay Studio exposes ordered start, collect, goal-entry and respawn rules with a minimum-score condition and score, message or win actions. Rules are declarative; no user code runs. Default auto-win behavior can be disabled. Score and message reset on respawn; collecting an item dispatches one event until respawn.
Animation Studio supports decorative object transform keyframes with linear interpolation and looping. Create a key at zero, edit the base transform, capture another pose at a later time, and scrub to preview. The animation plays in the editor and exported games. Ground and gameplay objects are excluded to keep physics static. No skeletal animation or moving colliders yet.
Model Studio supports editable cube topology, numeric vertex positions, duplicate/delete vertex, add/delete triangle and triangle subdivision. Models are decorative meshes with flat shading and a limit of 2,048 vertices and 4,096 triangles per model. Mesh data persists in projects and prefabs; no interactive vertex picking, UV editing or sculpting yet.

## AI command boundary
AI Studio accepts a JSON edit plan, validates each bounded command, previews changes including field-level details, and applies the entire plan as one undoable edit. No arbitrary code or URLs are executed. A project context prompt can be copied to a separate model manually. There are no live provider connections or API key storage; secure BYOK remains future work.

## Verification
Run npm test, npm run build, npx playwright install chromium, npm run test:e2e. CI now runs Chromium smoke tests with software WebGL, including local save/restore, play mode, HTML export, event rules and mesh/animation editing. A passing CI run does not certify all devices or production capacity.

## Current limitations
Static conservative bounding-box character collisions only; no dynamic rigid bodies, joints, slopes, moving-platform physics, touch controls, unrestricted mesh imports, linked prefab inheritance, rigging, skeletal animation, live AI providers or cloud services. Rendering is WebGL. IndexedDB is not a durable backup; multiple tabs can overwrite the same active project. CI uses npm install until a verified lockfile can be generated. CI and browser results must be confirmed before merging. This is an experimental milestone, not a production release.
