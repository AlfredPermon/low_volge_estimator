import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { SYSTEMS, CATEGORIES, DEVICE_TYPES, DEVICE_TYPE_LABELS } from "@/lib/constants";

export async function GET() {
  try {
    // Definimos los encabezados obligatorios que nuestro esquema de importación espera
    const headers = [
      "SKU",
      "Sistema",
      "Categoría",
      "Marca",
      "Modelo",
      "Descripción",
      "Unidad",
      "Costo",
      "Rendimiento",
      "TipoDispositivo",
    ];

    // Datos de ejemplo para que el usuario sepa cómo llenar la plantilla
    const sampleData = [
      {
        SKU: "CCTV-CAM-001",
        Sistema: "CCTV",
        Categoría: "Equipo",
        Marca: "Hikvision",
        Modelo: "DS-2CD2055",
        Descripción: "Cámara Bullet 5MP PoE",
        Unidad: "pza",
        Costo: 7500.50,
        Rendimiento: 0,
        TipoDispositivo: "cctv_camera_bullet",
      },
      {
        SKU: "ACC-LEC-01",
        Sistema: "ACCESO",
        Categoría: "Equipo",
        Marca: "ZKTeco",
        Modelo: "ProFaceX",
        Descripción: "Terminal de Reconocimiento Facial",
        Unidad: "pza",
        Costo: 12000.00,
        Rendimiento: 0,
        TipoDispositivo: "access_reader",
      },
      {
        SKU: "CAB-UTP-6",
        Sistema: "CABLEADO",
        Categoría: "Consumible",
        Marca: "Belden",
        Modelo: "Cat6",
        Descripción: "Cable UTP Cat6 Bobina 305m (Precio por metro)",
        Unidad: "ml",
        Costo: 15.50,
        Rendimiento: 0,
        TipoDispositivo: "cable_utp",
      },
      {
        SKU: "MO-CCTV-01",
        Sistema: "CCTV",
        Categoría: "Mano de Obra",
        Marca: "",
        Modelo: "",
        Descripción: "Mano de obra instalación cámara",
        Unidad: "lote",
        Costo: 450.00,
        Rendimiento: 1, // 1 hr
        TipoDispositivo: "labor_cctv",
      },
      {
        SKU: "EXT-PQS-4.5KG",
        Sistema: "INCENDIO",
        Categoría: "Equipo",
        Marca: "Ansul",
        Modelo: "PQS-4.5",
        Descripción: "Extintor de Polvo Químico Seco (PQS ABC) 4.5 kg",
        Unidad: "pza",
        Costo: 1100.00,
        Rendimiento: 0,
        TipoDispositivo: "fire_extinguisher",
      },
      {
        SKU: "EXT-CO2-4.5KG",
        Sistema: "INCENDIO",
        Categoría: "Equipo",
        Marca: "Ansul",
        Modelo: "CO2-4.5",
        Descripción: "Extintor de Dióxido de Carbono (CO2) 4.5 kg",
        Unidad: "pza",
        Costo: 4000.00,
        Rendimiento: 0,
        TipoDispositivo: "fire_extinguisher",
      },
      {
        SKU: "EXT-CLEAN-6.0KG",
        Sistema: "INCENDIO",
        Categoría: "Equipo",
        Marca: "Amerex",
        Modelo: "HAL-6",
        Descripción: "Extintor Agente Limpio HFC (Halotrón) 6.0 kg",
        Unidad: "pza",
        Costo: 16500.00,
        Rendimiento: 0,
        TipoDispositivo: "fire_extinguisher",
      },
      {
        SKU: "EXT-CLASSK-6L",
        Sistema: "INCENDIO",
        Categoría: "Equipo",
        Marca: "Amerex",
        Modelo: "K-6L",
        Descripción: "Extintor Clase K Acetato de Potasio 6.0 Litros",
        Unidad: "pza",
        Costo: 4600.00,
        Rendimiento: 0,
        TipoDispositivo: "fire_extinguisher",
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

    // Ajustar el ancho de las columnas
    const colWidths = headers.map(() => ({ wch: 20 }));
    colWidths[5] = { wch: 40 }; // Descripción más ancha
    worksheet["!cols"] = colWidths;

    // Crear otra hoja para mostrar los tipos de dispositivos válidos (Referencia)
    const referenceData = DEVICE_TYPES.map((type) => ({
      TipoDispositivo: type,
      Descripción: DEVICE_TYPE_LABELS[type as keyof typeof DEVICE_TYPE_LABELS],
    }));
    const refWorksheet = XLSX.utils.json_to_sheet(referenceData);
    refWorksheet["!cols"] = [{ wch: 30 }, { wch: 40 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Precios");
    XLSX.utils.book_append_sheet(workbook, refWorksheet, "Referencia_Tipos");

    // Escribir a buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="plantilla_precios_lve.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Error al generar la plantilla" },
      { status: 500 }
    );
  }
}
