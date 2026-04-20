#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 5 ]]; then
  cat >&2 <<'EOF'
Usage: scripts/package-release.sh <target-triple> <relay-binary-path> <ui-dist-dir> <contract-dir> <output-dir>

Example:
  scripts/package-release.sh x86_64-unknown-linux-gnu relay/target/release/resq-flow-relay ui/dist ui/src/flow-contracts dist
EOF
  exit 2
fi

target_triple="$1"
relay_binary_path="$2"
ui_dist_dir="$3"
contract_dir="$4"
output_dir="$5"

archive_base="resq-flow-${target_triple}"
staging_dir="${output_dir}/${archive_base}"
archive_path="${output_dir}/${archive_base}.tar.gz"
checksum_path="${archive_path}.sha256"

if [[ ! -f "$relay_binary_path" ]]; then
  echo "relay binary not found: ${relay_binary_path}" >&2
  exit 1
fi

if [[ ! -d "$ui_dist_dir" ]]; then
  echo "UI dist directory not found: ${ui_dist_dir}" >&2
  exit 1
fi

if [[ ! -d "$contract_dir" ]]; then
  echo "flow contract directory not found: ${contract_dir}" >&2
  exit 1
fi

rm -rf "$staging_dir"
mkdir -p "${staging_dir}/bin" "${staging_dir}/ui" "${staging_dir}/contracts"

install -m 0755 "$relay_binary_path" "${staging_dir}/bin/resq-flow-relay"
cp -R "${ui_dist_dir}/." "${staging_dir}/ui/"
cp -R "${contract_dir}/." "${staging_dir}/contracts/"

tar -C "$output_dir" -czf "$archive_path" "$archive_base"
(
  cd "$output_dir"
  sha256sum "${archive_base}.tar.gz" >"$(basename "$checksum_path")"
)

rm -rf "$staging_dir"
