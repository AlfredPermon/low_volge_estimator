#!/bin/env pwsh
# make-dist.ps1 — Distribución limpia y profesional de Low-Voltage Estimator
# Crea un paquete ZIP con accesos directos, iconos e inicio silencioso en segundo plano.

$ErrorActionPreference = "Stop"
$root     = "c:\low_voltage_estimator"
$distDir  = "$root\dist-package"
$zipOut   = "$root\LowVoltageEstimator-v3.0.0-dist.zip"
$standalone = "$root\.next\standalone"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Low-Voltage Estimator - Make Dist" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# --- 0. Verificar disco libre --------------------------------------------------
$drive = Get-PSDrive C
$freeMB = [math]::Round($drive.Free / 1MB, 0)
Write-Host "[0] Espacio libre en C: $freeMB MB"
if ($freeMB -lt 300) {
    Write-Host ""
    Write-Host "ERROR: Espacio insuficiente ($freeMB MB libres). Se necesitan al menos 300 MB." -ForegroundColor Red
    Write-Host "Libera espacio y vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 1
}

# --- 1. Eliminar distribuciones anteriores ------------------------------------
Write-Host ""
Write-Host "[1] Limpiando distribuciones previas..." -ForegroundColor Yellow
if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
    Write-Host "    Eliminado: $distDir"
}
if (Test-Path $zipOut) {
    Remove-Item $zipOut -Force
    Write-Host "    Eliminado: $zipOut"
}

# --- 2. Verificar que el build existe y generar iconos si es necesario -------
Write-Host ""
Write-Host "[2] Verificando build de Next.js e iconos..." -ForegroundColor Yellow
if (-not (Test-Path "$standalone\server.js")) {
    Write-Host "ERROR: No se encontro el build en $standalone\server.js" -ForegroundColor Red
    Write-Host "Ejecuta primero: npm run build" -ForegroundColor Yellow
    exit 1
}
Write-Host "    Build OK: server.js encontrado"

if (-not (Test-Path "$root\icons\app.ico")) {
    Write-Host "    Generando iconos (.ico)..." -ForegroundColor Yellow
    python "$root\scripts\generate_icons.py"
}

# --- 3. Crear estructura limpia de dist-package -------------------------------
Write-Host ""
Write-Host "[3] Creando estructura de distribucion limpia..." -ForegroundColor Yellow

# Solo los archivos raiz necesarios del standalone
$filesToCopy = @("server.js", "package.json")
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

foreach ($f in $filesToCopy) {
    $src = "$standalone\$f"
    if (Test-Path $src) {
        Copy-Item $src "$distDir\$f" -Force
        Write-Host "    Copiado: $f"
    }
}

# Copiar carpeta de iconos (icons)
if (Test-Path "$root\icons") {
    Write-Host "    Copiando icons..."
    Copy-Item "$root\icons" "$distDir\icons" -Recurse -Force
}

# Carpeta .next (solo el contenido del standalone)
Write-Host "    Copiando .next/standalone/.next ..."
Copy-Item "$standalone\.next" "$distDir\.next" -Recurse -Force

# Archivos estaticos
Write-Host "    Copiando .next/static ..."
Copy-Item "$root\.next\static" "$distDir\.next\static" -Recurse -Force

# Carpeta node_modules del standalone (ya esta reducida)
Write-Host "    Copiando node_modules (standalone, puede tardar un momento)..."
Copy-Item "$standalone\node_modules" "$distDir\node_modules" -Recurse -Force

# Carpeta public
if (Test-Path "$root\public") {
    Write-Host "    Copiando public..."
    Copy-Item "$root\public" "$distDir\public" -Recurse -Force
}

# Datos semilla (seed-data) requeridos para restaurar precios por defecto en produccion
if (Test-Path "$root\src\lib\seed-data") {
    Write-Host "    Copiando seed-data para inicializacion de base de datos..."
    New-Item -ItemType Directory -Path "$distDir\src\lib\seed-data" -Force | Out-Null
    Copy-Item "$root\src\lib\seed-data\*" "$distDir\src\lib\seed-data" -Force
}

# Carpeta de subida de archivos (uploads)
Write-Host "    Creando directorio vacio de uploads..."
New-Item -ItemType Directory -Path "$distDir\uploads" -Force | Out-Null

