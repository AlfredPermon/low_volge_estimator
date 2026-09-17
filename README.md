# Low Voltage Estimator (Estimador de Sistemas Especiales de Bajo Voltaje)

> Sistema web integral diseñado para automatizar, estandarizar y validar el cálculo de presupuestos paramétricos y análisis de precios unitarios (APU) para ingeniería de bajo voltaje y sistemas especiales.

---

## 📋 Propósito del Proyecto

### ¿De qué trata la aplicación?
**Low Voltage Estimator** es una plataforma moderna para ingenieros, proyectistas y estimadores de costos de instalaciones de bajo voltaje. La aplicación centraliza la cotización y dimensionamiento de especialidades clave como **CCTV / Videovigilancia**, **Control de Acceso**, **Detección y Alarma Contra Incendio**, **Voz y Datos**, **Audio Ambiental** e **Intrusión**.

### ¿Qué problema resuelve?
Tradicionalmente, las estimaciones paramétricas en ingeniería de instalaciones se realizan mediante hojas de cálculo (Excel), lo cual presenta severos inconvenientes:
- **Errores de referencia y fórmulas rotas** (`#REF!`, `#VALOR!`).
- **Inconsistencia de códigos y conceptos duplicados** en distintas secciones del presupuesto.
- **Unidades no normalizadas** (ej. mezclas de `m.l.`, `ml`, `mts.`, `pza.`, `PZA`).
- **Diferencias de redondeo** en la acumulación de indirectos y utilidades.
- **Falta de auditoría y trazabilidad** en cambios de costos de insumos.

### ¿Por qué es útil?
Esta plataforma ofrece un motor de cálculo financiero y técnico validado, eliminando la dependencia de fórmulas manuales. Garantiza presupuestos exactos, normalizados y profesionales con desgloses claros de materiales, cuadrillas de mano de obra, indirectos, utilidad e IVA, ahorrando horas de trabajo manual y previniendo pérdidas financieras por errores de cálculo.

---

## ✨ Funciones Principales

1. **Motor de Análisis de Precios Unitarios (APU)**:
   - Cálculo automático del Costo Directo ($Materiales + ManoDeObra$).
   - Factor de Indirectos configurable (ej. 25%).
   - Factor de Utilidad configurable (ej. 13%).
   - Cálculo automático de IVA (16%) e importes por concepto, subcapítulo y total general.

2. **Gestión de Cuadrillas y Mano de Obra**:
   - Configuración flexible de tarifas base para perfiles técnicos: *Técnico*, *Oficial* y *Ayudante*.
   - Asignación de rendimientos por concepto o plantilla de instalación.

3. **Herramientas de Especialidad Técnica**:
   - **CCTV / Videovigilancia**: Calculadora integrada de almacenamiento en disco y ancho de banda según resolución, cuadros por segundo (FPS), cantidad de cámaras y días de retención (códecs H.264, H.265, H.265+). Validación de cumplimiento NDAA / ONVIF.
   - **Control de Acceso**: Cotización paramétrica de lectores biométricos, videoporteros, chapas magnéticas, botones y licencias.
   - **Detección y Alarma contra Incendio**: Motor de cálculo de cobertura y cantidad de detectores, estaciones manuales, sirenas estrobo y metros de cable FPLR.

4. **Visualizador Interactivo de Planos (Floorplan View)**:
   - Carga de planos arquitectónicos (imágenes / planos).
   - Ubicación visual de dispositivos sobre el plano.
   - Trazado de rutas de canalización y cálculo automático de geometría y mermas de cableado.

5. **Normalización y Validación Automática**:
   - **Detector de Inconsistencias**: Alerta sobre códigos duplicados, importes en cero, o conceptos sin mano de obra/material.
   - **Normalizador de Unidades**: Convierte automáticamente variantes de texto (`m.l.`, `mts`) a estándares unificados (`ML`, `PZA`, `SERV`).

6. **Catálogo Maestro e Histórico de Precios**:
   - Registro centralizado de insumos, marcas, modelos y especificaciones.
   - Auditoría de cambios de precios e historial de cotizaciones anteriores.

7. **Exportación e Reportes Ejecutivos**:
   - Generación de reportes detallados en formato **PDF** y hojas de cálculo **Excel (.xlsx)**.
   - Gráficas analíticas e indicadores financieros por sistema y frente de trabajo.

---

## 🛠️ Instrucciones de Instalación

Sigue estos pasos para configurar el entorno de desarrollo local y poner en marcha la aplicación:

### Requisitos Previos
- **Node.js**: Versión 18.0 o superior (recomendado Node v20+).
- **npm** o **bun**: Gestor de paquetes.
- **Git**: Sistema de control de versiones.

### Pasos de Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/low_voltage_estimator.git
   cd low_voltage_estimator
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```
   *(o si usas Bun: `bun install`)*

3. **Configurar Variables de Entorno**:
   Crea un archivo `.env` en la raíz del proyecto (puedes tomar como base el entorno actual) especificando la ruta de la base de datos SQLite:
   ```env
   DATABASE_URL="file:./db/custom.db"
   ```

4. **Inicializar y migrar la Base de Datos**:
   Ejecuta Prisma para generar el cliente y sincronizar el esquema SQLite:
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Iniciar el Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```

