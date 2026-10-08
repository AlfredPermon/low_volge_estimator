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

:: Crear el script de Node.js temporalmente
(
echo const { PrismaClient } = require('@prisma/client'^);
echo const prisma = new PrismaClient(^);
echo.
echo async function main(^) {
echo   const email = 'admin.jose@empresa.com';
echo   const password = 'AdminPassword123!';
echo   const hashedPw = '3f30692f42e584863df4378be60dbc75:21fa8a6ae819757c1b79efbb9434dea5167656906dd1e10c739ebc1cc571f954d56ba12e6c33f7f6edbfb9c535278f7226f421e6168b2b9d5040959fc2264d7f';
echo.
echo   console.log('Verificando base de datos...'^);
echo   try {
echo     let user = await prisma.user.findUnique({ where: { email } }^);
echo.
echo     if (!user^) {
echo       user = await prisma.user.create({
echo         data: {
echo           email: email,
echo           name: 'José Administrador',
echo           role: 'admin',
echo           active: true,
echo           emailVerified: true
echo         }
echo       }^);
echo       console.log('Usuario admin.jose@empresa.com creado.'^);
echo     } else {
echo       await prisma.user.update({
echo         where: { id: user.id },
echo         data: { role: 'admin', active: true }
echo       }^);
echo       console.log('Usuario admin.jose@empresa.com actualizado.'^);
echo     }
echo.
echo     const acc = await prisma.account.updateMany({
echo       where: { userId: user.id, providerId: 'credential' },
echo       data: { password: hashedPw }
echo     }^);
echo.
echo     if (acc.count === 0^) {
echo       await prisma.account.create({
echo         data: {
echo           userId: user.id,
echo           accountId: user.id,
echo           providerId: 'credential',
echo           password: hashedPw
echo         }
echo       }^);
echo     }
echo.
echo     console.log('\n==================================='^);
echo     console.log('  CREDENCIALES RESTABLECIDAS EXITOSAMENTE'^);
echo     console.log('==================================='^);
echo     console.log(`Correo:     ${email}`^);
echo     console.log(`Contraseña: ${password}`^);
echo     console.log('===================================\n'^);
echo   } catch (err^) {
echo     console.error('Error:', err.message^);
echo   } finally {
echo     await prisma.$disconnect(^);
echo   }
echo }
echo.
echo main(^);
) > "_temp_reset.js"

echo Ejecutando script de restablecimiento sin dependencias externas...
node _temp_reset.js
del "_temp_reset.js"

echo.
pause
