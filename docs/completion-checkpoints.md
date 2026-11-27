# Completion checkpoints

The long-term target is a browser-native game creation platform, not just an editor demo. The following provisional acceptance rubric makes the midpoint target auditable. Each of the ten categories is weighted equally (10 points); each listed acceptance test is worth two points. Mark a test complete only after its stated evidence exists at a current verified revision. Do not count prototypes as complete where the requirement explicitly calls for a production capability. The rubric is an engineering planning convention, not a measured percentage of implementation effort or parity with Blender/Unreal.

| Category | Five acceptance tests (2 points each) |
|---|---|
| Foundation | repeatable locked build; browser matrix; modular typed editor/runtime; recovery with retained authored data on supported GPUs; documented deployment and upgrade process |
| Editor | scene/object editing and undo; multi-level workflows; reusable prefab editing; accessible keyboard-first workflow; verified mobile authoring |
| Modeling | bounded topology editing; mesh import/export; smooth normals/UV editing; nondestructive modifier and Boolean workflows; complex model performance benchmark |
| Animation | transform keyframes; articulated character timeline; skeletal skinning; animation blending/retargeting; inverse kinematics |
| Assets/materials | local asset validation; image/procedural textures; material library; shader editing; scalable asset streaming and compression |
| Gameplay/runtime | no-code scoped events and gates; movement, checkpoints, lives and platforms; campaign progression and portable saves; complete rigid-body/contact physics; profiling and device-budget benchmarks |
| AI/tools | validated preview/undo; provider integration with verified live calls; reusable declarative tools; isolated executable extension SDK; substantial end-to-end game generation evaluation |
| Multiplayer/collaboration | local presence transport; authoritative synchronized gameplay; secure identity/matchmaking; collaborative editing/conflict resolution; multi-client network/load testing |
| Publishing/cloud | playable offline export; versioned Git project persistence; hosted publishing workflow; durable cloud backup/restore; authenticated tenant isolation |
| Release quality | automated regression coverage; security/dependency/fuzz audit; real-device/accessibility verification; monitoring/load/incident plan; release candidate acceptance |

**Scoring protocol:** maintain a separate evidence record with links to commits, CI runs and manual test reports. Full credit requires the complete acceptance test, not merely code or a passing unit test. A cancelled or superseded run is not a passing browser matrix. Re-evaluate the evidence when the branch changes. Remaining requirements in [release-gates.md](release-gates.md) are mandatory for production regardless of the numerical score. The 50-point threshold is not yet certified by this checklist.
