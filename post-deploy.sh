#!/bin/sh

set -e

npm ci
npm run build --workspaces

pm2 startOrRestart ecosystem.config.js
