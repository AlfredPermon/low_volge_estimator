import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * API para detectar y analizar registros duplicados en la base de datos de precios.
 * Analiza por SKU, Modelo y Descripción con normalización para evitar falsos positivos.
 */

interface DuplicateItem {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  deviceType: string;
  active: boolean;
  createdAt: string;
}

interface DuplicateGroup {
  key: string;
  field: 'sku' | 'model' | 'description';
  items: DuplicateItem[];
}

interface AnalysisResult {
  success: boolean;
  duplicates: DuplicateGroup[];
  summary: {
    totalGroups: number;
    totalDuplicates: number;
    fieldsAnalyzed: string[];
    totalItemsAnalyzed: number;
  };
}

/**
 * Normaliza un valor para comparación (case-insensitive, espacios normalizados)
 */
function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extrae el valor normalizado de un campo para análisis de duplicados
 */
function getNormalizedField(item: DuplicateItem, field: 'sku' | 'model' | 'description'): string {
  const value = item[field] || '';
  return normalizeForComparison(value);
}

export async function GET(request: NextRequest): Promise<NextResponse<AnalysisResult | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field") as 'sku' | 'model' | 'description' | 'all' | null;
    const threshold = parseInt(searchParams.get("threshold") ?? "2", 10);

    // Obtener todos los items activos
    const items = await db.priceItem.findMany({
      where: { active: true },
      select: {
        id: true,
        sku: true,
        system: true,
        category: true,
        brand: true,
        model: true,
        description: true,
        unit: true,
        unitCost: true,
        deviceType: true,
        active: true,
        createdAt: true,
      },
    });

    const duplicates: DuplicateGroup[] = [];

    // Determinar qué campos analizar
    const fieldsToCheck: Array<'sku' | 'model' | 'description'> = 
      field === 'all' || !field 
        ? ['sku', 'model', 'description'] 
        : [field];

    // Para cada campo, encontrar grupos duplicados
    for (const fieldName of fieldsToCheck) {
      const groups = new Map<string, DuplicateItem[]>();

      // Agrupar items por el campo normalizado
      items.forEach((item) => {
        const normalizedValue = getNormalizedField(item as unknown as DuplicateItem, fieldName);

        // Ignorar valores vacíos
        if (!normalizedValue) return;

        if (!groups.has(normalizedValue)) {
          groups.set(normalizedValue, []);
        }
        groups.get(normalizedValue)!.push(item as unknown as DuplicateItem);
      });

      // Agregar grupos que tienen más de threshold items
      groups.forEach((groupItems, key) => {
        if (groupItems.length >= threshold) {
          duplicates.push({
            key,
            field: fieldName,
            items: groupItems.map((item) => ({
              id: item.id,
              sku: item.sku,
              system: item.system,
              category: item.category,
              brand: item.brand,
              model: item.model,
              description: item.description,
              unit: item.unit,
              unitCost: Number(item.unitCost),
              deviceType: item.deviceType,
              active: item.active,
              createdAt: new Date(item.createdAt).toISOString(),
            })),
          });
        }
      });
    }

    // Ordenar por cantidad de duplicados (descendente)
    duplicates.sort((a, b) => b.items.length - a.items.length);

    return NextResponse.json({
      success: true,
      duplicates,
      summary: {
        totalGroups: duplicates.length,
        totalDuplicates: duplicates.reduce((acc, d) => acc + d.items.length, 0),
        fieldsAnalyzed: fieldsToCheck,
        totalItemsAnalyzed: items.length,
      },
    });

  } catch (error) {
    console.error("Error analyzing duplicates:", error);
    return NextResponse.json(
      { error: "Error al analizar duplicados. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}
