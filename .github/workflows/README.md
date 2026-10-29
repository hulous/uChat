# Continuous integration

The `CI` GitHub Actions workflow validates the backend, frontend, dependencies,
and end-to-end application on pushes and pull requests targeting `main` or
`master`. It also runs a weekly dependency audit and can be started with
`workflow_dispatch`.

## Jobs

- **build-backend** checks the Spring Boot project with JDK 24 and Maven
  `verify`.
- **build-frontend** installs Node.js 22 dependencies, runs frontend tests,
  builds Angular, runs ESLint, and checks Prettier formatting.
- **dependency-audit** runs `npm audit --audit-level=high` for the frontend and
  E2E projects.
- **dependency-check** runs OWASP Maven Dependency-Check and fails at CVSS 7.0
  or higher.
- **dependency-review** runs GitHub Dependency Review on pull requests and
  fails on high-severity changes.
- **e2e** waits for the backend and frontend jobs, creates a temporary `.env`
  from GitHub variables/secrets, validates required database/JWT values without
  printing them, starts Compose, verifies PostgreSQL plus backend and frontend
  readiness, and runs deterministic smoke and real-time tests separately.
  Playwright retries, traces, screenshots, and videos plus Compose status and
  service logs are uploaded when the job fails. Missing values fail the job
  before services start.

## Local equivalents

Run these commands from the repository root:

```bash
make test
make lint-back
make lint-front
make test-e2e
make test-e2e-smoke
make test-e2e-realtime
```

The E2E target starts PostgreSQL, the backend, and the frontend with Compose,
waits up to 180 seconds for all service health checks and HTTP probes to pass,
then runs Playwright through the `e2e` profile. Set
`E2E_READINESS_TIMEOUT_SECONDS` to change the bounded readiness timeout. See the
[testing guide](../../docs/testing.md) and the
[development guide](../../docs/development.md) for details.
