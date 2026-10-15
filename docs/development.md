# Development guide

## Repository workflow

The repository is designed around Docker Compose and Make. From the repository
root, run `make help` to display the authoritative target list.

```bash
make run          # Build images and run in the foreground
make upd          # Start in the background
make build        # Build images only
make ps           # Inspect service state
make logs         # Follow logs
make down         # Stop services
```

The backend image builds with Maven and Java 24. The frontend and E2E images use
Node.js 22. Compose waits for PostgreSQL health before starting the backend and
waits for backend health before starting the frontend.

## Working on the backend

Backend source, resources, and tests are under `backend/src`. Run a local
backend-only verification in a container with:

```bash
make test-back
make lint-back
```

`make lint-back` runs Maven `verify`, which includes tests, JaCoCo reporting, and
Spotless formatting checks. The backend uses JPA, Bean Validation, Spring
Security, Liquibase, and MapStruct/Lombok annotation processing.

## Working on the frontend

Frontend source and tests are under `frontend/src`. Useful commands are:

```bash
make test-front
make lint-front
```

The frontend package scripts also support `npm run build`, `npm run lint`,
`npm run format:check`, and `npm test` when dependencies are installed locally.
The Angular development server uses `proxy.conf.json` so browser requests can
use relative `/api` and `/ws` paths.

## Database changes

Liquibase runs automatically when the backend starts. Add forward-only change
sets to the master changelog and verify them through the backend test/build
workflow. Reset local state with:

```bash
make clean
make run
```

This deletes the local named PostgreSQL volume and must not be used casually when
local data matters.

## Pull requests and CI

CI runs on pushes and pull requests targeting `main` or `master`, and can also be
started manually. It verifies the backend, frontend, and Playwright E2E suite in
separate jobs. The E2E job depends on the backend and frontend jobs and creates a
temporary root `.env` from GitHub variables/secrets.

Before opening a pull request, run:

```bash
make test
make lint-back
make lint-front
```

Run `make test-e2e` when changing authentication, routing, rooms, messaging,
database behavior, or cross-service configuration.
