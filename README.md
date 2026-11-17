# uChat

uChat is a real-time chat application with direct conversations and chat rooms. It
uses an Angular single-page application, a Spring Boot REST/WebSocket API, and
PostgreSQL persistence.

## Documentation

| Guide | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Runtime topology, application boundaries, authentication, messaging, and data model |
| [Configuration and deployment](docs/configuration.md) | Environment variables, local Compose setup, production guidance, and operations |
| [Production operations](docs/operations.md) | Deployment boundaries, secrets, observability, backups, migrations, rollback, and operator checklist |
| [API and WebSocket contract](docs/api.md) | REST endpoints, authentication headers, STOMP destinations, and response behavior |
| [Development guide](docs/development.md) | Repository layout, prerequisites, local workflows, and code conventions |
| [Testing guide](docs/testing.md) | Unit, integration, E2E, lint, formatting, and CI validation |
| [Dependency management](docs/dependency-management.md) | Lockfiles, audits, suppressions, and upgrade triage |

## Quick start

### Prerequisites

- Docker Engine with the Compose plugin
- GNU Make

The supported repository workflows run Java, Maven, Node.js, Angular, PostgreSQL,
and Playwright in Docker. Local installations of those tools are not required for
the standard commands.

### Configure the environment

Create the Compose environment file:

```bash
cp backend/.env.sample.properties .env
```

The sample contains local-only placeholders. Replace `POSTGRES_PASSWORD` and
`JWT_SECRET_TOKEN` with unique, high-entropy values before sharing the
environment or using it outside local development. New PostgreSQL volumes use
password authentication. Existing volumes initialized with
`POSTGRES_HOST_AUTH_METHOD=trust` retain passwordless host authentication: set a
strong database-role password, update `pg_hba.conf` to require password
authentication, and reload PostgreSQL's configuration. Alternatively, recreate
disposable local volumes with `make clean` (which deletes local data). See
[Configuration and deployment](docs/configuration.md) for the complete variable
reference.

### Start the application

```bash
make run
```

Open the frontend at [http://localhost:4250](http://localhost:4250). The backend
listens at [http://localhost:8050](http://localhost:8050).

Useful commands:

```bash
make help       # List every supported target
make upd        # Build-independent start in the background
make ps         # Show Compose service status
make logs       # Follow all service logs
make down       # Stop services without deleting data
make clean      # Stop services and delete local build/database artifacts
```

`make clean` removes the named PostgreSQL volume. Use it when a clean database is
intentional; `make down` is the non-destructive stop command.

Compose provisions `POSTGRES_DB` when the PostgreSQL volume is initialized. The
backend does not need database-creation privileges and only connects to the
already-provisioned database. To apply a changed `POSTGRES_DB` value locally,
run `make clean` before `make run` so PostgreSQL initializes a new volume.

## Main capabilities

- Account registration, login, logout, and profile updates
- JWT-protected REST endpoints and authenticated STOMP connections
- Direct conversation history and real-time message delivery
- Public and private chat rooms
- Room creation, joining, leaving, member invitations, visibility changes, room
  closure, and member bans
- Contact management
- English and French frontend translations
- OpenAPI/Swagger documentation and Spring Boot Actuator health reporting

## Service URLs

| Service | Local URL | Purpose |
| --- | --- | --- |
| Frontend | `http://localhost:4250` | Angular development server |
| Backend | `http://localhost:8050` | REST API, SockJS/STOMP endpoint, health, and OpenAPI |
| Swagger UI | `http://localhost:8050/swagger-ui/index.html` | Interactive API explorer (public with the `dev` profile) |
| OpenAPI JSON | `http://localhost:8050/v3/api-docs` | Generated API specification (public with the `dev` profile) |
| Health | `http://localhost:8050/actuator/health` | Backend health probe |
| PostgreSQL | `localhost:5532` | Host-side database access; containers use port `5432` |

The development backend is plain HTTP. Use `http://localhost:8050`, not HTTPS.

## Repository layout

```text
backend/                    Spring Boot API, security, persistence, migrations, tests
frontend/                   Angular application, services, components, translations, tests
e2e/                        Playwright browser tests and E2E Docker image
docs/                       Maintained project documentation
compose.yml                 Local PostgreSQL, backend, frontend, and E2E services
Makefile                    Docker-based development and validation commands
.github/workflows/ci.yml    Continuous integration pipeline
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for the
full license text.
