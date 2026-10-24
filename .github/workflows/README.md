# Continuous integration

The `CI` GitHub Actions workflow validates the backend, frontend, and end-to-end
application on pushes and pull requests targeting `main` or `master`. It can
also be started with `workflow_dispatch`.

## Jobs

- **build-backend** checks the Spring Boot project with JDK 24 and Maven
  `verify`.
- **build-frontend** installs Node.js 22 dependencies, runs frontend tests,
  builds Angular, runs ESLint, and checks Prettier formatting.
- **e2e** waits for the backend and frontend jobs, creates a temporary `.env`
  from GitHub variables/secrets, validates required database/JWT values without
  printing them, and runs `make test-e2e`. Missing values fail the job before
  services start.

## Local equivalents

Run these commands from the repository root:

```bash
make test
make lint-back
make lint-front
make test-e2e
```

The E2E target starts PostgreSQL, the backend, and the frontend with Compose,
then runs Playwright through the `e2e` profile. See the
[testing guide](../../docs/testing.md) and the
[development guide](../../docs/development.md) for details.
