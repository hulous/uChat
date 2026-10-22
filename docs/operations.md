# Production operations

This document defines the minimum operating contract for uChat. The checked-in
Compose file is a local-development workflow, not a production deployment
manifest. The platform operator owns the controls below; the application team
owns the application-level signals and migration files.

## Deployment boundary

- Run PostgreSQL on a managed or separately operated service. Do not expose the
  database port to the public network.
- Run the backend and frontend behind a reverse proxy or load balancer. TLS
  terminates at that boundary, HTTP is redirected to HTTPS, and WebSocket
  upgrade headers are forwarded to the backend.
- Run exactly one production backend instance. The application currently uses
  Spring's in-memory simple WebSocket broker, so topic and user-queue events do
  not fan out between backend instances; sticky sessions do not provide that
  synchronization. Add a broker relay or another clustered messaging design,
  with an explicit validation plan, before scaling the backend horizontally.
- Set `FRONTEND_ORIGIN` to the exact public HTTPS origin(s). Do not retain
  `localhost`, an internal Compose hostname, or a wildcard in production.
- Do not publish Actuator, Swagger, or OpenAPI endpoints to the public
  internet. Allow health probes only from the orchestrator and restrict
  diagnostic access to operators.
- Keep production configuration outside the image. The image may be promoted
  between environments; environment-specific secrets and URLs must be injected
  at deployment time.

### Release and rollback

1. Build and scan an immutable backend/frontend image and record its digest.
2. On the single backend instance, apply the release using a brief drain or
   maintenance window; do not run multiple backend instances concurrently.
3. Verify readiness, authentication, REST requests, and an authenticated
   WebSocket connection before shifting all traffic.
4. Roll back the application image if these checks fail or an alert fires.
5. A rollback does **not** roll back Liquibase changes. Take a database backup
   before a release containing a migration, and make migrations backward
   compatible with the previous application for the rollout window.
6. If a migration is destructive or irreversible, stop the rollout and use a
   separately reviewed forward-fix or restore procedure; never experiment with
   production data during an image rollback.

## Secrets and configuration

Inject these values from the deployment platform's secret/configuration store:
`POSTGRES_PASSWORD`, `JWT_SECRET_TOKEN`, and any telemetry credentials such as
`APPSIGNAL_PUSH_API_KEY`. The database host, port, name, application port, and
`FRONTEND_ORIGIN` are configuration values but must still be environment
specific.

- Use a unique, high-entropy JWT secret per environment and rotate it through a
  planned session invalidation window.
- Never put secrets in Git, Docker image layers, CI logs, command-line
  arguments, crash dumps, or rendered configuration.
- CI may use repository/environment secrets, but must mask them and use
  short-lived credentials where the platform supports them.
- Production PostgreSQL connections must use server-authenticated TLS
  (`sslmode=verify-full` or the platform equivalent), including hostname
  verification against a trusted CA bundle. The local Compose
  `sslmode=disable` setting is not a production default.
- Validate that required variables are present, non-empty, and environment
  scoped before deployment. Fail the deployment rather than substituting local
  defaults.

## Logging and redaction

Production log collection must emit one structured event per line (JSON is
preferred) with, where available:

`timestamp`, `level`, `service`, `environment`, `release`, `logger`,
`trace_id`, `request_id`, `method`, `route`, `status`, `duration_ms`, and
`user_id` (a stable opaque identifier, never an email address).

Log authentication failures, migration failures, database connectivity errors,
WebSocket connect/disconnect outcomes, and unexpected exceptions with a
correlation identifier. Do not log passwords, JWTs or `Authorization` headers,
cookies, database URLs/credentials, API keys, session identifiers, or message
content. Redact these values before serialization and again in the central log
pipeline. Use counts and message IDs (if non-sensitive) for message diagnostics,
not message bodies. Access to logs is restricted to the operations and security
owners.

## Health, metrics, and alerts

The backend health endpoint is `/actuator/health`. Expose it to the orchestrator
as a readiness check and use a separate process/liveness check. A readiness
failure removes an instance from traffic; it must not automatically restart a
healthy process. Alert owners and defaults:

| Signal | Default alert | Owner and action |
| --- | --- | --- |
| Readiness or database health | Any production instance unhealthy for 2 minutes | Platform owner: inspect database connectivity, pool exhaustion, and recent migrations |
| HTTP 5xx rate | >2% for 5 minutes or any sustained error increase after deploy | Backend owner: correlate `trace_id`, roll back the release if canary checks fail |
| REST/WebSocket connection failures | >5% for 5 minutes | Backend owner: check TLS proxy upgrades, origin configuration, authentication, and capacity |
| p95 request latency | >1 second for 10 minutes (or the service SLO) | Backend owner: inspect database latency and slow endpoints |
| Database backup | No successful backup within 25 hours | Platform owner: stop risky releases and repair backup delivery |
| Migration | Liquibase failure or pending migration at startup | Release owner: stop rollout; use the migration rollback boundary above |

The current application includes Spring Boot Actuator but does not include a
Prometheus registry or an exposed production metrics endpoint. Until a metrics
exporter is deliberately enabled and access-controlled, derive the HTTP error
and latency signals from the reverse proxy/APM and application logs. Do not
expose `/actuator/metrics` as an unauthenticated public endpoint.

## Backups and restore

- Use automated, encrypted, access-controlled PostgreSQL backups with point-in-
  time recovery where supported.
- Retain at least daily backups for 30 days and copy them to a separate failure
  domain. Record the retention decision and owner with the service inventory.
- Before every release that changes the schema, verify a recent backup and
  capture the Liquibase version.
- Quarterly, restore a backup into an isolated database, verify row counts and
  application connectivity, and record the restore duration and result.
- For an incident, freeze writes if needed, identify the recovery point, restore
  into a new database, validate migrations and health, then switch the
  application connection through the deployment mechanism. Preserve the
  original database until the incident review is complete.

## Migration procedure

Review every Liquibase change set for locking, duration, data volume, rollback
behavior, and compatibility with the previous release. Run it against a
production-sized staging copy, back up production, deploy the migration with
the application release, and verify `/actuator/health` plus representative
login and chat flows. Liquibase owns schema state; do not use
`spring.jpa.hibernate.ddl-auto` to modify production schema.

## Operator checklist

- [ ] Image digests, release owner, and rollback image are recorded.
- [ ] Required secrets are injected from the secret store and are absent from
      logs and image layers.
- [ ] TLS, reverse-proxy WebSocket upgrades, and exact `FRONTEND_ORIGIN` are
      verified.
- [ ] Database TLS, backup freshness, restore evidence, and migration review
      are verified.
- [ ] Readiness is reachable only by the orchestrator; diagnostics are
      operator-only.
- [ ] Structured logs, redaction, dashboards, and the alerts above are active.
- [ ] Canary login, REST, and authenticated WebSocket checks pass.
