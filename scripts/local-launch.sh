#!/bin/zsh
# Gamma Math Map local launcher.
# Starts the loopback server on demand and opens the map in the default browser.
# If the port is already occupied by an older gamma-math-map server.js process
# (missing the /api/local-key endpoint), it is replaced so the latest frontend
# and local key store are always served.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-7100}"
URL="http://127.0.0.1:${PORT}/"
KEY_PROBE="http://127.0.0.1:${PORT}/api/local-key"
# The proxy endpoint answers 405 (new server) vs 404 (old server).
PROXY_PROBE_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PORT}/api/model-proxy" 2>/dev/null || true)"

if ! curl --fail --silent "${URL}" >/dev/null 2>&1; then
  if nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1; then
    print -u2 "Port ${PORT} is occupied by another service."
    exit 1
  fi
  nohup node "${ROOT}/server.js" --port "${PORT}" --host 127.0.0.1 \
    >"/tmp/gamma-math-map-server.log" 2>&1 &
elif [ "${PROXY_PROBE_CODE}" = "404" ] || ! curl --fail --silent "${KEY_PROBE}" >/dev/null 2>&1; then
  # The port answers HTTP but not our loopback key endpoint: an older
  # server.js process is serving the directory. Replace it.
  OLD_PID="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null | head -1)"
  if [ -n "${OLD_PID}" ]; then
    OLD_CMD="$(ps -p "${OLD_PID}" -o command= 2>/dev/null || true)"
    case "${OLD_CMD}" in
      *server.js*)
        kill "${OLD_PID}" 2>/dev/null || true
        for _ in {1..20}; do nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1 || break; sleep 0.25; done
        ;;
      *)
        print -u2 "Port ${PORT} is occupied by an unrelated process (${OLD_CMD})."
        exit 1
        ;;
    esac
  fi
  nohup node "${ROOT}/server.js" --port "${PORT}" --host 127.0.0.1 \
    >"/tmp/gamma-math-map-server.log" 2>&1 &
fi

for _ in {1..20}; do
  if curl --fail --silent "${URL}" >/dev/null; then
    open "${URL}"
    exit 0
  fi
  sleep 0.25
done

print -u2 "Gamma Math Map did not become reachable at ${URL}"
exit 1
