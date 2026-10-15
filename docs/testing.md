# Testing and validation

## Test layers

### Backend

```bash
make test-back
```

This mounts `backend/` into a Maven/Temurin 24 container and runs `mvn -q test`.
Backend tests use the test application configuration and H2 where appropriate.

### Frontend

```bash
make test-front
```

This installs frontend dependencies in a Node 22 container and runs Vitest with
coverage enabled. The frontend test suite covers services, components, routing,
authentication, and chat behavior.

### End to end

```bash
make test-e2e
```

The target removes existing Compose services and volumes, starts PostgreSQL,
backend, and frontend, then runs the Playwright image under the `e2e` profile.
The suite verifies:

- unauthenticated route protection;
- invalid login behavior;
- registration and login;
- logout and renewed route protection;
- room creation and navigation;
- real-time delivery between two authenticated browser contexts.

The E2E tests create uniquely named users and clean up test messages. Because the
target resets the Compose database, do not run it against a database containing
data you need to keep.

## Quality checks

```bash
make lint-back   # Maven verify, including Spotless
make lint-front  # ESLint and Prettier check
```

The frontend CI additionally runs a production Angular build and the backend CI
uses JDK 24. CI uses Node 22 for frontend build, test, lint, and formatting.

## Troubleshooting failures

- Check `make ps` and `make logs` first.
- If the backend cannot connect to PostgreSQL, verify the root `.env` values and
  that Compose uses `POSTGRES_HOST=postgres` and `POSTGRES_PORT=5432`.
- If migrations or credentials are stale, stop and reset with `make clean`, then
  rerun `make run`.
- If a port is occupied, change the host-side mappings in `compose.yml` and keep
  `FRONTEND_ORIGIN` aligned with the browser URL.
- If a WebSocket test fails, verify that the frontend origin is allowed and that
  the client is using `http://` during local development.
