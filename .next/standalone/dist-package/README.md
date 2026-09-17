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
