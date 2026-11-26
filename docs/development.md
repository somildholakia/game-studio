# Development and creator workflows

Node.js 22+. Run npm install, npm run dev, npm test and npm run build. Dev and build generate an embedded IIFE player bundle. The development server binds to loopback; the built static editor does not expose credentialed integrations.

## Playable games
Load Treasure Run, Sky Steps or Meadow Explorer. Press Play; move using WASD, arrows or on-screen controls, jump with Space or Jump. Collect items and reach the goal. Stop restores the authored scene. Assign roles (decoration, player, solid, collectible, goal) to supported primitives and characters. One player per scene. Undo/redo, project JSON export and self-contained HTML game export are supported. No native executable builds or multiplayer yet.

## Project management and assets
The active workspace autosaves to IndexedDB. Legacy localStorage data migrates without deleting its old backup. The named project library stores independent snapshots; Save project copy, Open, Update or Delete explicitly. These are snapshots, not multiple automatically saved live workspaces. Browser storage can be evicted, and concurrent tabs can overwrite the active workspace; export backups.
Import a self-contained uncompressed GLB (2 MiB per file, 3 MiB aggregate); external URIs and glTF extensions are rejected. Models retain their materials and are decorative. The import policy is not a full glTF security validator. Prefabs are independent reusable snapshots. Extension packs export and import validated prefabs, referenced models and declarative gameplay rules, with fresh IDs. They are data-only, not executable plugins.

## Physics and editing
Static swept axis-aligned collisions, gravity, jumping, raised platforms, respawn, height-aware triggers and fixed-substep integration. Direct move/rotate/scale handles with optional snapping and undo. Character collisions remain conservative bounds. No dynamic bodies, joints, general slopes or moving-platform physics.

## Terrain and environment
Create a terrain object and edit its seed, grid resolution, amplitude and frequency. It uses deterministic triangle heights for rendering and center-point ground contact; terrain is axis aligned with positive scale and cannot be assigned another gameplay role or animated. Large cliffs, overlapping heightfields and extreme scales have limitations; this is not general mesh collision. Meadow Explorer is a terrain example.
Environment Studio sets sky/background color, ambient and directional light, sun direction, intensity and color, and exponential fog. Day, sunset and night presets are static settings, not an animated weather system. No HDR environment map, shadow pipeline or volumetric lighting yet.

## Modeling, characters and animation
Model Studio supports editable cube topology, numeric vertex editing, vertex duplicate/delete, triangle add/delete, subdivision, validation and flat shading. Limits: 2,048 vertices and 4,096 triangles per mesh. Custom models are decorative. No sculpting, UV editor, interactive vertex picking or Boolean tools.
Characters are procedural articulated low-poly figures with adjustable proportions, skin, clothing, hair, shoes, and nine joint angles. Automatic walking and jumping poses drive the player when enabled. This is a rigid mesh hierarchy, not skinned skeleton animation, inverse kinematics or motion retargeting.
Transform keyframes support decorative objects, linear interpolation, looping and scrubbing. Ground, terrain and gameplay roles are excluded to preserve static collision. PBR primitive materials support color, roughness, metallic and emission.

## Gameplay and audio
Ordered event rules support start, collect, goal entry and respawn, minimum score conditions and score, message or win actions. No arbitrary scripts. Default win behavior can be disabled.
Audio Studio generates bounded synthesized oscillator sound effects for start, collect, jump, respawn and win; adjust waveform, duration, pitch and volume. Browser autoplay restrictions require interaction. No audio file imports, spatial mixing or music timeline.

## Local AI and GitHub integrations
Run npm run dev on localhost. AI Studio accepts a manually pasted JSON plan or requests a plan from OpenAI, OpenRouter or Anthropic using the local gateway. User consent is required before sending project context to a provider; charges may apply. Provider keys are transient and never serialized with projects. Generated commands are validated, reviewed and applied as one undoable edit. No code is executed.
GitHub project integration accepts a user-supplied least-privilege repository token, a target branch and a .game-studio.json file path. Inspect before committing; use the inspected file SHA for updates. Files are limited to 750 KB. Public repositories expose saved project contents. No OAuth, cloud synchronization, LFS or GitHub App yet.
The gateways are loopback and same-origin only, intended for local development. Do not deploy them publicly without authentication, rate limits, tenant isolation, secret management, abuse protection and security review. Live credentials and external provider calls have not been verified in CI.

## Verification
Run npm test, npm run build, npx playwright install chromium, npm run test:e2e. CI includes software WebGL Chromium tests for authoring, persistence, play, export, gameplay, mesh/animation, AI plan approval, terrain and character controls. Local gateway tests use mocked upstream responses. See release-gates.md for the production checklist. No full engine parity or million-user claim.