6. **Acceder a la Aplicación**:
   Abre tu navegador e ingresa a `http://localhost:3000`.

---

## 📖 Guía de Uso

### Comandos Básicos en Terminal

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 3000 con Hot Reload. |
| `npm run build` | Compila y genera el paquete de producción optimizado (Next.js standalone). |
| `npm run start` | Arranca el servidor de producción compilado. |
| `npm run lint` | Ejecuta ESLint para validar reglas de estilo y calidad de código. |
| `npm run test` | Corre la suite completa de pruebas unitarias e integración (`tsx`). |
| `npm run db:push` | Aplica los cambios del archivo `prisma/schema.prisma` a la base de datos local. |

### Flujo Típico de Cotización

1. **Configurar el Proyecto**:
   - Ingresa los datos generales (Nombre, Cliente, Ubicación, Moneda).
   - Establece los factores financieros del proyecto: **Indirecto** (ej. 25%), **Utilidad** (ej. 13%) e **IVA** (ej. 16%).

2. **Ajustar Tarifas de Mano de Obra**:
   - Define el costo por jornada laboral para Técnicos, Oficiales y Ayudantes.

3. **Agregar Conceptos y Equipos**:
   - Selecciona el sistema correspondiente (**CCTV**, **Control de Acceso**, **Incendio**, etc.).
   - Agrega ítems desde el catálogo maestro o crea nuevos conceptos especificando cantidades y rendimiento.

4. **Utilizar el Visualizador de Planos (Opcional)**:
   - Sube la imagen del plano del inmueble.
   - Posiciona las cámaras o detectores sobre el plano y traza los recorridos de tubería para calcular automáticamente las distancias.

5. **Validar y Exportar**:
   - Revisa el panel de **Validación** para verificar que no existan advertencias ni faltantes.
   - Haz clic en **Exportar a PDF** o **Exportar a Excel** para descargar la propuesta comercial lista para entrega.

---

## 🤝 Pautas de Colaboración

¡Las contribuciones son bienvenidas! Para mantener la calidad y consistencia de la base de código, por favor sigue estas reglas:

### 1. Estilo de Código y Estándares
- **TypeScript**: Utiliza tipado estricto. Evita el uso de `any`; define interfaces o tipos en `src/lib/` o schemas con **Zod**.
- **Componentes React**: Utiliza React 19 y Next.js App Router con Server/Client Components explícitos (`'use client'` cuando sea necesario).
- **Estilos**: Usa **Tailwind CSS v4** y componentes accesibles de **Radix UI** / **shadcn/ui**.

### 2. Pruebas Unitarias Obligatorias
- Si añades una nueva función de cálculo, validador o motor de reglas (en `src/lib/`), debes incluir su archivo de prueba correspondiente en el directorio `tests/`.
- Asegúrate de que todas las pruebas pasen antes de enviar tu contribución:
  ```bash
  npm run test
  ```

### 3. Flujo de Trabajo con Git
1. Crea una rama secundaria a partir de `main` con un nombre descriptivo:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   # o para corrección de errores:
   git checkout -b fix/correccion-calculo-cctv
   ```
2. Realiza commits claros utilizando la convención de **Commits Semánticos**:
   - `feat: agrega exportación de reportes en Excel`
   - `fix: corrige redondeo en cálculo de indirectos`
   - `docs: actualiza el archivo README`
3. Verifica la calidad del código localmente:
   ```bash
   npm run lint
   npm run test
   ```
4. Abre un **Pull Request (PR)** detallando los cambios realizados, las pruebas ejecutadas y capturas de pantalla si modificaste la interfaz de usuario.

---

## 📂 Estructura del Proyecto

```text
low_voltage_estimator/
├── prisma/               # Esquema de base de datos ORM y base SQLite
├── public/               # Recursos estáticos e imágenes
├── src/
│   ├── app/              # Rutas y páginas de Next.js (App Router)
│   ├── components/       # Componentes de UI (Radix/shadcn) y vistas del estimador
│   │   ├── estimator/    # Formularios de CCTV, Incendio, Acceso, Floorplan y APU
│   │   └── ui/           # Componentes base reutilizables de interfaz
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # Motor de cálculo financiero, validadores, PDF y CSV
│   └── store/            # Estado global de la aplicación (Zustand)
├── tests/                # Suite de pruebas unitarias de integraciones y cálculos
├── package.json          # Dependencias y scripts del proyecto
└── README.md             # Documentación principal
```

---

## ⚡ Tecnologías Utilizadas

- **Framework Web**: [Next.js 16](https://nextjs.org/) (App Router)
- **Biblioteca de UI**: [React 19](https://react.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Base de Datos & ORM**: [Prisma](https://www.prisma.io/) con SQLite
- **Gestión de Estado**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Validación de Datos**: [Zod](https://zod.dev/)
- **Generación de Documentos**: `@react-pdf/renderer`, `jspdf`, `xlsx`
- **Pruebas**: Node Test Runner con `tsx`

---

*Desarrollado para optimizar la ingeniería de costos y presupuestos de bajo voltaje.*
