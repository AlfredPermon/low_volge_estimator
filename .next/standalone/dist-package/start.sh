#!/bin/bash
echo "==================================================="
echo "  Low-Voltage Estimator v3.0.0 - Inicio (Linux/Mac)"
echo "==================================================="
echo ""
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no esta instalado. Instala v18+ desde https://nodejs.org/"
    exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ABSOLUTE="${SCRIPT_DIR}/db/custom.db"

if [ ! -f "${DB_ABSOLUTE}" ]; then
    if [ -f "${SCRIPT_DIR}/db/seed_custom.db" ]; then
        cp "${SCRIPT_DIR}/db/seed_custom.db" "${DB_ABSOLUTE}"
    fi
fi

export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-production}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export DATABASE_URL="file:${DB_ABSOLUTE}"

echo "[OK] Puerto     : $PORT"
echo "[OK] Base datos : $DATABASE_URL"
echo ""
echo "Iniciando servidor en http://localhost:$PORT"
(sleep 3 && (xdg-open "http://localhost:$PORT" 2>/dev/null || open "http://localhost:$PORT" 2>/dev/null)) &
node server.js
