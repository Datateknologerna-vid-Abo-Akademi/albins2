#!/usr/bin/env bash
# shellcheck shell=bash

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This script must be sourced: run 'source env.dev.sh'."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_FILE="${ROOT_DIR}/.env.example"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env.example. Copy the template into place before sourcing env.dev.sh."
  return 1
fi

set -a
source "${ENV_FILE}"
set +a

alias alb='docker compose -f docker-compose.dev.yml'
alias alb-manage='docker compose -f docker-compose.dev.yml run --rm backend python manage.py'
alias alb-pnpm='pnpm --dir frontend'
alias albins_import_songs='docker compose -f docker-compose.dev.yml run --rm backend python scripts/import_songs.py'
alias alb-seed-sample='docker compose -f docker-compose.dev.yml run --rm backend python scripts/seed_sample_songbook.py'
