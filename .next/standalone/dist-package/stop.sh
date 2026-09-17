#!/bin/bash
echo "==================================================="
echo "  Low-Voltage Estimator - Detener Servidor (Linux/Mac)"
echo "==================================================="
echo ""
PORT="${PORT:-3000}"
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "[OK] Servidor detenido exitosamente."
else
    echo "[INFO] El servidor no esta en ejecucion."
fi
