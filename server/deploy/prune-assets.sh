#!/usr/bin/env bash
# Deletes hashed build assets that belong neither to the build just deployed
# nor to the one it replaced. Part of the routine deploy, run right after the
# rsync steps (see DEPLOY.md):
#
#   sudo ../server/deploy/prune-assets.sh dist/assets /var/www/oncotraceai/assets
#
# Decides by file NAME, never by age: `rsync -a` keeps each file's build-time
# mtime, so on a site that hasn't been redeployed for a while the LIVE bundle
# looks old, and `find -mtime +30 -delete` would remove it. The previous
# build's files are kept because a tab opened before this deploy may still
# lazy-load its chunks; anything older than that is deleted.
#
# Each build's file list is recorded in $STATE_DIR (outside the web root).
# The first run only records; nothing is deleted until a second build has been
# deployed. Safe to re-run for the same build.
set -euo pipefail
export LC_ALL=C   # one collation for sort and comm

new_build=${1:?usage: prune-assets.sh <dist/assets> <web-root assets dir>}
live=${2:?usage: prune-assets.sh <dist/assets> <web-root assets dir>}
state_dir=${STATE_DIR:-/var/lib/oncotrace-web}
last="$state_dir/assets-current-build.txt"
prev="$state_dir/assets-previous-build.txt"

list_files() { (cd "$1" && find . -type f | sort); }

current=$(mktemp)
trap 'rm -f "$current"' EXIT
list_files "$new_build" > "$current"

# Refuse rather than guess: an empty or mistyped build dir, or a build that
# hasn't been rsynced yet, would otherwise make the live bundle look stale.
if [ ! -s "$current" ]; then
    echo "prune-assets: no files under $new_build; nothing pruned" >&2
    exit 1
fi
if list_files "$live" | comm -13 - "$current" | grep -q .; then
    echo "prune-assets: $live is missing files of the new build (rsync not run yet?); nothing pruned" >&2
    exit 1
fi

mkdir -p "$state_dir"
if [ ! -f "$last" ]; then
    cp "$current" "$last"
    echo "prune-assets: first run; recorded this build, nothing pruned" >&2
    exit 0
fi
if ! cmp -s "$current" "$last"; then
    # A new build: the one that was live until now becomes "previous".
    cp "$last" "$prev"
    cp "$current" "$last"
fi
if [ ! -f "$prev" ]; then
    echo "prune-assets: only one build recorded so far; nothing pruned" >&2
    exit 0
fi

list_files "$live" \
    | comm -23 - <(sort -u "$current" "$prev") \
    | (cd "$live" && xargs -r -d '\n' rm -f --)
