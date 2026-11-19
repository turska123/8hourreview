#!/usr/bin/env bash
# Swaps native Node packages that crash on this CPU for their WebAssembly builds (dev-wiki#32). Shared file:
# copied into every repo by house-rules templates/apply.sh; edit the house-rules copy and re-apply.
#
# Why: the NAS CPU (i7-3770K) has no AVX2. Some prebuilt native packages (Astro 7's compiler binding, Vite's
# rolldown binding) are built for newer CPUs and die with "Illegal instruction" (exit 132) as soon as they load.
# napi-rs packages publish a `<name>-wasm32-wasi` twin and fall back to it when the native file is missing.
#
# What it does, after `npm ci`: loads every `*-linux-x64-gnu` package in node_modules/; each one that crashes is
# replaced by its `-wasm32-wasi` twin of the same version (with the twin's runtime dependencies), in the same
# folder, so nested copies keep their own version. package.json and the lockfile are never touched; `npm ci`
# puts the native files back, and the next run swaps them again. Prints one line per swap, nothing otherwise.
#
# If a crashing package has no WebAssembly twin, or its twin doesn't load, it fails and leaves the native file in
# place. No twin is the known risk (dev-wiki#33): build on a machine with AVX2 instead. A registry it can't reach
# (offline, auth) fails with its own message, so it isn't mistaken for that risk.
#
# tools/check-lib.sh runs it on every check when node_modules/ exists.
# Env: WASM_FALLBACK=auto (default: only on a CPU without AVX2) | always | never
#      WASM_FALLBACK_NPM=<npm command> (tests)
set -uo pipefail
self="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
cd "$(dirname "$self")/.." || exit 1

mode="${WASM_FALLBACK:-auto}"
[[ "$mode" == "never" || ! -d node_modules ]] && exit 0
if [[ "$mode" == "auto" ]]; then
  # Only Linux x86_64 has *-linux-x64-gnu packages; there, only a CPU without AVX2 needs this.
  [[ "$(uname -sm)" == "Linux x86_64" ]] || exit 0
  grep -qw avx2 /proc/cpuinfo 2>/dev/null && exit 0
fi
npm_cmd="${WASM_FALLBACK_NPM:-npm}"
command -v node > /dev/null 2>&1 || exit 0

work="$(mktemp -d)"
trap 'rm -r "$work"' EXIT

failed=0
pending=()   # "<native dir>|<twin dir>|<unpacked twin>"
deps=()      # "<name>@<range>" the twins need and node_modules/ doesn't have

# missing_deps <dir> <package.json>: prints name@range for each dependency not found walking up from <dir>.
# Checks only that the dependency exists, not its range: good enough while twins need the same napi-rs runtime.
missing_deps() {
  # shellcheck disable=SC2016  # a JavaScript program: its $ and quotes are Node's, not the shell's
  node -e '
    const fs = require("fs"), path = require("path");
    const [dir, file] = process.argv.slice(1);
    const want = JSON.parse(fs.readFileSync(file, "utf8")).dependencies || {};
    for (const [name, range] of Object.entries(want)) {
      let d = path.resolve(dir), found = false;
      for (;;) {
        if (fs.existsSync(path.join(d, "node_modules", name, "package.json"))) { found = true; break; }
        const up = path.dirname(d);
        if (up === d) break;
        d = up;
      }
      if (!found) console.log(`${name}@${range}`);
    }' "$1" "$2"
}

while IFS= read -r -d '' native; do
  [[ -f "$native/package.json" ]] || continue
  # The status comes out of a command substitution, so bash's own "Illegal instruction" report stays inside it.
  probe="$(node -e 'require(process.argv[1])' "$PWD/$native" > /dev/null 2>&1; echo $?)" 2> /dev/null
  [[ "$probe" == 132 ]] || continue   # loads, or fails for some other reason: not ours to fix

  name="$(node -p 'require(process.argv[1]).name' "$PWD/$native/package.json")"
  version="$(node -p 'require(process.argv[1]).version' "$PWD/$native/package.json")"
  twin_name="${name%-linux-x64-gnu}-wasm32-wasi"
  twin_dir="$(dirname "$native")/$(basename "${native%-linux-x64-gnu}")-wasm32-wasi"

  # npm view: the version on success; exit 1 with E404 when the package or that version doesn't exist.
  found="$("$npm_cmd" view "$twin_name@$version" version 2> "$work/view.log")"
  view_code=$?
  if [[ $view_code -ne 0 ]] && ! grep -q E404 "$work/view.log"; then
    echo "FAIL  wasm-fallback: couldn't ask the registry about $twin_name@$version (offline?):" \
      "$(grep -m1 'npm error' "$work/view.log" || tail -1 "$work/view.log")"
    failed=1
    continue
  fi
  if [[ $view_code -ne 0 || "$found" != "$version" ]]; then
    echo "FAIL  wasm-fallback: $name@$version crashes on this CPU (no AVX2) and has no WebAssembly build" \
      "($twin_name@$version). Known risk dev-wiki#33: build on a machine with AVX2."
    failed=1
    continue
  fi
  unpack="$work/$(echo "$twin_name@$version" | tr '@/' '__')"
  mkdir -p "$unpack"
  # From the repo, so its .npmrc (registry, auth) applies as for view and install. The file name is the last line.
  tarball="$("$npm_cmd" pack "$twin_name@$version" --pack-destination "$work" 2>/dev/null | tail -1)"
  if [[ -z "$tarball" ]] || ! tar -xzf "$work/$tarball" -C "$unpack"; then
    echo "FAIL  wasm-fallback: couldn't download $twin_name@$version"
    failed=1
    continue
  fi
  while IFS= read -r dep; do
    [[ -n "$dep" ]] && deps+=("$dep")
  done < <(missing_deps "$(dirname "$native")" "$unpack/package/package.json")
  pending+=("$native|$twin_dir|$unpack/package")
  echo "info  wasm-fallback: $name@$version crashes on this CPU (no AVX2), using $twin_name"
done < <(find node_modules -type d -name '*-linux-x64-gnu' -print0 -prune | sort -z)

# Runtime dependencies first: an npm install can put native files back, so the swap comes after it. It can also
# undo an earlier run's swaps (npm prunes what the lockfile doesn't list), so the script runs once more after.
installed=0
if [[ ${#deps[@]} -gt 0 ]]; then
  installed=1
  mapfile -t deps < <(printf '%s\n' "${deps[@]}" | sort -u)
  if ! "$npm_cmd" install --no-save --no-audit --no-fund --force "${deps[@]}" > "$work/install.log" 2>&1; then
    echo "FAIL  wasm-fallback: couldn't install ${deps[*]}"
    tail -20 "$work/install.log"
    exit 1
  fi
fi

for entry in "${pending[@]}"; do
  IFS='|' read -r native twin_dir unpacked <<< "$entry"
  created=0
  [[ -e "$twin_dir" ]] || created=1
  mkdir -p "$twin_dir"
  cp -r "$unpacked/." "$twin_dir/"
  # Load the twin before deleting the native: if it doesn't work, keep things as npm left them.
  if ! node -e 'require(process.argv[1])' "$PWD/$twin_dir" > /dev/null 2>&1; then
    echo "FAIL  wasm-fallback: $twin_dir doesn't load; kept $native"
    [[ $created -eq 1 ]] && rm -r "$twin_dir"
    failed=1
    continue
  fi
  rm -r "$native"
done
if [[ $installed -eq 1 && -z "${_WASM_FALLBACK_AGAIN:-}" ]]; then
  _WASM_FALLBACK_AGAIN=1 bash "$self" || failed=1
fi
exit $failed
