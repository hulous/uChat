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
backend, and frontend, waits for PostgreSQL, `/actuator/health`, and the
frontend HTTP endpoint to become ready, then runs the Playwright image under the
`e2e` profile. The readiness timeout is 180 seconds by default and can be
changed with `E2E_READINESS_TIMEOUT_SECONDS`.

For faster deterministic coverage or to isolate the longer WebSocket scenario:

```bash
make test-e2e-smoke
make test-e2e-realtime
```

In CI, Playwright retries failed tests twice and reports each retry. Failed
tests retain traces, screenshots, and videos in `e2e/test-results`; CI also
uploads Compose status and PostgreSQL/backend/frontend logs.
The suite verifies:

- unauthenticated route protection;
- invalid login behavior;
- registration and login;
- logout and renewed route protection;
- room creation and navigation;
- real-time delivery between two authenticated browser contexts;
- the chat message presentation, including the sender, ISO datetime metadata,
  and message content.

The E2E tests create uniquely named users and clean up test messages. Because the
target resets the Compose database, do not run it against a database containing
data you need to keep.

When changing chat rendering or message accessibility, run the focused browser
test first:

```bash
docker compose --profile e2e run --rm e2e \
  npx playwright test tests/chat.spec.ts
```

Each rendered message is expected to keep its semantic structure: an `article`
with a `time[datetime]`, a `strong` sender name, and a
`.chat-message-content` message body. The body preserves intentional newlines
and wraps long unbroken text instead of overflowing the chat window.

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
  that Compose uses `POSTGRES_HOST=uchat-postgres` and `POSTGRES_PORT=5432`.
- If migrations or credentials are stale, stop and reset with `make clean`, then
  rerun `make run`.
- If a port is occupied, change the host-side mappings in `compose.yml` and keep
  `FRONTEND_URL` aligned with the browser URL.
- If a WebSocket test fails, verify that the frontend origin is allowed and that
  the client is using `http://` during local development.
