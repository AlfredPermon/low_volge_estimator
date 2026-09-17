#!/bin/bash
echo "==================================================="
echo "  Low-Voltage Estimator v3.0.0 - Instalador (Linux/Mac)"
echo "==================================================="
echo ""
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no esta instalado."
    exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "${SCRIPT_DIR}/start.sh" "${SCRIPT_DIR}/stop.sh"
echo "[OK] Permisos otorgados. Para iniciar la aplicacion: ./start.sh"
