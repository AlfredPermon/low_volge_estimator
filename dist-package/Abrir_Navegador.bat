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
