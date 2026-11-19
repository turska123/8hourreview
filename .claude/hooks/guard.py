#!/usr/bin/env python3
"""PreToolUse guard for Bash, Edit, Write and NotebookEdit (standard §4). Shared copy: edit it in house-rules
and re-apply.

Blocks, with a reason Claude sees:
  - merging, approving or reviewing an MR/PR (glab mr merge/approve, gh pr merge,
    tea pulls merge/approve/review, the merge and review APIs, auto-merge),
  - writing project/repo settings, protected branches, members, variables, secrets, hooks or tokens through
    glab api, tea api or tea's own subcommands (GitLab and Forgejo),
  - skipping the git hooks (--no-verify, -n, core.hooksPath changes),
  - reading tokens (glab auth token, tea login helper get, glab/gh/tea config files, the keyring),
  - running Proton Pass (pass-cli, setup/secrets.sh): only Akim does that (dev-wiki#38),
  - pushing straight to main in app and shared repos, and pushing code (not content) to main in site repos
    (.claude/guard.json); force pushes to main (--force or a + refspec) in every tier,
  - writing .standard.lock by hand (Edit/Write or a shell write): only templates/apply.sh writes it,
  - whatever the repo adds in guard.json's extra_rules: {"command": regex, "reason": ...} refuses a matching
    Bash command, {"path": regex, "reason": ...} refuses Edit/Write/NotebookEdit on a matching repo-relative
    path.
    A broken extra_rules refuses every call (fails closed), and so does any crash of the guard itself.
    It stops mistakes, not intent: `bash -c`, interpreters and find -delete aren't parsed.

Exit code 2 = block (stderr goes to Claude). Exit 0 = allow. These checks stop mistakes; they are not
security (curl to the API isn't checked): the forge's own settings are the real lock.
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
# Site tier only: files that never count as code even if the pattern matches (content data on sites).
# Astro sites keep their page text in src/data/*.ts and images in src/assets/: content, still type-checked
# and tested.
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
# Forgejo API paths (after stripping the host and /api/v1/) whose writes change settings or access.
FORGEJO_PROTECTED_API = re.compile(
    r"^repos/[^/\s]+/[^/\s]+/?$"  # the repo itself (settings, delete)
    r"|^repos/[^/\s]+/[^/\s]+/(branch_protections|tag_protections|collaborators|teams|hooks|keys"
    r"|push_mirrors|transfer|actions/(secrets|variables|runners))"
    r"|/pulls/\d+/(merge|reviews)"
    r"|^(orgs|admin|user|teams)/"  # org, site admin and own-account settings
)
WRITE_METHODS = {"PUT", "POST", "PATCH", "DELETE"}
API_VALUE_FLAGS = {"-f", "-F", "--field", "--raw-field", "-H", "--header", "--input", "--hostname"}
# Proton Pass holds the tokens (dev-wiki#38). Only Akim runs pass-cli, or setup/secrets.sh which calls it.
PROTON_PASS_PROGRAMS = {"pass-cli", "secrets.sh"}
PROTON_PASS_SUBSHELL = re.compile(r"\$\(\s*(\S*/)?pass-cli\b")
# S105: a message about Proton Pass, not a password (ruff matches the "PASS" in the name).
PROTON_PASS_REASON = (
    "Proton Pass holds the tokens: only Akim runs pass-cli and setup/secrets.sh. "  # noqa: S105
    "Ask Akim to run it."
)
COMMAND_WRAPPERS = {"sudo", "env", "exec", "command", "nohup", "time"}
SHELLS = {"bash", "sh", "zsh"}
# Paths that hold tokens. Reading them is blocked whatever the command.
TOKEN_PATHS = re.compile(
    r"glab-cli/config\.yml|\.config/gh/hosts\.yml|\.config/tea/config\.yml|\.git-credentials|\.netrc"
)
# tea entity aliases (tea 0.16) and, per entity, the subcommands that are blocked and why.
TEA_ALIASES = {
    "pulls": ("pulls", "pull", "pr"),
    "branches": ("branches", "branch", "b"),
    "webhooks": ("webhooks", "webhook", "hooks", "hook"),
    "repos": ("repos", "repo"),
    "orgs": ("organizations", "organization", "org"),
    "logins": ("logins", "login"),
}
TEA_ENTITIES = {alias: kind for kind, aliases in TEA_ALIASES.items() for alias in aliases}
TEA_BLOCKED = {
    "pulls": (
        {"merge", "m", "approve", "lgtm", "a", "review", "reject"},
        "Claude never merges, approves or reviews PRs. Tell Akim the PR is ready instead "
        "(a review goes in a comment).",
    ),
    "pulls-clean": ({"clean"}, "Deleting branches needs Akim's OK."),
    "branches": ({"protect", "P", "unprotect", "U", "rename", "rn"}, "Branch settings need Akim's OK."),
    "webhooks": ({"create", "c", "delete", "rm", "update", "edit", "u"}, "Webhooks need Akim's OK."),
    "repos": ({"edit", "e", "delete", "rm"}, "Repo settings and deletes need Akim's OK."),
    "orgs": ({"create", "c", "delete", "rm"}, "Org changes need Akim's OK."),
}
TEA_SETTINGS = {"secrets", "secret", "variables", "variable", "vars", "var"}
TEA_API_VALUE_FLAGS = {
    "-f",
    "--field",
    "-F",
    "--Field",
    "-H",
    "--header",
    "-d",
    "--data",
    "-o",
    "--output",
    "-l",
    "--login",
    "-r",
    "--repo",
    "-R",
    "--remote",
}


# The lock that says which house-rules version the shared files came from. Only templates/apply.sh writes it.
LOCK_FILE = ".standard.lock"
LOCK_REASON = (
    f"{LOCK_FILE} is written only by templates/apply.sh (re-apply house-rules), never by hand: "
    "the gate checks its hashes against the shared files."
)
FILE_TOOLS = {
    "Edit": "file_path",
    "MultiEdit": "file_path",
    "Write": "file_path",
    "NotebookEdit": "notebook_path",
}
# Shell programs that write or remove every file they name, and those that write only their last argument.
LOCK_WRITE_ANY = {"tee", "truncate", "rm", "unlink", "shred"}
LOCK_WRITE_LAST = {"cp", "ln", "install", "rsync"}
# > >> &> &>> >| and n>, with an optional quote around the target; 2>&1 has no target (& starts it).
REDIRECT = re.compile(r">>?\|?\s*(['\"]?)([^\s;&|<>'\"]+)\1")
# perl's options that take a value glued on (-Mstrict, -Ilib): an "i" there isn't -i. sed has none such.
PERL_VALUE_OPTIONS = ("-M", "-m", "-I", "-e", "-E", "-x")


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


def repo_root(cwd: str) -> str:
    return git(cwd, "rev-parse", "--show-toplevel") or cwd


def load_config(cwd: str) -> dict[str, Any]:
    root = repo_root(cwd)
    try:
        with open(os.path.join(root, ".claude", "guard.json")) as f:
            config = json.load(f)
    except (OSError, ValueError):
        return {"tier": "app"}  # no config: the strictest tier
    if not isinstance(config, dict):
        block('.claude/guard.json must be a JSON object like {"tier": "app"}. Fix it first.')
    return config


def extra_rules(config: dict[str, Any]) -> list[tuple[str, re.Pattern[str], str]]:
    """guard.json's extra_rules as (kind, regex, reason).

    Anything malformed blocks: a crash would let the call through.
    """
    rules = config.get("extra_rules", [])
    broken = "Fix extra_rules in .claude/guard.json: "
    if not isinstance(rules, list):
        block(broken + "it must be a list of {command|path, reason} entries.")
    compiled = []
    for entry in rules:
        if not isinstance(entry, dict):
            block(broken + f"{entry!r} is not a {{command|path, reason}} object.")
        kinds = [k for k in ("command", "path") if k in entry]
        if len(kinds) != 1 or not isinstance(entry[kinds[0]], str):
            block(broken + f"{entry!r} needs exactly one of command or path, as a regex string.")
        reason = entry.get("reason")
        if not isinstance(reason, str) or not reason.strip():
            block(broken + f"{entry!r} has no reason.")
        try:
            compiled.append((kinds[0], re.compile(entry[kinds[0]]), reason))
        except (re.error, OverflowError, RecursionError) as e:
            block(broken + f"{entry[kinds[0]]!r} is not a valid regex ({e}).")
    return compiled


def check_file_tool(path: str, cwd: str, rules: list[tuple[str, re.Pattern[str], str]]) -> None:
    """Edit/Write/NotebookEdit: the lock is never edited by hand; the repo's path rules apply."""
    root = repo_root(cwd)
    rel = os.path.relpath(os.path.normpath(os.path.join(cwd, os.path.expanduser(path))), root)
    if is_lock(rel):  # any repo's lock, worktrees and other clones included
        block(LOCK_REASON)
    for kind, regex, reason in rules:
        if kind == "path" and regex.search(rel):
            block(f"{reason} (extra_rules in .claude/guard.json, path {rel})")


