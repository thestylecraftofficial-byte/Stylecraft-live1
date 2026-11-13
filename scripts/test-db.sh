#!/usr/bin/env bash
# Applies the migration to a scratch Postgres database and runs the deletion test.
# Usage: PGHOST=... PGPORT=... PGUSER=... ./scripts/test-db.sh
set -euo pipefail
DB=stylecraft_test
psql -d postgres -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -d $DB -v ON_ERROR_STOP=1 -q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end \$\$"
psql -d $DB -v ON_ERROR_STOP=1 -q -f supabase/migrations/0001_init.sql
psql -d $DB -v ON_ERROR_STOP=1 -q -f supabase/migrations/0002_report_fields.sql
psql -d $DB -v ON_ERROR_STOP=1 -q -f supabase/migrations/0003_orders.sql
psql -d $DB -v ON_ERROR_STOP=1 -q -f supabase/migrations/0004_outfit_checks.sql
psql -d $DB -v ON_ERROR_STOP=1 -f tests/deletion.sql
psql -d $DB -v ON_ERROR_STOP=1 -f tests/checks.sql
