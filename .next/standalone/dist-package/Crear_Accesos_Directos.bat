@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
title Crear Accesos Directos - Low-Voltage Estimator
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%\create_shortcuts.ps1"
echo.
pause