def is_lock(word: str) -> bool:
    return os.path.basename(word.rstrip("/")) == LOCK_FILE


def check_lock_write(part: str, words: list[str]) -> None:
    """Shell writes to .standard.lock: redirects, tee, sed -i, cp/mv/ln onto it, rm/truncate."""
    if any(is_lock(m.group(2)) for m in REDIRECT.finditer(part)):
        block(LOCK_REASON)
    while words and words[0] in COMMAND_WRAPPERS:
        words = words[1:]
    if not words:
        return
    prog, args = os.path.basename(words[0]), words[1:]
    operands = [a for a in args if not a.startswith("-")]
    if prog in LOCK_WRITE_ANY or prog == "mv":
        hit = any(is_lock(a) for a in operands)
    elif prog in LOCK_WRITE_LAST:
        hit = len(operands) >= 2 and is_lock(operands[-1])
    elif prog in ("sed", "perl"):
        # -i, -i.bak, --in-place, and -i inside short-option bundles (sed -ni, perl -pi).
        in_place = any(
            a.startswith("--in-place")
            or (
                a[:1] == "-"
                and a[1:2] != "-"
                and not (prog == "perl" and a.startswith(PERL_VALUE_OPTIONS))
                and "i" in a
            )
            for a in args
        )
        hit = in_place and any(is_lock(a) for a in operands)
    elif prog == "dd":
        hit = any(a.startswith("of=") and is_lock(a[3:]) for a in args)
    else:
        hit = False
    if hit:
        block(LOCK_REASON)


