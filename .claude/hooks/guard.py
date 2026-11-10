#!/usr/bin/env python3
"""PreToolUse guard for Bash commands (dev-wiki/standards §4). Shared copy: edit it in dev-wiki and re-apply.

Blocks, with a reason Claude sees:
  - merging or approving an MR/PR (glab mr merge/approve, gh pr merge, the merge API, auto-merge),
  - writing GitLab project settings, protected branches, members, variables, hooks or tokens through glab api,
  - skipping the git hooks (--no-verify, -n, core.hooksPath changes),
  - reading tokens (glab auth token, glab/gh config files, the keyring),
  - pushing code straight to main in repos whose tier sends code through an MR (.claude/guard.json).

Exit code 2 = block (stderr goes to Claude). Exit 0 = allow. These checks stop mistakes; they are not
security: GitLab's own settings are the real lock.
"""

import json
import os
import re
import shlex
import subprocess
import sys
from typing import Any

# Tier config, per repo. tier: app | site | docs | shared. code_pattern: regex for files that count as code.
DEFAULT_CODE_PATTERN = (
    r"\.(gd|gdshader|py|sh|js|mjs|cjs|ts|tsx|jsx|astro|vue|svelte|css|scss|rs|sql|toml|ya?ml|json)$"
    r"|^project\.godot$|^\.claude/|^\.gitlab/|^\.githooks/|^tools/|^Dockerfile"
)
# Files that never count as code even if the pattern matches (content data on sites). Astro sites keep
# their page text in src/data/*.ts and images in src/assets/: content, still type-checked and tested.
DEFAULT_CONTENT_PATTERN = (
    r"^src/content/|^src/data/|^src/assets/|^public/|^content/|^rooms/|^concept_art/|^docs/"
)
TIERS_WITH_MR_FOR_CODE = {"app", "site", "shared"}

PROTECTED_API = re.compile(
    r"projects/[^/\s]+/?(\s|$)"  # the project itself (settings)
    r"|/protected_branches|/protected_tags|/members|/variables|/hooks|/share"
    r"|/deploy_keys|/deploy_tokens|/access_tokens|/approval|/merge_requests/\d+/(merge|approve)"
    r"|^groups/"  # anything at group level (runners, members, settings)
)
WRITE_METHODS = {"PUT", "POST", "PATCH", "DELETE"}
API_VALUE_FLAGS = {"-f", "-F", "--field", "--raw-field", "-H", "--header", "--input", "--hostname"}
# Paths that hold tokens. Reading them is blocked whatever the command.
TOKEN_PATHS = re.compile(r"glab-cli/config\.yml|\.config/gh/hosts\.yml|\.git-credentials|\.netrc")


def block(reason: str) -> None:
    print(f"Blocked by .claude/hooks/guard.py: {reason}", file=sys.stderr)
    sys.exit(2)


def git(cwd: str, *args: str) -> str:
    # Fixed program, list argv, no shell: S603/S607 are false positives here, and PATH git is the user's git.
    return subprocess.run(  # noqa: S603
        ["git", *args],  # noqa: S607
        cwd=cwd,
        capture_output=True,
        text=True,
    ).stdout.strip()


def load_config(cwd: str) -> dict[str, Any]:
    root = git(cwd, "rev-parse", "--show-toplevel") or cwd
    try:
        with open(os.path.join(root, ".claude", "guard.json")) as f:
            config: dict[str, Any] = json.load(f)
            return config
    except (OSError, ValueError):
        return {"tier": "app"}  # no config: the strictest tier


def check_glab(words: list[str]) -> None:
    """Checks one already-split `glab ...` command, so text inside descriptions can't trigger it."""
    if words[1:3] in (["mr", "merge"], ["mr", "approve"]) or "--auto-merge" in words:
        block("Claude never merges or approves MRs. Tell Akim the MR is ready instead.")
    if words[1:3] in (["auth", "token"], ["config", "get"]) and ("token" in words or words[2] == "token"):
        block("Never read or print tokens.")
    if words[1:2] != ["api"]:
        return
    method, endpoint, i = "GET", "", 2
    while i < len(words):
        word = words[i]
        if word in ("-X", "--method") and i + 1 < len(words):
            method, i = words[i + 1].upper(), i + 2
            continue
        if word.startswith("-X") or word.startswith("--method="):
            method = word.removeprefix("-X").removeprefix("--method=").upper()
        elif word in API_VALUE_FLAGS:
            i += 1
        elif not word.startswith("-") and not endpoint:
            endpoint = word
        i += 1
    if method in WRITE_METHODS and PROTECTED_API.search(endpoint + " "):
        block(
            "GitLab settings/access changes need Akim's OK in this session. "
            "Ask them to do it or to approve it."
        )


