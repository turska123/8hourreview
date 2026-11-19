#!/usr/bin/env bash
# Shared helpers for tools/check.sh (standard §3). Copied into every repo by house-rules templates/apply.sh:
# edit the house-rules copy and re-apply, don't edit a repo's copy by hand.
#
# A repo's tools/check.sh sources this file, calls `step` once per check, then `finish`.
#   step "<label>" [--deny '<regex>'] -- <command...>
#     Fails when the command exits non-zero, or when its output matches the --deny regex (for tools that print
#     warnings but still exit 0, e.g. a build). Output is shown only when the step fails.
#   finish
#     Runs the "standard files" step (the shared files must match .standard.lock, dev-wiki#61), writes the optional
#     JUnit report and the pre-push stamp, and prints ALL CLEAN or exits 1.
# Env: CHECK_JUNIT=<file> writes a JUnit report (CI uses it). Relative paths are from the repo root.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
# Plain output: colour codes make failure details and JUnit reports unreadable.
export NO_COLOR=1 FORCE_COLOR=0

_check_failures=0
_check_count=0
_check_junit_cases=""
_CHECK_JUNIT_FILE="${CHECK_JUNIT:-}"

# One check at a time per repo on this machine: parallel agents in worktrees queue instead of running out of memory.
# Named after the main clone (git-common-dir), so worktrees of the same repo share it and also its test port.
_check_repo="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || pwd)"
_check_lock="${TMPDIR:-/tmp}/check-$(basename "$(dirname "$_check_repo")").lock"
exec 9>"$_check_lock"
if ! flock -n 9; then
  echo "info  another check is running in this repo, waiting for it to finish..."
  flock 9
fi

_xml_escape() {
  tr -d '\000-\010\013\014\016-\037' <<< "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'
}

