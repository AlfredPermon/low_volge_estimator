@echo off
setlocal enabledelayedexpansion

echo ================================================
echo   Low Voltage Estimator - Script de Instalacion
echo ================================================
echo.

:: Verificar que estamos en el directorio correcto
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

:: Crear directorio de logs
if not exist "logs" mkdir logs
set "LOG_FILE=logs\install_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "LOG_FILE=%LOG_FILE: =0%"
set "LOG_FILE=%LOG_FILE:.log:=.log%"

echo.Iniciando instalacion... > "%LOG_FILE%"
echo Fecha: %date% %time% >> "%LOG_FILE%"
echo.

:: Verificar Node.js
echo [1/5] Verificando Node.js...
node --version >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js no esta instalado o no esta en el PATH
    echo   Por favor instala Node.js 20 o superior desde https://nodejs.org
    echo   Consulte la guia de instalacion para mas detalles.
    exit /b 1
)
echo   Node.js encontrado
for /f "delims=" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo   Version: %NODE_VERSION%

:: Instalar dependencias
echo [2/5] Instalando dependencias...
echo   Ejecutando npm install...
call npm install >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: Fallo la instalacion de dependencias
    echo   Revise el archivo de log para mas detalles
    type "%LOG_FILE%"
    exit /b 1
)
echo   Dependencias instaladas correctamente

:: Generar cliente Prisma
echo [3/5] Generando cliente de base de datos...
call npx prisma generate >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: Fallo la generacion del cliente Prisma
    type "%LOG_FILE%"
    exit /b 1
)
echo   Cliente de base de datos generado

:: Inicializar base de datos
echo [4/5] Inicializando base de datos...
if not exist "db" mkdir db
set "DATABASE_URL=file:./db/custom.db"
call npx prisma db push >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: Fallo la inicializacion de la base de datos
    type "%LOG_FILE%"
    exit /b 1
)
echo   Base de datos inicializada correctamente

:: Construir aplicacion
echo [5/5] Construyendo aplicacion...
call npm run build >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: Fallo la construccion de la aplicacion
    type "%LOG_FILE%"
    exit /b 1
)
echo   Aplicacion construida correctamente

echo.
echo ================================================
echo   Instalacion completada exitosamente!
echo ================================================
echo.
echo Para iniciar la aplicacion, ejecute:
echo   npm start
echo.
echo O use el script de inicio:
echo   scripts\start.bat
echo.
echo El archivo de log esta en:
echo   %LOG_FILE%
echo.

exit /b 0