def check_gh(words: list[str]) -> None:
    if words[1:3] == ["pr", "merge"] or (words[1:3] == ["pr", "review"] and "--approve" in words):
        block("Claude never merges or approves PRs.")
    if words[1:3] == ["auth", "token"]:
        block("Never read or print tokens.")


def check_git_hooks_bypass(words: list[str]) -> None:
    """git commit/push must run the hooks: they are the clean gate."""
    lowered = [w.lower() for w in words]
    if any("core.hookspath" in w for w in lowered):
        # Allowed: reading it, and setting it to .githooks (what setup does).
        # Anything else turns the gate off.
        reading = words[1] == "config" and ("--get" in words or len(words) == 3)
        setting_ours = words[1] == "config" and lowered[-1].rstrip("/").endswith(".githooks")
        if not (reading or setting_ours):
            block("core.hooksPath must stay .githooks: the pre-push hook is the clean gate.")
    # The subcommand is the first word after `git` that isn't an option or an option's value
    # (git -C <dir> push).
    rest = words[1:]
    while rest and rest[0] in ("-C", "-c"):
        rest = rest[2:]
    sub = rest[0] if rest else ""
    if sub in ("commit", "push") and ("--no-verify" in words or (sub == "commit" and "-n" in words)):
        block("Don't skip the git hooks. Fix what the check reports instead.")


def push_targets_main(args: list[str], cwd: str, main: str) -> tuple[bool, str]:
    positional = [a for a in args if not a.startswith("-")]
    refspecs = positional[1:]  # positional[0] is the remote
    if not refspecs:
        return git(cwd, "rev-parse", "--abbrev-ref", "HEAD") == main, "HEAD"
    for spec in refspecs:
        src, _, dst = spec.lstrip("+").partition(":")
        if (dst or src).removeprefix("refs/heads/") == main:
            return True, src or "HEAD"
    return False, ""


def check_push(segment: list[str], cwd: str) -> None:
    config = load_config(cwd)
    main = config.get("main_branch", "main")
    to_main, ref = push_targets_main(segment[2:], cwd, main)
    if not to_main:
        return
    if any(a in ("-f", "--force", "--force-with-lease") or a.startswith("--force") for a in segment):
        block(f"Force-pushing {main} is never allowed.")
    if config.get("tier") not in TIERS_WITH_MR_FOR_CODE:
        return
    code_re = re.compile(config.get("code_pattern", DEFAULT_CODE_PATTERN))
    content_re = re.compile(config.get("content_pattern", DEFAULT_CONTENT_PATTERN))
    git(cwd, "fetch", "-q", "origin", main)
    changed = git(cwd, "diff", "--name-only", f"origin/{main}...{ref}").splitlines()
    code = [f for f in changed if code_re.search(f) and not content_re.search(f)]
    if code:
        block(
            f"Code goes through a branch + MR, not straight to {main}. Code files in this push: "
            + ", ".join(code[:8])
        )


def main() -> None:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command", "")
    cwd = data.get("cwd") or "."
    if TOKEN_PATHS.search(command) or re.search(r"\bsecret-tool\s+lookup\b", command):
        block("Never read or print tokens.")
    for part in re.split(r"&&|\|\||;|\n|\|", command):
        try:
            words = shlex.split(part)
        except ValueError:
            continue
        while words and "=" in words[0]:  # skip VAR=value prefixes
            words = words[1:]
        if len(words) < 2:
            continue
        if words[0] == "glab":
            check_glab(words)
        elif words[0] == "gh":
            check_gh(words)
        elif words[0] == "cd":
            cwd = os.path.join(cwd, os.path.expanduser(words[1]))
        elif words[0] == "git":
            check_git_hooks_bypass(words)
            if len(words) >= 4 and words[1] == "-C" and words[3] == "push":
                check_push(["git", "push", *words[4:]], os.path.join(cwd, words[2]))
            elif words[1] == "push":
                check_push(words, cwd)


if __name__ == "__main__":
    main()