# Base de datos
Write-Host "    Sincronizando esquema de base de datos..."
node "$root\scripts\sync-db-schema.js"
Write-Host "    Copiando plantilla de base de datos..."
New-Item -ItemType Directory -Path "$distDir\db" -Force | Out-Null
Copy-Item "$root\db\custom.db" "$distDir\db\seed_custom.db" -Force
Copy-Item "$root\db\custom.db" "$distDir\db\custom.db" -Force

# --- 4. Crear .env ------------------------------------------------------------
Write-Host ""
Write-Host "[4] Creando .env..." -ForegroundColor Yellow
@"
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
"@ | Set-Content "$distDir\.env" -Encoding UTF8
Write-Host "    .env creado"

# --- 5. Crear start.bat --------------------------------------------------------
Write-Host ""
Write-Host "[5] Creando start.bat e Iniciar_Silencioso.vbs..." -ForegroundColor Yellow
@'
@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
echo ===================================================
echo   Low-Voltage Estimator v3.0.0 - Inicio (Windows)
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Instala Node.js v18+ desde: https://nodejs.org/
    pause
    exit /b 1
)

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
set "DB_ABSOLUTE=%APP_DIR%\db\custom.db"

if not exist "%DB_ABSOLUTE%" (
    if exist "%APP_DIR%\db\seed_custom.db" (
        echo [INFO] Inicializando base de datos inicial desde plantilla...
        copy /y "%APP_DIR%\db\seed_custom.db" "%DB_ABSOLUTE%" >nul
    )
)

if not exist "%DB_ABSOLUTE%" (
    echo [ERROR] Base de datos no encontrada en: %DB_ABSOLUTE%
    pause
    exit /b 1
)

set "DB_URL=%DB_ABSOLUTE:\=/%"
set "DB_FINAL_URL=file:%DB_URL%"

(
echo PORT=3000
echo HOSTNAME=0.0.0.0
echo NODE_ENV=production
echo DATABASE_URL=%DB_FINAL_URL%
) > "%APP_DIR%\.env"

echo [OK] Puerto     : 3000
echo [OK] Base datos : %DB_FINAL_URL%
echo.
echo Iniciando servidor... Abre tu navegador en: http://localhost:3000
echo.

start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
node "%APP_DIR%\server.js"
pause
'@ | Set-Content "$distDir\start.bat" -Encoding ASCII
Write-Host "    start.bat creado"

# Crear Iniciar_Silencioso.vbs
@'
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & scriptDir & "\start.bat""", 0, False
'@ | Set-Content "$distDir\Iniciar_Silencioso.vbs" -Encoding UTF8
Write-Host "    Iniciar_Silencioso.vbs creado"

# --- 6. Crear stop.bat, Detener.bat y Abrir_Navegador.bat -----------------------
Write-Host ""
Write-Host "[6] Creando stop.bat, Detener.bat y Abrir_Navegador.bat..." -ForegroundColor Yellow

@'
@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
title Detener Low-Voltage Estimator

echo ===================================================
echo   Low-Voltage Estimator - Detener Servidor
echo ===================================================
echo.

set "PORT=3000"
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

if exist "%APP_DIR%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%APP_DIR%\.env") do (
        if "%%a"=="PORT" set "PORT=%%b"
    )
)

echo Buscando servidor activo en el puerto %PORT%...
set "FOUND_PID="

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    set "FOUND_PID=%%a"
)

if defined FOUND_PID (
    echo [INFO] Proceso detectado - PID: !FOUND_PID!. Deteniendo servidor...
    taskkill /F /PID !FOUND_PID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo.
        echo ===================================================
        echo  [OK] Low-Voltage Estimator se detuvo con exito.
        echo ===================================================
    ) else (
        echo [ERROR] No se pudo finalizar el proceso !FOUND_PID!.
    )
) else (
    echo.
    echo [INFO] El servidor Low-Voltage Estimator no esta en ejecucion.
)

echo.
timeout /t 3 /nobreak >nul
'@ | Set-Content "$distDir\stop.bat" -Encoding ASCII
Write-Host "    stop.bat creado"

@'
@echo off
call "%~dp0stop.bat"
'@ | Set-Content "$distDir\Detener.bat" -Encoding ASCII
Write-Host "    Detener.bat creado"

@'
@echo off
set "PORT=3000"
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
if exist "%APP_DIR%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%APP_DIR%\.env") do (
        if "%%a"=="PORT" set "PORT=%%b"
    )
)
start http://localhost:%PORT%
'@ | Set-Content "$distDir\Abrir_Navegador.bat" -Encoding ASCII
Write-Host "    Abrir_Navegador.bat creado"

