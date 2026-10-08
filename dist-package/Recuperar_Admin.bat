@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
title Restablecer Administrador
color 0A

echo ===================================================
echo   Low-Voltage Estimator - Restablecer Admin
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    pause
    exit /b 1
)

:: Trabajar siempre desde la carpeta de la aplicacion
cd /d "%~dp0"
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
set "DB_ABSOLUTE=%APP_DIR%\db\custom.db"

if not exist "%APP_DIR%\scripts\db-tools.cjs" (
    echo [ERROR] No se encontro scripts\db-tools.cjs. Reinstale la aplicacion.
    pause
    exit /b 1
)

:: Si aun no existe la base de datos, inicializarla desde la plantilla
if not exist "%DB_ABSOLUTE%" (
    if exist "%APP_DIR%\db\seed_custom.db" (
        echo [INFO] Inicializando base de datos desde plantilla...
        copy /y "%APP_DIR%\db\seed_custom.db" "%DB_ABSOLUTE%" >nul
    )
)
if not exist "%DB_ABSOLUTE%" (
    echo [ERROR] Base de datos no encontrada en: %DB_ABSOLUTE%
    pause
    exit /b 1
)

:: Respaldo preventivo antes de modificar
for /f %%t in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd_HHmmss')"') do set "TS=%%t"
if "%TS%"=="" set "TS=%RANDOM%"
copy /y "%DB_ABSOLUTE%" "%DB_ABSOLUTE%.bak_%TS%" >nul
echo [OK] Respaldo creado: db\custom.db.bak_%TS%
echo.

:: Actualiza el esquema (crea tablas faltantes) y restablece el admin
node "%APP_DIR%\scripts\db-tools.cjs" reset-admin --db "%DB_ABSOLUTE%"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo restablecer el administrador.
)

echo.
pause
