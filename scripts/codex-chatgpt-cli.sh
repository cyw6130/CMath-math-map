#!/usr/bin/env bash
set -euo pipefail
exec npm exec --yes @openai/codex -- "$@"
