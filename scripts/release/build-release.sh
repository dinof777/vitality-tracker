#!/usr/bin/env bash
# Build ONE conflict-free release from the ready branches (card c8faa9a6,
# SHAPE section 5). A deterministic script, not an agent: the conflicts are the
# work, and which branch wins a conflict is "the first one in order".
#
#   scripts/release/build-release.sh \
#     --worktree /path/to/new/worktree \
#     --branches '["mc-task-1a2b3c4d","mc-task-5e6f7a8b"]' \
#     --report /path/to/build-report.json \
#     [--base origin/main]
#
# Run from inside a clone that has fetched every branch (the workflow's
# checkout uses fetch-depth: 0). It never pushes and never touches the working
# tree it is run from: the release is built in a NEW worktree at --base.
#
# For each branch, in the order given:
#   - not on the remote            -> held back, reason merge-failed
#   - already inside the release   -> counted as included (nothing to merge)
#   - merges cleanly (--no-ff, subject "Merge <branch>", the shape ci.yml's
#     board write-back parses) -> included
#   - conflicts                    -> `merge --abort`, held back, reason
#     conflict, `with` = the earlier included branch that touched one of the
#     conflicting files (null when none can be named)
#
# The report is JSON: { "merged": N, "included": [...], "heldBack": [{branch,
# reason, with}] }. `merged` counts branches that actually changed the release;
# the workflow uses it to tell "nothing left to ship" from "everything conflicted".
# Exit 0 whenever a report was written, even if every branch was held back:
# deciding what that means is the workflow's job, not this script's.
set -euo pipefail

BASE="origin/main"
WT=""
BRANCHES=""
REPORT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --worktree) WT="$2"; shift 2 ;;
    --branches) BRANCHES="$2"; shift 2 ;;
    --report) REPORT="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    *) echo "[build-release] unknown argument: $1" >&2; exit 2 ;;
  esac
done
if [ -z "$WT" ] || [ -z "$BRANCHES" ] || [ -z "$REPORT" ]; then
  echo "[build-release] --worktree, --branches and --report are required" >&2
  exit 2
fi
command -v jq >/dev/null 2>&1 || { echo "[build-release] jq is required" >&2; exit 2; }

# The branch list is data from outside this script. Only names made of the
# characters a branch name legitimately uses are accepted; anything else could be
# read as an option or a path by git.
if ! printf '%s' "$BRANCHES" | jq -e 'type == "array" and all(.[]; type == "string" and test("^[A-Za-z0-9._/-]{1,200}$") and (startswith("-") | not) and (contains("..") | not))' >/dev/null; then
  echo "[build-release] --branches must be a JSON array of plain branch names" >&2
  exit 2
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/build-release.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
: > "$TMP/included.txt"
: > "$TMP/held.jsonl"
MERGED=0

# Git-triggered Vercel deploys require a commit author tied to a GitHub
# account. Actions supplies the authenticated triggering actor and numeric ID.
# Never invent an email: the previous .invalid identity blocked every release.
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  if ! [[ "${GITHUB_ACTOR_ID:-}" =~ ^[0-9]+$ ]] || ! [[ "${GITHUB_ACTOR:-}" =~ ^[A-Za-z0-9][A-Za-z0-9-]*$ ]]; then
    echo "[build-release] verified GitHub actor identity is missing; no release created" >&2
    exit 2
  fi
  RELEASE_AUTHOR_NAME="$GITHUB_ACTOR"
  RELEASE_AUTHOR_EMAIL="${GITHUB_ACTOR_ID}+${GITHUB_ACTOR}@users.noreply.github.com"
else
  RELEASE_AUTHOR_NAME="$(git config user.name || true)"
  RELEASE_AUTHOR_EMAIL="$(git config user.email || true)"
  if [ -z "$RELEASE_AUTHOR_NAME" ] || [ -z "$RELEASE_AUTHOR_EMAIL" ] || [[ "$RELEASE_AUTHOR_EMAIL" == *.invalid ]]; then
    echo "[build-release] configure a GitHub-associated git identity; no release created" >&2
    exit 2
  fi
fi

git worktree add --detach "$WT" "$BASE" >/dev/null
git -C "$WT" config user.name "$RELEASE_AUTHOR_NAME"
git -C "$WT" config user.email "$RELEASE_AUTHOR_EMAIL"

n=0
for b in $(printf '%s' "$BRANCHES" | jq -r '.[]'); do
  n=$((n + 1))
  ref="refs/remotes/origin/$b"
  if ! git -C "$WT" rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
    echo "[build-release] $b: not on the remote, held back"
    jq -nc --arg b "$b" '{branch: $b, reason: "merge-failed", with: null}' >> "$TMP/held.jsonl"
    continue
  fi
  if git -C "$WT" merge-base --is-ancestor "$ref" HEAD; then
    echo "[build-release] $b: already in the release"
    printf '%s\n' "$b" >> "$TMP/included.txt"
    continue
  fi
  if git -C "$WT" merge --no-ff --no-edit -m "Merge $b" "$ref" >/dev/null 2>&1; then
    echo "[build-release] $b: merged"
    printf '%s\n' "$b" >> "$TMP/included.txt"
    MERGED=$((MERGED + 1))
    # Files this branch changed, for naming a later conflict's other side.
    git -C "$WT" diff --name-only "HEAD^1" "HEAD" > "$TMP/files-$n.txt"
    printf '%s %s\n' "$b" "$n" >> "$TMP/order.txt"
    continue
  fi
  conflicted="$(git -C "$WT" diff --name-only --diff-filter=U || true)"
  git -C "$WT" merge --abort >/dev/null 2>&1 || git -C "$WT" reset --hard HEAD >/dev/null
  if [ -n "$conflicted" ]; then
    with=""
    if [ -f "$TMP/order.txt" ]; then
      while read -r earlier idx; do
        if printf '%s\n' "$conflicted" | grep -Fxq -f "$TMP/files-$idx.txt"; then with="$earlier"; break; fi
      done < "$TMP/order.txt"
    fi
    echo "[build-release] $b: conflicts${with:+ with $with}, held back"
    jq -nc --arg b "$b" --arg w "$with" '{branch: $b, reason: "conflict", with: (if $w == "" then null else $w end)}' >> "$TMP/held.jsonl"
  else
    echo "[build-release] $b: could not be merged, held back"
    jq -nc --arg b "$b" '{branch: $b, reason: "merge-failed", with: null}' >> "$TMP/held.jsonl"
  fi
done

jq -n \
  --argjson merged "$MERGED" \
  --rawfile included "$TMP/included.txt" \
  --slurpfile held "$TMP/held.jsonl" \
  '{merged: $merged, included: ($included | split("\n") | map(select(length > 0))), heldBack: $held}' > "$REPORT"
echo "[build-release] merged $MERGED, report written"