def check_proton_pass(words: list[str]) -> None:
    """Blocks pass-cli and setup/secrets.sh as the program run, also behind sudo/env or `bash <file>`."""
    while words and (words[0] in COMMAND_WRAPPERS or "=" in words[0]):
        words = words[1:]
        while words and words[0].startswith("-"):  # the wrapper's own options (env -i, sudo -E)
            words = words[1:]
    if words and words[0] in SHELLS:
        # The shell's own options end at the first other word (the script); words after it are the script's.
        i = 1
        while i < len(words) and words[i][:1] in ("-", "+"):  # bash +x / +o turn options off
            if words[i] == "-n":  # syntax check only: nothing runs
                return
            i += 2 if words[i] in ("-o", "+o", "-O", "+O") else 1  # these take a value (bash -o pipefail)
        words = words[i:]
    if words and os.path.basename(words[0]) in PROTON_PASS_PROGRAMS:
        block(PROTON_PASS_REASON)


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


def check_tea(words: list[str]) -> None:
    """Checks one already-split `tea ...` command (Forgejo), like check_glab."""
    args = [w for w in words[1:] if w not in ("--debug", "--vvv")]
    entity, sub = [*args, "", ""][:2]
    if entity in ("admin", "a"):
        block("Site admin operations need Akim's OK.")
    if entity in ("actions", "action") and sub in TEA_SETTINGS and args[2:3] not in ([], ["list"], ["ls"]):
        block("Actions secrets and variables need Akim's OK in this session.")
    kind = TEA_ENTITIES.get(entity, "")
    if kind == "logins" and sub in ("helper", "git-credential") and "get" in args[2:]:
        block("Never read or print tokens.")
    if kind == "pulls" and sub in TEA_BLOCKED["pulls-clean"][0]:
        block(TEA_BLOCKED["pulls-clean"][1])
    if kind in TEA_BLOCKED and sub in TEA_BLOCKED[kind][0]:
        block(TEA_BLOCKED[kind][1])
    if entity != "api":
        return
    method, endpoint, has_body, i = "", "", False, 1
    while i < len(args):
        word = args[i]
        if word in ("-X", "--method") and i + 1 < len(args):
            method, i = args[i + 1].upper(), i + 2
            continue
        if word.startswith("--method="):
            method = word.removeprefix("--method=").upper()
        elif word in TEA_API_VALUE_FLAGS:
            has_body = has_body or word in ("-f", "--field", "-F", "--Field", "-d", "--data")
            i += 1
        elif not word.startswith("-") and not endpoint:
            endpoint = word
        i += 1
    method = method or ("POST" if has_body else "GET")  # tea: a body without -X means POST
    path = re.sub(r"^https?://[^/]+", "", endpoint).lstrip("/").removeprefix("api/v1/").split("?")[0]
    if method in WRITE_METHODS and FORGEJO_PROTECTED_API.search(path):
        block(
            "Forgejo settings/access changes, merges and reviews need Akim's OK in this session. "
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


def push_targets_main(args: list[str], cwd: str, main: str) -> tuple[bool, str, bool]:
    """(pushes to main, the ref pushed there, forced by a + refspec)."""
    positional = [a for a in args if not a.startswith("-")]
    refspecs = positional[1:]  # positional[0] is the remote
    if not refspecs:
        return git(cwd, "rev-parse", "--abbrev-ref", "HEAD") == main, "HEAD", False
    for spec in refspecs:
        src, _, dst = spec.removeprefix("+").partition(":")
        if (dst or src).removeprefix("refs/heads/") == main:
            return True, src or "HEAD", spec.startswith("+") or not src  # :main deletes main
    return False, "", False


def check_push(segment: list[str], cwd: str) -> None:
    config = load_config(cwd)
    main = config.get("main_branch", "main")
    to_main, ref, forced_refspec = push_targets_main(segment[2:], cwd, main)
    if not to_main:
        return
    forced = any(a in ("-f", "--force", "--force-with-lease") or a.startswith("--force") for a in segment)
    if forced or forced_refspec:
        block(f"Force-pushing or deleting {main} is never allowed.")
    if config.get("tier") not in TIERS_WITH_MR_FOR_CODE:
        return
    if config.get("tier") != "site":
        # App and shared tiers: nothing goes straight to main, content folders included (standards §1).
        # Blocked without a diff, so it fails closed when offline or when origin/main can't be read.
        block(f"Every change goes through a branch + MR/PR in this tier, not straight to {main}.")
    git(cwd, "fetch", "-q", "origin", main)
    changed = git(cwd, "diff", "--name-only", f"origin/{main}...{ref}").splitlines()
    code_re = re.compile(config.get("code_pattern", DEFAULT_CODE_PATTERN))
    content_re = re.compile(config.get("content_pattern", DEFAULT_CONTENT_PATTERN))
    code = [f for f in changed if code_re.search(f) and not content_re.search(f)]
    if code:
        block(
            f"Code goes through a branch + MR, not straight to {main}. Code files in this push: "
            + ", ".join(code[:8])
        )


def main() -> None:
    try:
        run(json.load(sys.stdin))
    except SystemExit:
        raise
    # Any crash would exit 1, which lets the call through: refuse instead.
    except Exception as e:
        block(f"the guard itself failed ({type(e).__name__}: {e}); fix the cause before going on.")


def run(data: dict[str, Any]) -> None:
    tool = data.get("tool_name") or "Bash"  # older payloads carry no tool_name: the guard was Bash-only
    tool_input = data.get("tool_input", {})
    cwd = data.get("cwd") or "."
    if tool != "Bash" and tool not in FILE_TOOLS:
        return
    rules = extra_rules(load_config(cwd))
    if tool in FILE_TOOLS:
        check_file_tool(tool_input.get(FILE_TOOLS[tool]) or "", cwd, rules)
        return
    command = tool_input.get("command", "")
    for kind, regex, reason in rules:
        if kind == "command" and regex.search(command):
            block(f"{reason} (extra_rules in .claude/guard.json)")
    if TOKEN_PATHS.search(command) or re.search(r"\bsecret-tool\s+lookup\b", command):
        block("Never read or print tokens.")
    if PROTON_PASS_SUBSHELL.search(command):
        block(PROTON_PASS_REASON)
    for part in re.split(r"&&|\|\||;|\n|\|", command):
        try:
            words = shlex.split(part)
        except ValueError:
            continue
        while words and "=" in words[0]:  # skip VAR=value prefixes
            words = words[1:]
        check_proton_pass(words)
        check_lock_write(part, words)
        if len(words) < 2:
            continue
        if words[0] == "glab":
            check_glab(words)
        elif words[0] == "tea":
            check_tea(words)
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
