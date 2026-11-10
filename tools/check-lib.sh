#!/usr/bin/env bash
# Shared helpers for tools/check.sh (dev-wiki/standards §3). Copied into every repo by standards/templates/apply.sh:
# edit the dev-wiki copy and re-apply, don't edit a repo's copy by hand.
#
# A repo's tools/check.sh sources this file, calls `step` once per check, then `finish`.
#   step "<label>" [--deny '<regex>'] -- <command...>
#     Fails when the command exits non-zero, or when its output matches the --deny regex (for tools that print
#     warnings but still exit 0, e.g. a build). Output is shown only when the step fails.
#   finish
#     Writes the optional JUnit report, the pre-push stamp, and prints ALL CLEAN or exits 1.
# Env: CHECK_JUNIT=<file> writes a JUnit report (CI uses it). Relative paths are from the repo root.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
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
  [[ -n "$deny" ]] && bad="$(grep -E -i -- "$deny" <<< "$log")"
  if [[ $code -ne 0 || -n "$bad" ]]; then
    echo "FAIL  $label (exit $code)"
    # Show the matched warning lines if that's why it failed, else the tail of the output.
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

finish() {
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
