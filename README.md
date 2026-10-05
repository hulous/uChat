# uChat

uChat is a real-time chat application built with an Angular frontend, a Spring Boot backend, PostgreSQL, and WebSocket messaging. Users can register, authenticate with JWT, and exchange messages in the chat interface.

## License

This project is licensed under the Business Source License 1.1. See [LICENSE](LICENSE) for the full terms and project-specific parameters.

## Architecture

The project is split into four Docker Compose services:

- **Frontend**: Angular development server, exposed at `http://localhost:4250`.
- **Backend**: Spring Boot REST and WebSocket API, exposed at `http://localhost:8050`.
- **PostgreSQL**: Application database, exposed locally on port `5532` and available to Compose services on port `5432`.
- **E2E**: Optional Playwright test runner, enabled with the `e2e` Compose profile.

Liquibase applies database migrations when the backend starts. PostgreSQL data is stored in the named `uchat_db_data` volume.

## Prerequisites

- Docker Engine with the Compose plugin
- GNU Make

The project is intended to be built, run, and tested through Docker. No local Java, Maven, Node.js, or PostgreSQL installation is required for the standard workflows.

## Configuration

Compose loads environment variables from the root `.env` file. The required variables are:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_HOST` | Database hostname used by the backend; use `postgres` in Compose |
| `POSTGRES_PORT` | Database port used by the backend; use `5432` in Compose |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_SECRET_TOKEN` | Secret used to sign JWTs |
| `MAIN_APP_PORT` | Backend listening port |
| `FRONTEND_ORIGIN` | Allowed browser origin for REST and WebSocket clients |

If `.env` does not exist, create it with `cp backend/.env.sample.properties .env`. Replace its development values with strong, environment-specific values before using the application outside local development, and never reuse the development JWT secret in production.

Production deployment secrets are documented in [docs/configuration.md](docs/configuration.md). Configure `APPSIGNAL_PUSH_API_KEY` in the deployment secret store; do not commit its value.

## Run the application

Build and start PostgreSQL, the backend, and the frontend:

```bash
make run
```

Open the application at [http://localhost:4250](http://localhost:4250). The backend is available at [http://localhost:8050](http://localhost:8050).

Useful service commands:

```bash
make upd       # Start services in the background
make ps        # Show service status
make logs      # Follow service logs
make down      # Stop services
make clean     # Stop services, remove the database volume, and remove build artifacts
```

`make clean` deletes the local PostgreSQL data volume. Use it when you need a completely fresh database, not just to stop the application.

## Tests and quality checks

Run backend and frontend unit tests in containers:

```bash
make test
```

Run the test suites separately:

```bash
make test-back
make test-front
```

Run the Playwright end-to-end suite against freshly built Compose services:

```bash
make test-e2e
```

The E2E suite covers unauthenticated route protection, registration and login, and real-time message delivery between two users. It resets the Compose database before running and deletes the message created by the real-time test, even when that test fails.

Run backend and frontend lint/format checks:

```bash
make lint-back
make lint-front
```

List all available Make targets with:

```bash
make help
```

## Project layout

```text
backend/     Spring Boot API, persistence, security, migrations, and backend tests
frontend/    Angular application, authentication/chat services, and frontend tests
e2e/         Playwright end-to-end tests
docs/        Design and architecture diagrams
compose.yml  Docker Compose development environment
Makefile     Docker-based development, test, and quality commands
```

## API and WebSocket notes

The frontend uses the backend for authentication and chat operations. REST requests are proxied by the Angular development server, while real-time chat updates use a WebSocket/STOMP connection. The backend's allowed browser origin is controlled by `FRONTEND_ORIGIN`.

Spring Boot Actuator and Springdoc dependencies are included in the backend. API documentation is exposed by the application when the relevant endpoints are enabled by the active security configuration.

## Troubleshooting

- Check startup failures with `make logs`.
- Confirm that all services are healthy with `make ps`.
- If the database schema or credentials are stale, run `make clean` and then `make run`.
- If port `4250`, `8050`, or `5532` is already in use, stop the conflicting process or update the host-side port mapping in `compose.yml` and the matching `FRONTEND_ORIGIN` value in `.env`.
