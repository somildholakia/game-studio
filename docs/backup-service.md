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
