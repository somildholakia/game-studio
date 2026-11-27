# Static editor deployment and rollback

The static editor is an experimental client-only distribution. Its local AI, GitHub and multiplayer development gateways are not included. Do not expose the development server on the public internet, and do not represent this artifact as the complete cloud platform.

## Build and validate
Use Node.js 22 and the checked-in lockfile at the exact revision you intend to release:

```sh
npm ci
npm test
npm run build
node --test scripts/static-release.test.mjs
node scripts/static-release.mjs write dist
node scripts/static-release.mjs verify dist
npx playwright install chromium
npm run test:e2e
```

For CI builds the manifest records the checkout commit (including a PR merge commit when applicable). Local builds use the label local; record the actual Git commit separately. The manifest records each regular file's size and SHA-256, excluding itself. It detects accidental corruption and unexpected files; it is not a cryptographic signature and does not prove provenance.

Validate uploads the exact dist directory after successful Chromium E2E, as static-editor-<checkout SHA>. Use the artifact from the intended successful run; separately confirm its browser matrix and required release gates. Artifacts expire after 14 days; keep an approved copy in controlled versioned storage before expiry.

## Deploy or upgrade
1. Download and extract the successful artifact. Run the verifier from the corresponding source revision against the extracted directory. Do not regenerate its manifest to make verification pass.
2. Publish the entire directory to a new staging release at the root of an HTTPS origin (the current build assumes root-relative assets). Serve .js as JavaScript, .css as CSS and .html as HTML. Do not publish source files, node_modules, environment files or development server endpoints.
3. Use no-cache/revalidation for index.html and immutable caching for hashed assets. Keep the previous release assets available during rollout. Switch the origin atomically to the complete staged version after testing; do not overwrite individual files in place.
4. Test loading, adding and editing a mesh, local save/reload, project export, playable HTML export, and offline game launch in the target browsers. Before upgrading an existing workspace, export its project JSON. Local data is browser/origin scoped; changing hostname does not migrate IndexedDB. Keep a backup before changing versions.
5. If staging or production smoke checks fail, atomically point the origin back to the previous verified complete release. Recheck the smoke tests and restore an exported project if required. Do not assume an older editor can read projects created by newer schema versions.

## Publishing a game
Export playable HTML in the editor and test the downloaded file offline. A game can be hosted as index.html on its own static HTTPS origin; its embedded runtime and assets require no editor server. Test the uploaded game in that origin and ensure the host allows its self-contained script and asset policy. The separate hosted publishing UI produces a multi-file static website ZIP. Public service deployment, tenant isolation, live AI provider credentials and real-device acceptance remain open. No external host was provisioned by the build workflow.


### Streamable website ZIP
1. In the editor Projects workspace choose **Export hosted website ZIP**. Extract all files together, preserving index.html, player.js, levels/ and assets/ paths. Do not publish editor source, local gateway endpoints or credentials.
2. Put the complete extracted release under a new versioned HTTPS origin or subdirectory. Serve HTML as text/html, player.js as JavaScript and .gstudio files as application/octet-stream; do not rewrite them to index.html. A localhost static server works for development.
3. Test the first level, transition, restart, progress export/import and corruption recovery. The initial page requests only the active level and required model chunks; asset content hashes deduplicate within the package. Keep each release path immutable, and use a new versioned prefix for upgrades: level filenames and player.js are not content-hashed, and compression bytes may differ across exporters even for the same raw asset digest. Do not mix files from different releases.
4. Roll back by linking the previous complete release. SHA-256 verifies consistency against the embedded manifest, not publisher identity; no signatures or cloud deployment are implied. The game origin can access its same-origin package files, and arbitrary external provider calls are not required.

The browser regression serves actual exported files on an ephemeral loopback HTTP server, tests lazy level delivery, corrupt-level rejection and retry, and validates actual GLB dependency fetching. It does not provision or certify a public hosting provider.
