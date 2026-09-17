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
