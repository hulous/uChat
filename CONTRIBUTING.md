# Contributing to uChat

Thank you for helping improve uChat. Contributions are welcome through issues
and pull requests on GitHub.

## Development setup

The supported development workflow uses Docker Engine with the Compose plugin
and GNU Make. Local Java, Maven, Node.js, Angular, PostgreSQL, and Playwright
installations are not required.

1. Fork the repository and create a focused branch from `main`.
2. Copy the sample environment file and replace its local-only secrets:

   ```bash
   cp backend/.env.sample.properties .env
   ```

3. Start the application:

   ```bash
   make run
   ```

   The frontend is available at <http://localhost:4250> and the backend at
   <http://localhost:8050>.

Run `make help` to list all available targets.

## Tests, lint, and formatting

Run the checks relevant to your change before opening a pull request:

| Target | Purpose |
| --- | --- |
| `make test-back` | Backend unit tests |
| `make test-front` | Frontend unit tests with coverage |
| `make test-e2e` | Full Playwright E2E suite |
| `make test-e2e-smoke` | Deterministic E2E smoke tests |
| `make test-e2e-realtime` | Real-time E2E scenarios |
| `make lint-back` | Backend Maven verification and formatting checks |
| `make lint-front` | Frontend ESLint and Prettier checks |
| `make test` | Backend and frontend unit tests |

The CI workflow runs backend verification, frontend tests/build/lint/format
checks, and both E2E suites. If Docker is unavailable, the equivalent commands
are documented in `frontend/package.json`, `e2e/package.json`, and
`backend/pom.xml`.

## Pull requests

- Keep changes focused and explain the user-visible or maintenance impact.
- Include tests for behavior changes and update relevant documentation.
- Do not commit credentials, local `.env` files, generated build output, or
  dependency directories.
- Make sure the branch is up to date with `main` and all applicable checks pass.
- Complete the pull request template and link the related issue.
- Be prepared to respond to review feedback and keep the branch mergeable.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

