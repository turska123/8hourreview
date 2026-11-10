#!/usr/bin/env bash
# Clean gate for a Nuxt site (dev-wiki/standards §3). Must print ALL CLEAN before a push.
# Needs the devDependencies (npm ci) + `npx playwright install firefox` once per machine.
source "$(dirname "$0")/check-lib.sh"

step "format (prettier)" -- npx --no-install prettier --check .
step "lint (eslint)" -- npx --no-install eslint . --max-warnings 0
step "types (nuxi typecheck)" -- npx --no-install nuxi typecheck
# Nuxt prints build warnings as "WARN" lines and still exits 0.
step "build (nuxt generate)" --deny '\bwarn|warning|deprecat' -- npx --no-install nuxt generate
step "smoke (playwright, firefox)" -- npx --no-install playwright test --project=firefox --reporter=line
# A static site audits only what ships (standards §3), with allow-list entries that expire (audit-allowlist.json).
step "dependencies (npm audit)" -- node tools/npm-audit.mjs --omit=dev
step_secrets
finish
