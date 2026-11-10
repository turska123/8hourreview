## What and why

<!-- One or two sentences. -->

Closes #

## How to try it

<!-- Page / screen / command, or the test that shows it. -->

## Checklist (dev-wiki/standards)

- [ ] Conventional Commit messages
- [ ] `tools/check.sh` → ALL CLEAN on the latest commit
- [ ] Tests written from the issue's "Done when" list; each fails without the change (a full review reverts to confirm)
- [ ] Bug fix → a test that would have caught it
- [ ] Docs updated in this MR (README / CLAUDE.md / docs/), decision logged in the wiki `Decision-log` (or n/a)
- [ ] No secrets, tokens or personal data in code, logs or screenshots
- [ ] New dependency? Exact version, at least two weeks old, licence OK (or n/a)

Review: Claude reviews and adds `ready-to-merge` once the review and `tools/check.sh` pass on the latest commit. Akim merges.
