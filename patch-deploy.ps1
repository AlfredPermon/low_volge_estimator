# patch-deploy.ps1
# Parchea el start.bat y el .env en la carpeta de despliegue para corregir
# el error "Unable to open the database file" de Prisma/SQLite.
#
# Uso: powershell -ExecutionPolicy Bypass -File patch-deploy.ps1 -DeployPath "C:\deploy_estimador"

param(
    [string]$DeployPath = "C:\deploy_estimador"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Parche de base de datos para despliegue" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que la carpeta existe
if (-not (Test-Path $DeployPath)) {
    Write-Host "[ERROR] No se encontro la carpeta: $DeployPath" -ForegroundColor Red
    exit 1
}

$dbPath = Join-Path $DeployPath "db\custom.db"
$envPath = Join-Path $DeployPath ".env"
$startBatPath = Join-Path $DeployPath "start.bat"

# Verificar que la base de datos existe
if (-not (Test-Path $dbPath)) {
    Write-Host "[ERROR] Base de datos no encontrada: $dbPath" -ForegroundColor Red
    exit 1
}

# Calcular ruta absoluta con forward slashes para SQLite
$dbAbsolute = (Resolve-Path $dbPath).Path.Replace('\', '/')
$dbUrl = "file:$dbAbsolute"

Write-Host "[1] Ruta absoluta calculada: $dbUrl" -ForegroundColor Yellow
Write-Host ""

# Parchear el .env con la ruta absoluta correcta
Write-Host "[2] Actualizando .env en $envPath ..." -ForegroundColor Yellow
@"
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production
DATABASE_URL=$dbUrl
"@ | Set-Content $envPath -Encoding UTF8
Write-Host "    .env actualizado con DATABASE_URL absoluta" -ForegroundColor Green
Write-Host ""

# Reescribir start.bat con la version corregida
Write-Host "[3] Actualizando start.bat ..." -ForegroundColor Yellow
$startBatContent = @'
@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
echo ===================================================
echo   Low-Voltage Estimator v3.0.0 - Inicio (Windows)
echo ===================================================
echo.

:: Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Instala Node.js v18+ desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% detectado

:: Calcular la ruta ABSOLUTA de la base de datos desde la carpeta del script
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
set "DB_ABSOLUTE=%APP_DIR%\db\custom.db"

:: Verificar que el archivo de base de datos existe
if not exist "%DB_ABSOLUTE%" (
    echo [ERROR] Base de datos no encontrada en: %DB_ABSOLUTE%
    echo Asegurate de haber extraido todos los archivos del ZIP en esta carpeta.
    pause
    exit /b 1
)

:: Convertir backslashes a forward slashes para la URL de SQLite
set "DB_URL=%DB_ABSOLUTE:\=/%"
set "DB_FINAL_URL=file:%DB_URL%"

:: ============================================================
:: CRITICO: Reescribir .env con ruta absoluta ANTES de iniciar
:: Next.js carga .env en tiempo de ejecucion y sobreescribe
:: las variables del sistema. Esta es la unica solucion.
:: ============================================================
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
echo Presiona Ctrl+C para detener.
echo.

:: Abrir navegador despues de 3s
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Arrancar Next.js - leeara .env con la ruta absoluta correcta
node "%APP_DIR%\server.js"
pause
'@
$startBatContent | Set-Content $startBatPath -Encoding ASCII
Write-Host "    start.bat actualizado" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Parche aplicado con exito!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora ejecuta:" -ForegroundColor White
Write-Host "  cd $DeployPath" -ForegroundColor Cyan
Write-Host "  .\start.bat" -ForegroundColor Cyan
Write-Host ""