# --- 7. Crear accesos directos scripts -----------------------------------------
Write-Host ""
Write-Host "[7] Creando scripts de accesos directos..." -ForegroundColor Yellow

@'
# create_shortcuts.ps1 - Generador de Accesos Directos con Iconos
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = Get-Location }
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$iconsDir = Join-Path $scriptDir "icons"

$WshShell = New-Object -ComObject WScript.Shell

# 1. Iniciar
$lnkStartPath = Join-Path $desktopPath "Iniciar Low-Voltage Estimator.lnk"
$shortcutStart = $WshShell.CreateShortcut($lnkStartPath)
$shortcutStart.TargetPath = "wscript.exe"
$shortcutStart.Arguments = "`"$scriptDir\Iniciar_Silencioso.vbs`""
$shortcutStart.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\start.ico") { $shortcutStart.IconLocation = "$iconsDir\start.ico, 0" }
$shortcutStart.Description = "Iniciar Low-Voltage Estimator en segundo plano"
$shortcutStart.Save()

# 2. Detener
$lnkStopPath = Join-Path $desktopPath "Detener Low-Voltage Estimator.lnk"
$shortcutStop = $WshShell.CreateShortcut($lnkStopPath)
$shortcutStop.TargetPath = "$scriptDir\stop.bat"
$shortcutStop.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\stop.ico") { $shortcutStop.IconLocation = "$iconsDir\stop.ico, 0" }
$shortcutStop.Description = "Detener servidor Low-Voltage Estimator"
$shortcutStop.Save()

# 3. Abrir
$lnkOpenPath = Join-Path $desktopPath "Abrir Low-Voltage Estimator.lnk"
$shortcutOpen = $WshShell.CreateShortcut($lnkOpenPath)
$shortcutOpen.TargetPath = "$scriptDir\Abrir_Navegador.bat"
$shortcutOpen.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\app.ico") { $shortcutOpen.IconLocation = "$iconsDir\app.ico, 0" }
$shortcutOpen.Description = "Abrir Low-Voltage Estimator en el navegador"
$shortcutOpen.Save()
'@ | Set-Content "$distDir\create_shortcuts.ps1" -Encoding UTF8
Write-Host "    create_shortcuts.ps1 creado"

@'
@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
title Crear Accesos Directos - Low-Voltage Estimator
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%\create_shortcuts.ps1"
echo.
pause
'@ | Set-Content "$distDir\Crear_Accesos_Directos.bat" -Encoding ASCII
Write-Host "    Crear_Accesos_Directos.bat creado"

# --- 8. Crear install.bat (Windows) -------------------------------------------
Write-Host ""
Write-Host "[8] Creando install.bat..." -ForegroundColor Yellow
@'
@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
title Instalador - Low-Voltage Estimator v3.0.0

echo ===================================================
echo   Low-Voltage Estimator v3.0.0 - Instalador
echo ===================================================
echo.
echo Este paquete es STANDALONE: no requiere instalar dependencias npm.
echo Solo necesita Node.js v18 o superior instalado en tu sistema.
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no encontrado en el sistema.
    echo Por favor instala Node.js LTS v18 o superior desde https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% instalado correctamente.
echo.

for /f %%t in ('powershell -NoProfile -Command "(Get-Date).ToString(''yyyyMMdd_HHmmss'')"') do set "TS=%%t"
if "%TS%"=="" set "TS=%RANDOM%"

if exist "db\custom.db" (
    echo ===================================================
    echo  AVISO: Se ha detectado una base de datos previa.
    echo ===================================================
    echo  [1] Actualizar version conservando datos existentes - Recomendado
    echo  [2] Instalacion limpia - Sobrescribir base de datos con catalogo base
    echo.
    choice /c 12 /n /m "Selecciona una opcion [1 o 2]: "
    if errorlevel 2 (
        echo.
        echo [AVISO] Realizando instalacion limpia...
        copy /y "db\custom.db" "db\custom.db.bak_%TS%" >nul
        echo [OK] Respaldo de seguridad creado: db\custom.db.bak_%TS%
        if exist "db\seed_custom.db" (
            copy /y "db\seed_custom.db" "db\custom.db" >nul
            echo [OK] Base de datos restaurada al catalogo base por defecto.
        )
    ) else (
        echo.
        echo [OK] Conservando base de datos existente con todos tus proyectos.
        copy /y "db\custom.db" "db\custom.db.bak_%TS%" >nul
        echo [OK] Copia de respaldo preventiva creada: db\custom.db.bak_%TS%
    )
) else (
    if exist "db\seed_custom.db" (
        copy /y "db\seed_custom.db" "db\custom.db" >nul
        echo [OK] Base de datos inicializada correctamente desde la plantilla.
    )
)

echo.
echo ===================================================
echo   Creando Accesos Directos en el Escritorio...
echo ===================================================
if exist "create_shortcuts.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_shortcuts.ps1"
)

echo.
echo ===================================================
echo   INSTALACION COMPLETADA CON EXITO!
echo ===================================================
echo.
echo Accesos directos creados en tu Escritorio:
echo   - Iniciar Low-Voltage Estimator   - Inicia la app en segundo plano
echo   - Detener Low-Voltage Estimator   - Detiene la app limpiamente
echo   - Abrir Low-Voltage Estimator     - Abre en navegador
echo.
pause
'@ | Set-Content "$distDir\install.bat" -Encoding ASCII
Write-Host "    install.bat creado"

# --- 9. Crear scripts Linux/macOS ---------------------------------------------
Write-Host ""
Write-Host "[9] Creando scripts Linux/macOS..." -ForegroundColor Yellow
@'
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
'@ | Set-Content "$distDir\start.sh" -Encoding UTF8
(Get-Content "$distDir\start.sh" -Raw).Replace("`r`n", "`n") | Set-Content "$distDir\start.sh" -Encoding UTF8 -NoNewline

