# Configuration and deployment

## Environment file

Compose reads variables from the root `.env` file. Start from the checked-in
template:

```bash
cp backend/.env.sample.properties .env
```

| Variable | Required | Description | Local Compose value |
| --- | --- | --- | --- |
| `POSTGRES_DB` | Yes | Database name | `uchat_chat_app` |
| `POSTGRES_HOST` | Yes | Database hostname from backend | `postgres` |
| `POSTGRES_PORT` | Yes | Database port from backend | `5432` |
| `POSTGRES_USER` | Yes | Database user | `uchat` |
| `POSTGRES_PASSWORD` | Yes | Database password | Set a local value |
| `JWT_SECRET_TOKEN` | Yes | JWT signing secret | Long random value |
| `MAIN_APP_PORT` | Yes | Backend listen port | `8050` |
| `FRONTEND_ORIGIN` | Yes | Allowed browser/WebSocket origin | `http://localhost:4250` |

The backend reads these values through Spring placeholders. Missing or invalid
values prevent reliable startup; errors should be fixed rather than bypassed.

## Compose services

`compose.yml` defines:

- `postgres`, with persistent volume `uchat_db_data` and host port `5532`;
- `backend`, built from `backend/Dockerfile`, host port `8050`;
- `frontend`, built from `frontend/Dockerfile`, host port `4250`;
- `e2e`, an opt-in Playwright service under the `e2e` profile.

The backend receives an additional internal frontend origin,
`http://frontend:4200`, so browser-origin checks work for Compose networking.

## Security requirements

- Never commit `.env`, passwords, JWT secrets, or production API keys.
- Use a unique, high-entropy `JWT_SECRET_TOKEN` in every environment.
- Use HTTPS and a narrowly scoped `FRONTEND_ORIGIN` in production.
- Store deployment secrets in the platform's secret store.
- Do not expose PostgreSQL publicly unless operationally required.

The optional production monitoring variable is:

| Variable | Purpose |
| --- | --- |
| `APPSIGNAL_PUSH_API_KEY` | Authenticates AppSignal error/performance reporting |

It is not consumed by the local Compose configuration and must be configured by
the deployment integration that sends telemetry.

## Operations

```bash
make upd    # Start in background
make ps     # Check health/status
make logs   # Follow logs
make down   # Stop, preserve database volume
make clean  # Stop and delete local database/build artifacts
```

The backend health endpoint is `/actuator/health`. The Docker health check uses
`http://127.0.0.1:8050/actuator/health`; the backend image exposes port 8080 as
metadata but the configured application port remains `MAIN_APP_PORT` (8050 in
the supplied template).

Production deployment, rollback, secret, observability, backup, and migration
requirements are maintained in the [production operations guide](operations.md).
The Compose settings in this document are local defaults and must not be copied
to production without applying that guide's security boundary.
