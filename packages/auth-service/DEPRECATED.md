# packages/auth-service is deprecated

This package was historically used as a deployment wrapper for the authentication
service. The canonical, open-source implementation now lives in
`packages/auth/src` and should be used as the single source of truth for
authentication code (library + FastAPI app).

Recommended actions for maintainers:

- Do not add feature changes to `packages/auth-service`.
- Migrate any deployment-specific logic into `packages/auth/` (enterprise dockerfile,
  config, or a small wrapper script) and update `docker-compose` to build from
  `./packages/auth` (already applied in repo).
- Preserve this directory only as an archive until fully removed; delete it
  later once CI and deployment pipelines are updated.

If you need help migrating CI/docker builds or updating deployment manifests,
open an issue or assign to the platform/infrastructure team.


