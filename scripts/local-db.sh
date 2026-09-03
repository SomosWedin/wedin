#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
local_db_name="${LOCAL_MONGO_DB:-wedin}"
local_mongo_dir="$HOME/Library/Application Support/WedinMongoDB"
local_data_dir="$local_mongo_dir/data"
local_log_file="$local_mongo_dir/mongod.log"
launch_agent_label="com.wedin.mongodb"
launch_agent_target="gui/$(id -u)/$launch_agent_label"
local_server_uri="mongodb://127.0.0.1:27017/?directConnection=true"
local_db_uri="mongodb://127.0.0.1:27017/${local_db_name}?replicaSet=rs0"
local_restore_uri="mongodb://127.0.0.1:27017/?replicaSet=rs0"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

database_is_ready() {
  mongosh "$local_server_uri" --quiet --eval \
    'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep --quiet 1
}

launch_agent_is_loaded() {
  launchctl print "$launch_agent_target" >/dev/null 2>&1
}

start_database() {
  require_command launchctl
  require_command mongod
  require_command mongosh

  if database_is_ready; then
    if ! launch_agent_is_loaded; then
      echo "Port 27017 is already used by MongoDB outside this Wedin project." >&2
      echo "Stop that MongoDB instance before starting the Wedin database." >&2
      exit 1
    fi
  else
    mkdir -p "$local_data_dir"

    if launch_agent_is_loaded; then
      launchctl remove "$launch_agent_label"
    fi

    echo "Starting native MongoDB..."
    launchctl submit \
      -l "$launch_agent_label" \
      -- "$(command -v mongod)" \
      --dbpath "$local_data_dir" \
      --logpath "$local_log_file" \
      --logappend \
      --bind_ip 127.0.0.1 \
      --nounixsocket \
      --port 27017 \
      --replSet rs0 \
      --oplogSize 128 \
      --wiredTigerCacheSizeGB 0.25
  fi

  echo "Waiting for MongoDB..."
  for _ in {1..30}; do
    if database_is_ready; then
      break
    fi
    sleep 1
  done

  if ! database_is_ready; then
    if launch_agent_is_loaded; then
      launchctl remove "$launch_agent_label"
    fi
    echo "MongoDB did not become ready. Check: $local_log_file" >&2
    exit 1
  fi

  replica_status="$(
    mongosh "$local_server_uri" --quiet --eval \
      'try { rs.status().ok } catch (error) { 0 }' 2>/dev/null || true
  )"

  if [[ "$replica_status" != "1" ]]; then
    echo "Initializing the local replica set..."
    mongosh "$local_server_uri" --quiet --eval \
      'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })' \
      >/dev/null
  fi

  for _ in {1..30}; do
    if mongosh "$local_server_uri" --quiet --eval \
      'db.hello().isWritablePrimary' 2>/dev/null | grep --quiet true; then
      echo "Local MongoDB is ready."
      echo "DATABASE_URL=\"$local_db_uri\""
      return
    fi
    sleep 1
  done

  echo "The MongoDB replica set did not become writable." >&2
  exit 1
}

stop_database() {
  require_command launchctl

  if ! launch_agent_is_loaded; then
    echo "The Wedin MongoDB instance is already stopped."
    return
  fi

  launchctl remove "$launch_agent_label"
  for _ in {1..30}; do
    if ! database_is_ready; then
      echo "Local MongoDB stopped. Data remains in $local_data_dir"
      return
    fi
    sleep 1
  done

  echo "MongoDB did not stop cleanly. Check: $local_log_file" >&2
  exit 1
}

restore_atlas_database() {
  reset_database="${1:-false}"

  require_command mongodump
  require_command mongorestore
  start_database

  source_uri="${MONGO_SOURCE_URI:-}"
  if [[ -z "$source_uri" ]]; then
    if [[ ! -t 0 ]]; then
      echo "Set MONGO_SOURCE_URI when running without an interactive terminal." >&2
      exit 1
    fi

    read -r -s -p "Atlas source MongoDB URI: " source_uri
    echo
  fi

  if [[ -z "$source_uri" ]]; then
    echo "The Atlas source URI cannot be empty." >&2
    exit 1
  fi

  source_db_name="${MONGO_SOURCE_DB:-}"
  if [[ -z "$source_db_name" ]]; then
    uri_without_query="${source_uri%%\?*}"
    source_db_name="${uri_without_query##*/}"
  fi

  if [[ -z "$source_db_name" || "$source_db_name" == *"@"* ]]; then
    echo "The source URI must include its database name, or set MONGO_SOURCE_DB." >&2
    exit 1
  fi

  task_tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/wedin-mongo.XXXXXX")"
  trap 'rm -rf "$task_tmp_dir"' EXIT
  archive_path="$task_tmp_dir/cloud.archive.gz"

  echo "Downloading '$source_db_name' from Atlas..."
  mongodump \
    --uri="$source_uri" \
    --db="$source_db_name" \
    --archive="$archive_path" \
    --gzip

  if [[ "$reset_database" == "true" ]]; then
    echo "Dropping the complete local '$local_db_name' database..."
    mongosh "$local_db_uri" --quiet --eval 'db.dropDatabase()' >/dev/null
  fi

  echo "Replacing collections in local '$local_db_name'..."
  mongorestore \
    --uri="$local_restore_uri" \
    --archive="$archive_path" \
    --gzip \
    --drop \
    --nsFrom="${source_db_name}.*" \
    --nsTo="${local_db_name}.*"

  echo "Atlas data restored to '$local_db_name'."
}

pull_database() {
  restore_atlas_database false
}

generate_prisma_client() {
  (
    cd "$project_dir"
    DATABASE_URL="$local_db_uri" yarn prisma generate
  )
}

apply_tracked_migrations() {
  (
    cd "$project_dir"
    DATABASE_URL="$local_db_uri" yarn migrate
  )
}

push_prisma_schema() {
  (
    cd "$project_dir"
    DATABASE_URL="$local_db_uri" yarn prisma db push
  )
}

migrate_database() {
  require_command yarn
  start_database

  echo "Generating Prisma Client and applying tracked migrations to local MongoDB..."
  generate_prisma_client
  apply_tracked_migrations
}

push_database() {
  require_command yarn
  start_database

  echo "Generating Prisma Client and pushing the Prisma schema to local MongoDB..."
  generate_prisma_client
  push_prisma_schema
}

sync_database() {
  require_command yarn
  start_database

  echo "Applying tracked migrations and the Prisma schema to local MongoDB..."
  generate_prisma_client
  apply_tracked_migrations
  push_prisma_schema
}

refresh_database() {
  restore_atlas_database true
  echo "Fresh Atlas data is ready locally."
}

run_development() {
  require_command yarn
  start_database

  cd "$project_dir"
  export DATABASE_URL="$local_db_uri"
  exec yarn dev
}

case "${1:-}" in
  start)
    start_database
    ;;
  stop)
    stop_database
    ;;
  pull)
    pull_database
    ;;
  refresh)
    refresh_database
    ;;
  migrate)
    migrate_database
    ;;
  push)
    push_database
    ;;
  sync)
    sync_database
    ;;
  dev)
    run_development
    ;;
  *)
    echo "Usage: $0 <start|stop|pull|refresh|migrate|push|sync|dev>" >&2
    exit 1
    ;;
esac