_record() {  # _record <label> [failure details]
  [[ -z "$_CHECK_JUNIT_FILE" ]] && return 0
  local name
  name="$(_xml_escape "$1")"
  if [[ $# -ge 2 ]]; then
    _check_junit_cases+="    <testcase classname=\"check\" name=\"$name\"><failure message=\"failed\">$(_xml_escape "$2")</failure></testcase>"$'\n'
  else
    _check_junit_cases+="    <testcase classname=\"check\" name=\"$name\"/>"$'\n'
  fi
}

# Fails the step with an install hint when a tool is missing, instead of a confusing "command not found".
need() {  # need <command> "<how to install>"
  command -v "$1" > /dev/null 2>&1 && return 0
  echo "FAIL  missing tool: $1  (install: $2)"
  _record "tool: $1" "missing; install: $2"
  _check_failures=$((_check_failures + 1))
  return 1
}

step() {
  local label="$1"; shift
  local deny=""
  if [[ "${1:-}" == "--deny" ]]; then deny="$2"; shift 2; fi
  [[ "${1:-}" == "--" ]] && shift
  _check_count=$((_check_count + 1))
  local log code bad=""
  # 9>&-: the step doesn't inherit the lock, so a daemon it starts (podman's conmon, a dev server) can't hold it.
  log="$("$@" 2>&1 9>&-)"
  code=$?
  if [[ -n "$deny" ]]; then
    local scan="$log"
    if [[ $_check_wasi -eq 1 ]]; then
      # WebAssembly fallback in use (dev-wiki#32): Node prints this one known warning on every run. It is left out
      # of the --deny scan only, says so below, and stays in the log; any other warning still fails the step.
      scan="$(_drop_wasi_warning <<< "$log")"
      [[ "$scan" != "$log" ]] &&
        echo "note  $label: ignored Node's \"WASI is an experimental feature\" warning (WebAssembly fallback on this CPU, dev-wiki#33)"
    fi
    bad="$(grep -E -i -- "$deny" <<< "$scan")"
  fi
  if [[ $code -ne 0 || -n "$bad" ]]; then
    echo "FAIL  $label (exit $code)"
    # Show the matched warning lines if that's why it failed, else the tail of the output.
    # shellcheck disable=SC2001  # indents every line of a multi-line string, which ${var//} can't do
    if [[ -n "$bad" ]]; then sed 's/^/        /' <<< "$bad" | head -40; else tail -40 <<< "$log" | sed 's/^/        /'; fi
    _record "$label" "exit $code"$'\n'"${bad:-$(tail -40 <<< "$log")}"
    _check_failures=$((_check_failures + 1))
  else
    echo "ok    $label"
    _record "$label"
  fi
}

# Secret scan: every commit, plus staged and unstaged changes to tracked files (new untracked files are scanned once
# committed, before the push). --redact: reports file:line and rule, never the secret itself.
# A finding in an old commit can't be removed without rewriting history: rotate the secret first, then add the
# finding's fingerprint to .gitleaksignore with a comment saying it was rotated.
step_secrets() {
  need gitleaks "sudo dnf install gitleaks" || return 0
  step "secrets (gitleaks, history)" -- gitleaks git --redact --no-banner .
  step "secrets (gitleaks, staged)" -- gitleaks git --staged --redact --no-banner .
  step "secrets (gitleaks, unstaged)" -- gitleaks git --pre-commit --redact --no-banner .
}

# Standard files (dev-wiki#61): the shared files (this one too) are copies from house-rules and only change by
# re-applying it, which rewrites .standard.lock. A hand edit, or a file missing, fails here and is named. So does a
# hand-edited lock: it must list exactly the shared files below (the same list as apply.sh's SHARED, from the same
# house-rules version as this file). The version line is only shown: a lock from an older house-rules passes as long
# as its files match it.
_STANDARD_SHARED=(tools/check-lib.sh tools/wasm-fallback.sh .claude/hooks/guard.py .githooks/pre-push)
_standard_files() {
  local version listed missing extra f bad=0
  if [[ ! -f .standard.lock ]]; then
    echo "no .standard.lock: re-apply house-rules (<house-rules>/templates/apply.sh <this repo> <stack> <tier>)"
    return 1
  fi
  version="$(sed -n '1s/^# house-rules \([^ ]*\).*/\1/p' .standard.lock)"
  listed="$(grep -v '^#' .standard.lock | sed -n 's/^[0-9a-f]\{64\}  //p' | sort)"
  missing="$(comm -23 <(printf '%s\n' "${_STANDARD_SHARED[@]}" | sort) <(echo "$listed"))"
  extra="$(comm -13 <(printf '%s\n' "${_STANDARD_SHARED[@]}" | sort) <(echo "$listed"))"
  while IFS= read -r f; do
    [[ -n "$f" ]] && { echo "not in .standard.lock: $f"; bad=1; }
  done <<< "$missing"
  while IFS= read -r f; do
    [[ -n "$f" ]] && { echo "not a shared file, but in .standard.lock: $f"; bad=1; }
  done <<< "$extra"
  grep -v '^#' .standard.lock | sha256sum --check --quiet --strict - 2>&1 || bad=1
  [[ $bad -eq 0 ]] && return 0
  echo "the shared files differ from house-rules ${version:-?}: edit them there and re-apply (templates/apply.sh)"
  return 1
}

finish() {
  # A fixed name: CI keeps test history by it, so it doesn't change with the version.
  step "standard files" -- _standard_files
  if [[ -n "$_CHECK_JUNIT_FILE" ]]; then
    {
      echo '<?xml version="1.0" encoding="UTF-8"?>'
      echo "<testsuites><testsuite name=\"tools/check.sh\" tests=\"$_check_count\" failures=\"$_check_failures\">"
      printf '%s' "$_check_junit_cases"
      echo '</testsuite></testsuites>'
    } > "$_CHECK_JUNIT_FILE"
  fi
  local stamp
  stamp="$(git rev-parse --git-dir 2>/dev/null)/check-stamp"
  if [[ $_check_failures -eq 0 ]]; then
    # Stamp only a clean tree: then the result is exactly HEAD's, and the pre-push hook can trust it.
    if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then git rev-parse HEAD > "$stamp"; else rm -f "$stamp"; fi
    echo "ALL CLEAN"
  else
    rm -f "$stamp"
    echo "$_check_failures check(s) failed"
    exit 1
  fi
}

# CPUs without AVX2 (the NAS, dev-wiki#32): swap native Node packages that crash for their WebAssembly builds
# before any step runs. A crashing package without one fails the check (risk dev-wiki#33).
# Node calls WASI experimental and prints one warning about it on every run, which trips build steps' --deny.
# Nothing is switched off in Node: `step` leaves exactly that warning (and Node's "(Use node --trace-warnings"
# hint after it) out of its --deny scan, and prints a `note` line each time it does, so it is never silent.
_check_wasi=0
_drop_wasi_warning() {  # stdin → stdout without Node's WASI warning line (whole line, exact) and the hint right after it
  awk '/^\(node:[0-9]+\) ExperimentalWarning: WASI is an experimental feature and might change at any time$/ { skip = 1; next }
       skip && /^\(Use `node --trace-warnings/ { skip = 0; next }
       { skip = 0; print }'
}
if [[ -d node_modules && -f tools/wasm-fallback.sh ]]; then
  _check_count=$((_check_count + 1))
  if _wasm_log="$(bash tools/wasm-fallback.sh 2>&1 9>&-)"; then
    [[ -n "$_wasm_log" ]] && echo "$_wasm_log"
    _record "wasm fallback"
  else
    echo "$_wasm_log"
    _record "wasm fallback" "$_wasm_log"
    _check_failures=$((_check_failures + 1))
  fi
  if find node_modules -type d -name '*-wasm32-wasi' -print -quit 2>/dev/null | grep -q .; then
    _check_wasi=1
  fi
fi
