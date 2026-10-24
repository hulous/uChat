#!/usr/bin/env bash

set -euo pipefail

missing=()

check_required() {
  if [ -z "${2:-}" ]; then
    missing+=("$1")
  fi
}

check_required POSTGRES_DB "${POSTGRES_DB:-}"
check_required POSTGRES_HOST "${POSTGRES_HOST:-}"
check_required POSTGRES_PORT "${POSTGRES_PORT:-}"
check_required POSTGRES_USER "${POSTGRES_USER:-}"
check_required POSTGRES_PASSWORD "${POSTGRES_PASSWORD:-}"
check_required JWT_SECRET_TOKEN "${JWT_SECRET_TOKEN:-}"

if [ "${#missing[@]}" -gt 0 ]; then
  printf 'Missing required environment variables: %s\n' "${missing[*]}" >&2
  exit 1
fi

printf 'Environment validation passed (%d required variables present).\n' 6
