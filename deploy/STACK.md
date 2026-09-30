# Deployment: PostgreSQL, Databasus, Open-Studio & Umami

All persistent state lives on the host under `/AppData/IMAMU`:

| Path | Contents |
|---|---|
| `/AppData/IMAMU/_DB` | PostgreSQL 17 data directory (`PGDATA`) |
| `/AppData/IMAMU/Backupapp` | Databasus state + backup archives (`/databasus-data`) |
| `/AppData/IMAMU/objectstorage/*` | Garage S3 config, metadata, and object data |

## Services & ports

| Service | Port | Purpose |
|---|---|---|
| `app` | 3005 | IMAMU Helper |
| `postgres` | 5432 | Primary datastore (replaced CockroachDB) |
| `databasus` | 4005 | PostgreSQL backup UI + scheduler |
| `umami` / `umami-db` | 3006 | Web analytics UI + `/script.js` tracker, dedicated PG 15 instance |
| `open-studio` | 8080 | PostgreSQL viewer/editor (opt-in profile `dbview`) |
| `garage` / `garage-ui` | 3900-3904 | S3-compatible object storage + UI |

## First start

```bash
cp .env.example .env      # set real passwords first
mkdir -p /AppData/IMAMU/_DB /AppData/IMAMU/Backupapp
docker compose up -d
```

On Linux, hand the data directory to the postgres user before the first boot:

```bash
sudo chown -R 999:999 /AppData/IMAMU/_DB
```

`docker-compose` runs `deploy/postgres-init/01-create-service-roles.sh` on first
initialization, creating the read-only `imamu_backup` role for Databasus. Init
scripts only run on an empty data directory — to re-run after changing the
password:

```bash
docker exec -it imamu_postgres bash -c \
  'IMAMU_BACKUP_PASSWORD=... /docker-entrypoint-initdb.d/01-create-service-roles.sh'
```

The app container applies Drizzle migrations plus the idempotent schema
verification statements on boot, so a fresh PostgreSQL instance is initialized
automatically.

## Database viewer (Open-Studio)

Open-Studio has no published image, so the compose service builds it from the
upstream repository (BuildKit git context, needs `DOCKER_BUILDKIT=1` on old
Docker versions):

```bash
docker compose --profile dbview up -d open-studio
# http://<host>:8080
```

## Backups (Databasus)

Open http://<host>:4005, create the first account, then add a backup with:

- Database: `postgres`, port `5432`, database `imamu`
- User: `imamu_backup`, password `IMAMU_BACKUP_PASSWORD`
- Storage: local path `/databasus-data/backups` (lands in `/AppData/IMAMU/Backupapp`)

PostgreSQL 17 is used, so Databasus can also do physical/incremental/WAL (PITR)
backups in addition to logical `pg_dump` dumps.

## Analytics (Umami)

1. Start the stack, open http://<host>:3006 and create the admin account.
2. Add a website, copy its **Website ID**.
3. Set `UMAMI_URL` (e.g. `http://<host>:3006`) and `UMAMI_WEBSITE_ID` in `.env`,
   then `docker compose up -d app`.

`app/layout.tsx` injects the tracker only when both variables are set, so
omitting them keeps the site tracker-free.

## Migrating data off CockroachDB

CockroachDB is no longer part of the stack. To carry existing rows over:

```bash
# 1. Dump from the old server (run where cockroach SQL client is available)
cockroach sql --url "postgresql://root@<old-host>:26257/defaultdb?sslmode=disable" \
  --format=tsv -e "SELECT * FROM users" > users.tsv

# 2. Restore into the new PostgreSQL instance
docker exec -i imamu_postgres psql -U imamu -d imamu -c "COPY users (id, uid, email, password_hash, is_admin, created_at) FROM STDIN WITH (FORMAT csv)" < users.csv
```

Repeat per table. The schema itself needs no migration: Drizzle migrations and
the schema verification statements create every table and column on the new
PostgreSQL instance. Stop the old `cockroachdb` container and drop the
`cockroach_data` volume only after verifying the restored row counts.
