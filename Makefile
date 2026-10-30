DOCKER = docker
COMPOSE = $(DOCKER) compose
ROOT = $(CURDIR)
MAKE_CMD = $(MAKE)
BACK_TEST_IMAGE = maven:3.9.9-eclipse-temurin-24
FRONT_TEST_IMAGE = node:22-bookworm-slim

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

ps: ## List local services
	$(COMPOSE) ps

logs: ## Follow local service logs
	$(COMPOSE) logs -f

build: ## Build local services
	$(COMPOSE) build

up: ## Start app local services
	$(COMPOSE) up

upd: ## Start app local services in detached mode
	$(COMPOSE) up -d

run: ## Build and run the app and database through Docker Compose
	$(COMPOSE) up --build

down: ## Stop local services
	$(COMPOSE) down

test-back: ## Run backend unit tests in Docker
	$(DOCKER) run --rm -v $(ROOT)/backend:/workspace -w /workspace $(BACK_TEST_IMAGE) mvn -q test

test-front: ## Run frontend unit tests in Docker
	$(DOCKER) run --rm -v $(ROOT)/frontend:/workspace -w /workspace $(FRONT_TEST_IMAGE) bash -lc "npm install && npm test -- --watch=false"

e2e-up: ## Start E2E services and wait for readiness
	$(COMPOSE) down --volumes --remove-orphans
	$(COMPOSE) up --build -d uchat-postgres uchat-backend uchat-frontend
	./scripts/wait-for-e2e-services.sh
	$(COMPOSE) --profile e2e build uchat-e2e

test-e2e: e2e-up ## Run end-to-end tests against Docker Compose services
	$(COMPOSE) --profile e2e run --rm uchat-e2e

test-e2e-smoke: ## Run deterministic browser smoke tests against ready Compose services
	$(COMPOSE) --profile e2e run --rm uchat-e2e npx playwright test --grep-invert "real time"

test-e2e-realtime: ## Run real-time browser scenarios against ready Compose services
	$(COMPOSE) --profile e2e run --rm uchat-e2e npx playwright test --grep "real time"

lint-back: ## Run backend lint and formatting checks in Docker
	$(DOCKER) run --rm -v $(ROOT)/backend:/workspace -w /workspace $(BACK_TEST_IMAGE) mvn -q verify

lint-front: ## Run frontend lint and formatting checks in Docker
	$(DOCKER) run --rm -v $(ROOT):/workspace -w /workspace/frontend $(FRONT_TEST_IMAGE) bash -lc "npm install && npm run lint && npm run format:check"

test: ## Run backend and frontend tests in Docker
	$(MAKE_CMD) test-back
	$(MAKE_CMD) test-front

clean: ## Stop local services and remove build artifacts
	$(COMPOSE) down --volumes --remove-orphans
	-rm -rf backend/target frontend/node_modules frontend/dist
