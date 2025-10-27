#!/usr/bin/env bash
# shellcheck shell=bash

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This script must be sourced: run 'source env.prod.sh'."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -a
source "${ROOT_DIR}/.env.prod"
set +a

alias albins='docker compose -f docker-compose.prod.yml'
alias albins_manage='docker compose -f docker-compose.prod.yml run --rm api python manage.py'
alias albins_import_songs='docker compose -f docker-compose.prod.yml run --rm api python scripts/import_songs.py'
