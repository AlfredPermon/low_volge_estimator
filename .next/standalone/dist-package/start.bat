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
