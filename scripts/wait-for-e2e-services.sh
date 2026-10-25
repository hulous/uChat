#!/usr/bin/env bash
set -euo pipefail

timeout_seconds="${E2E_READINESS_TIMEOUT_SECONDS:-180}"
deadline=$((SECONDS + timeout_seconds))

until [ "$SECONDS" -ge "$deadline" ]; do
  postgres_health="$(docker compose ps --format '{{.Service}} {{.Health}}' uchat-postgres 2>/dev/null || true)"
  backend_health="$(docker compose ps --format '{{.Service}} {{.Health}}' uchat-backend 2>/dev/null || true)"
  frontend_health="$(docker compose ps --format '{{.Service}} {{.Health}}' uchat-frontend 2>/dev/null || true)"

  if [ "$postgres_health" = "uchat-postgres healthy" ] &&
    [ "$backend_health" = "uchat-backend healthy" ] &&
    [ "$frontend_health" = "uchat-frontend healthy" ] &&
    curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8050/actuator/health >/dev/null &&
    curl --fail --silent --show-error --max-time 5 http://127.0.0.1:4250 >/dev/null; then
    echo "E2E readiness passed: PostgreSQL, backend, and frontend are healthy."
    exit 0
  fi

  sleep 2
done

echo "E2E readiness failed after ${timeout_seconds}s." >&2
docker compose ps -a >&2 || true
exit 1
