#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p 'Admin email: ' ADMIN_EMAIL
read -r -s -p 'Admin password (at least 12 characters): ' ADMIN_PASSWORD
printf '\n'
export ADMIN_EMAIL ADMIN_PASSWORD
node --input-type=module -e 'import {createApp} from "./server/app.js"; const {db}=createApp(); db.close(); console.log("Admin account initialization completed. Existing accounts are preserved.");'
unset ADMIN_PASSWORD
