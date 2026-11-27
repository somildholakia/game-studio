# Private backup reference service

The new server/backup-store.mjs and server/backup-api.mjs modules provide a separate single-process Linux filesystem reference implementation, intentionally not enabled by the public/static editor or existing Vite dev middleware. The HTTP server is created with createBackupServer({store, authenticate}); bind to 127.0.0.1 for local testing. The supplied authenticator accepts only 32-byte random hex bearer tokens, stores their SHA-256 hashes, and derives the tenant and write permission from trusted configuration. Never commit actual credentials or backup data. There is no browser credential storage, cookie session or cross-origin API.

## HTTP contract

All routes require Authorization: Bearer followed by the configured token. The tenant is never taken from the URL, query string or body. Projects have bounded ASCII identifiers. For a project ID game:

| Method and path | Behavior |
|---|---|
| GET /v1/projects/game/revisions | List revision numbers and SHA-256 digests |
| GET /v1/projects/game/revisions/1 | Download exact immutable bytes with integrity check |
| PUT /v1/projects/game/revisions | Append JSON object with If-Match: "0" for first revision, or current revision number |
| POST /v1/projects/game/revisions/1/restore | Restore old revision as a new version; same If-Match precondition; empty body |

Stale writes return 409; missing precondition 428; missing/invalid credentials 401; read-only writes 403; missing revisions 404. The adapter bounds projects (16 per tenant), versions (16 per project) and size (10 MB per revision); it rejects further writes at quota instead of silently deleting history. It validates JSON encoding/object shape at the HTTP boundary, not the complete editor project schema; imported backup content must still pass the existing project parser.

## Storage and security boundaries

Use a dedicated private service-owned root on a Linux filesystem that supports atomic hard links and directory fsync. One process only. Immutable revisions are written to a unique temporary file, fsynced, linked into the revision namespace and the directory fsynced. Restores append a revision, not overwrite history. Reads check SHA-256; optimistic revision numbers reject stale clients. The process must exclusively control its root (no untrusted filesystem writers or symlinks). A crash can leave temporary files; operators must monitor disk and clean abandoned temp files only while the service is stopped. The adapter does not protect against filesystem compromise, loss of the entire disk or multi-process races. Per-tenant authorization is service-token scoped, not end-user authentication.

Production requires OIDC or equivalent identity, short-lived/revocable credentials, TLS, secure secrets/configuration, tenant membership authorization, audit logging, per-tenant rate limits, transactional metadata/object storage, encryption and separate off-site copies with tested disaster recovery. The filesystem adapter and tests alone do not close those gates.

Run node --test scripts/backup-store.test.mjs scripts/backup-api.test.mjs. Both are also included by the existing CI Node test glob. Tests use temporary directories and real ephemeral loopback sockets; no external services or secrets.

## Signed access-token option

The same API accepts createJwtBackupAuthenticator from server/backup-jwt.mjs in place of the opaque-token authenticator. Configure a trusted HTTPS issuer string, one audience, a provisioned RSA public JWKS, and server-side subject-to-tenant membership records. It accepts only the strict RS256 access-token profile (typ at+jwt or application/at+jwt), pinned key IDs, valid signature, issuer/audience, short lifetime and read scope; write requires both trusted membership permission and backup:write. Token-supplied tenant claims never determine storage location. Unknown keys and subjects fail closed; token-controlled key URLs and other header extensions are rejected. The operator must provision and rotate keys from the trusted issuer and refresh membership configuration securely. No live issuer discovery, automatic key refresh, interactive login, revocation endpoint, or real issuer has been verified. Run node --test scripts/backup-jwt.test.mjs. Tests generate ephemeral RSA keys and use real loopback HTTP, never real credentials.


## Generation-conditional cloud backend and recovery

The asynchronous cloud adapter is in server/cloud-backup-store.mjs. It uses an immutable SHA-256-addressed blob per project and a single generation-conditional tenant index. The index atomically enforces the same per-tenant project and per-project revision quotas across independent service instances. Stale writes fail with 409; concurrent writes to different projects may retry the index CAS. Content is verified on upload, read and restore. No index is published until all referenced bytes are verified. Failed concurrent operations may leave unreferenced blobs; use a separately reviewed retention/garbage-collection process rather than deleting referenced history.

server/gcs-objects.mjs implements the Google Cloud Storage JSON API using a trusted server-side OAuth access-token supplier, generation-specific reads and conditional media uploads (ifGenerationMatch=0 for creation; current generation for compare-and-swap). No arbitrary endpoint or redirects, no browser storage credentials. Reference: https://cloud.google.com/storage/docs/json_api/v1/objects/get and https://cloud.google.com/storage/docs/json_api/v1/objects/insert. The adapter is tested against a real loopback HTTP implementation of these contracts, not a provisioned Google bucket.

### Private service startup

Provision a private bucket with appropriate IAM, encryption, versioning/retention and monitoring. Use a workload-identity agent to atomically rotate a short-lived OAuth access token in a private file; the service reads it per request. Create a private JSON configuration outside the repository with bucket, tokenFile, port (1024–65535), issuer, audience, jwksUrl and subjects (array of {sub,tenant,write}). The trusted JWKS endpoint must be HTTPS, explicitly pinned, and use the supported RS256 access-token profile. The identity cache coalesces refresh, limits unknown-key refresh attempts and fails closed after expiration. The membership mapping remains trusted operator configuration, not a full identity administration or multi-tenant user login system.

Run node server/cloud-service.mjs /private/service.json. It starts only after trusted signing keys load, binds to loopback, and supports graceful shutdown. Put an authenticated HTTPS reverse proxy in front with appropriate request limits, audit and monitoring. No service is automatically deployed by this command. Never commit configuration or token files.

### Separate-storage replication and recovery

Use an independent destination bucket and identity with scoped permissions. A private replication config contains sourceBucket, sourceTokenFile, destinationBucket, destinationTokenFile. Run node scripts/replicate-cloud-tenant.mjs /private/replication.json tenant-id. It copies a consistent source tenant index and all referenced verified content, rejects divergent destination history, and publishes the destination index only after content verification. Use the same command with the backup as source and a replacement bucket as destination to recover after primary loss. Configure separate credentials/retention, schedule and verify the operation externally; this implementation does not configure a recurring backup or cloud infrastructure automatically.

For a real provider acceptance drill, create three separately provisioned test buckets with private credentials and an isolated cost budget. Set GAME_STUDIO_LIVE_CLOUD=1 and run node scripts/live-cloud-acceptance.mjs /private/acceptance.json with a config containing buckets: [{bucket,tokenFile},{bucket,tokenFile},{bucket,tokenFile}]. This writes a unique synthetic tenant, tests conflict rejection, copies history to the second bucket, recovers using only the second and third buckets, verifies bytes and historical restore. It prints a categorical JSON result and the synthetic tenant ID; it leaves small synthetic artifacts for authorized operator cleanup. No real bucket test has been performed, and no cloud durability or production tenant gate is closed merely by this harness.
