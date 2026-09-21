import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * API para generar el siguiente SKU disponible para un sistema y categoría específicos.
 * 
 * La nomenclatura SKU sigue el patrón: {SISTEMA}-{CATEGORÍA_ABREV}-{CONSECUTIVO}
 * Ejemplos: CCTV-EQP-001, ACC-TER-001, CAB-UTP-001
 */

// Mapa de abreviaturas de categorías
const CATEGORY_ABBREVIATIONS: Record<string, string> = {
  'Equipo': 'EQP',
  'Accesorio': 'ACC',
  'Consumible': 'CON',
  'Mano de Obra': 'MO',
  'Servicio': 'SRV',
};

// Mapa de abreviaturas de sistemas
const SYSTEM_ABBREVIATIONS: Record<string, string> = {
  'CCTV': 'CCTV',
  'ACCESO': 'ACC',
  'VOCEO': 'VOC',
  'INCENDIO': 'FIR',
  'CANALIZACION': 'CAN',
  'CABLEADO': 'CAB',
  'GENERAL': 'GEN',
};

interface SkuPattern {
  system: string;
  categoryAbbr: string;
  sequence: number;
}

/**
 * Parsea un SKU existente para extraer el consecutivo
 */
function parseSkuSequence(sku: string): number | null {
  const pattern = /^([A-Z]+)-([A-Z]+)-(\d+)$/;
  const match = sku.match(pattern);
  if (!match) return null;
  return parseInt(match[3], 10);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const system = searchParams.get("system");
    const category = searchParams.get("category");
    const skuToCheck = searchParams.get("sku"); // Para validar si un SKU específico existe

    // Si solo se pide validar un SKU existente
    if (skuToCheck) {
      const existingItem = await db.priceItem.findFirst({
        where: {
          sku: skuToCheck,
          active: true,
        },
        select: {
          id: true,
          description: true,
          system: true,
          category: true,
        },
      });

      return NextResponse.json({
        success: true,
        exists: !!existingItem,
        item: existingItem || null,
      });
    }

    // Validar parámetros requeridos
    if (!system || !category) {
      return NextResponse.json(
        { error: "Se requieren los parámetros 'system' y 'category'" },
        { status: 400 }
      );
    }

    // Obtener abreviaturas
    const systemAbbr = SYSTEM_ABBREVIATIONS[system] || system.substring(0, 3).toUpperCase();
    const categoryAbbr = CATEGORY_ABBREVIATIONS[category] || category.substring(0, 3).toUpperCase();

    // Buscar SKUs existentes para este sistema-categoría
    const existingItems = await db.priceItem.findMany({
      where: {
        system: system,
        category: category,
        active: true,
        sku: {
          startsWith: `${systemAbbr}-${categoryAbbr}-`,
        },
      },
      select: {
        sku: true,
      },
      orderBy: {
        sku: 'desc',
      },
      take: 500, // Limitar para mejor rendimiento
    });

    // Encontrar el máximo consecutivo
    let maxSequence = 0;
    for (const item of existingItems) {
      const sequence = parseSkuSequence(item.sku);
      if (sequence !== null && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    // Generar el siguiente SKU
    const nextSequence = maxSequence + 1;
    const suggestedSku = `${systemAbbr}-${categoryAbbr}-${String(nextSequence).padStart(3, '0')}`;

    // Verificar si ya existe exactamente este SKU
    const existingExactSku = await db.priceItem.findFirst({
      where: {
        sku: suggestedSku,
        active: true,
      },
      select: {
        id: true,
        description: true,
      },
    });

    return NextResponse.json({
      success: true,
      suggestedSku,
      nextSequence,
      systemAbbr,
      categoryAbbr,
      exists: !!existingExactSku,
      existingItem: existingExactSku || null,
      existingCount: existingItems.length,
    });

  } catch (error) {
    console.error("Error generating next SKU:", error);
    return NextResponse.json(
      { error: "Error al generar el siguiente SKU. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}