@'
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
'@ | Set-Content "$distDir\stop.sh" -Encoding UTF8
(Get-Content "$distDir\stop.sh" -Raw).Replace("`r`n", "`n") | Set-Content "$distDir\stop.sh" -Encoding UTF8 -NoNewline

@'
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
'@ | Set-Content "$distDir\install.sh" -Encoding UTF8
(Get-Content "$distDir\install.sh" -Raw).Replace("`r`n", "`n") | Set-Content "$distDir\install.sh" -Encoding UTF8 -NoNewline

# --- 10. Crear README.md -------------------------------------------------------
Write-Host ""
Write-Host "[10] Creando README.md..." -ForegroundColor Yellow
@'
# Low-Voltage Estimator v3.0.0

Aplicacion profesional para estimacion de presupuestos de instalaciones electricas de baja tension.

## Instalacion Rapida

1. Extrae todo el contenido del archivo ZIP en una carpeta.
2. Haz doble clic en `install.bat`.
   - Se verificara Node.js v18+.
   - Se crearan automaticamente los **Accesos Directos en tu Escritorio** con iconos personalizados.

## Accesos Directos creados en el Escritorio

- **Iniciar Low-Voltage Estimator**: Ejecuta la app en segundo plano sin ventana de consola y abre el navegador en `http://localhost:3000`.
- **Detener Low-Voltage Estimator**: Detiene limpiamente la aplicacion y libera el puerto.
- **Abrir Low-Voltage Estimator**: Abre el navegador en `http://localhost:3000` si la app ya esta iniciada.

## Uso desde la carpeta

- **Iniciar en segundo plano**: Doble clic en `Iniciar_Silencioso.vbs`.
- **Iniciar con ventana de consola**: Doble clic en `start.bat`.
- **Detener**: Doble clic en `Detener.bat` o `stop.bat`.
- **Recrear Accesos Directos**: Doble clic en `Crear_Accesos_Directos.bat`.

## Base de datos

- Ubicacion: `db/custom.db` (SQLite)
- Respaldos automaticos al actualizar: `db/custom.db.bak_*`
'@ | Set-Content "$distDir\README.md" -Encoding UTF8

# --- 11. Crear el ZIP ----------------------------------------------------------
Write-Host ""
Write-Host "[9] Creando ZIP..." -ForegroundColor Yellow
$sizeBeforeMB = [math]::Round((Get-ChildItem $distDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host "    Tamano del paquete sin comprimir: $sizeBeforeMB MB"

Compress-Archive -Path "$distDir\*" -DestinationPath $zipOut -Force
$zipSizeMB = [math]::Round((Get-Item $zipOut).Length / 1MB, 1)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DISTRIBUCION EXITOSA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  ZIP: $zipOut" -ForegroundColor Green
Write-Host "  Tamano: $zipSizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "Contenido del paquete:"
Get-ChildItem $distDir -Name | Sort-Object | ForEach-Object { Write-Host "  - $_" }
