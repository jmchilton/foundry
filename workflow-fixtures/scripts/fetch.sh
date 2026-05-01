#!/usr/bin/env bash
# Fetch (or update) pipeline fixtures into ./pipelines/ at SHAs pinned in fixtures.yaml.
#
# Usage:
#   scripts/fetch.sh                 # fetch all
#   scripts/fetch.sh nf-core/demo    # fetch one
#   VERIFY=1 scripts/fetch.sh        # also verify HEAD matches pinned SHA
#
# Deps: git, yq (https://github.com/mikefarah/yq). Falls back to python3 if yq absent.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
manifest="$root/fixtures.yaml"
dest_root="$root/pipelines"
mkdir -p "$dest_root"

parse() {
  if command -v yq >/dev/null 2>&1; then
    yq -o=tsv '.pipelines[] | [.name, .repo, .sha, .tag] | @tsv' "$manifest"
  else
    python3 - "$manifest" <<'PY'
import sys, yaml
m = yaml.safe_load(open(sys.argv[1]))
for p in m["pipelines"]:
    print("\t".join([p["name"], p["repo"], p["sha"], p["tag"]]))
PY
  fi
}

want="${1:-}"

parse | while IFS=$'\t' read -r name repo sha tag; do
  [ -n "$want" ] && [ "$want" != "$name" ] && continue
  dir="$dest_root/${name//\//__}"
  if [ ! -d "$dir/.git" ]; then
    echo ">> cloning $name @ $tag ($sha)"
    git clone --quiet "$repo" "$dir"
  fi
  echo ">> checking out $name @ $sha"
  git -C "$dir" fetch --quiet --tags origin
  git -C "$dir" -c advice.detachedHead=false checkout --quiet "$sha"
  if [ "${VERIFY:-0}" = "1" ]; then
    head=$(git -C "$dir" rev-parse HEAD)
    if [ "$head" != "$sha" ]; then
      echo "!! HEAD $head != pinned $sha for $name" >&2
      exit 1
    fi
  fi
done

echo "done."
