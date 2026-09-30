#!/bin/bash
# Runs once, on first initialization of the PostgreSQL data directory
# (/AppData/IMAMU/_DB). Creates the read-only role Databasus dumps with.
#
# Password comes from the postgres service environment (IMAMU_BACKUP_PASSWORD).
# Re-run manually after changing it:
#   docker exec -it imamu_postgres bash -c 'IMAMU_BACKUP_PASSWORD=... /docker-entrypoint-initdb.d/01-create-service-roles.sh'

set -euo pipefail

psql_super() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${1:-$POSTGRES_DB}"
}

role_exists() {
  [ "$(psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$1'" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB")" = "1" ]
}

# --- read-only role for Databasus backups ---
if role_exists imamu_backup; then
  psql_super -c "ALTER ROLE imamu_backup WITH LOGIN PASSWORD '${IMAMU_BACKUP_PASSWORD}'"
else
  psql_super -c "CREATE ROLE imamu_backup WITH LOGIN PASSWORD '${IMAMU_BACKUP_PASSWORD}'"
fi

psql_super -c "GRANT CONNECT ON DATABASE \"${POSTGRES_DB}\" TO imamu_backup"
psql_super -c "GRANT pg_read_all_data TO imamu_backup"
psql_super -c "GRANT USAGE ON SCHEMA public TO imamu_backup"
psql_super -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO imamu_backup"
psql_super -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO imamu_backup"

echo "[imamu-postgres-init] service roles ready (imamu_backup)"
