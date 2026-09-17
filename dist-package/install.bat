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
