'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface SkuGeneratorOptions {
  system: string;
  category: string;
  enabled: boolean;
}

interface SkuGeneratorResult {
  suggestedSku: string;
  isGenerating: boolean;
  error: string | null;
  nextSequence: number;
  exists: boolean;
  refreshSku: () => Promise<void>;
  validateSku: (sku: string) => Promise<boolean>;
}

// Mapa de abreviaturas de categorías para fallback local
const CATEGORY_ABBREVIATIONS: Record<string, string> = {
  'Equipo': 'EQP',
  'Accesorio': 'ACC',
  'Consumible': 'CON',
  'Mano de Obra': 'MO',
  'Servicio': 'SRV',
};

// Mapa de abreviaturas de sistemas para fallback local
const SYSTEM_ABBREVIATIONS: Record<string, string> = {
  'CCTV': 'CCTV',
  'ACCESO': 'ACC',
  'VOCEO': 'VOC',
  'INCENDIO': 'FIR',
  'CANALIZACION': 'CAN',
  'CABLEADO': 'CAB',
  'GENERAL': 'GEN',
};

/**
 * Hook personalizado para generación automática de SKU
 * 
 * Este hook maneja la comunicación con la API para obtener el siguiente
 * consecutivo de SKU basado en el sistema y categoría seleccionados.
 */
export function useSkuGenerator(options: SkuGeneratorOptions): SkuGeneratorResult {
  const { system, category, enabled } = options;

  const [suggestedSku, setSuggestedSku] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextSequence, setNextSequence] = useState<number>(0);
  const [exists, setExists] = useState<boolean>(false);

  // Ref para evitar múltiples llamadas simultáneas
  const isFetchingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Genera el SKU basado en los parámetros actuales
   */
  const generateSku = useCallback(async () => {
    // Validaciones previas
    if (!enabled || !system || !category) {
      setSuggestedSku('');
      setNextSequence(0);
      setExists(false);
      return;
    }

    const systemAbbr = SYSTEM_ABBREVIATIONS[system] || system.substring(0, 3).toUpperCase();
    const categoryAbbr = CATEGORY_ABBREVIATIONS[category] || category.substring(0, 3).toUpperCase();
    const fallbackSku = `${systemAbbr}-${categoryAbbr}-001`;

    // Evitar llamadas duplicadas simultáneas
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsGenerating(true);
    setError(null);

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams();
      params.set('system', system);
      params.set('category', category);

      const response = await fetch(`/api/prices/sku-next?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // En lugar de lanzar una excepción que crashea el runtime de Next.js, usar fallback seguro
        setSuggestedSku(fallbackSku);
        setNextSequence(1);
        setExists(false);
        setError(`Respuesta HTTP ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data && data.success) {
        setSuggestedSku(data.suggestedSku || fallbackSku);
        setNextSequence(data.nextSequence || 1);
        setExists(!!data.exists);

        if (data.exists && data.existingItem) {
          toast.warning(`El SKU ${data.suggestedSku} ya existe`, {
            description: `Asignado a: ${data.existingItem.description}`,
          });
        }
      } else {
        setSuggestedSku(fallbackSku);
        setNextSequence(1);
        setExists(false);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Fallback local ante errores de red o parseo
      setSuggestedSku(fallbackSku);
      setNextSequence(1);
      setExists(false);
      setError('Servicio SKU no disponible');
    } finally {
      setIsGenerating(false);
      isFetchingRef.current = false;
    }
  }, [system, category, enabled]);

  /**
   * Fuerza la regeneración del SKU
   */
  const refreshSku = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await generateSku();
  }, [generateSku]);

  /**
   * Valida si un SKU específico está disponible
   */
  const validateSku = useCallback(async (sku: string): Promise<boolean> => {
    if (!sku.trim()) return false;

    try {
      const response = await fetch(`/api/prices/sku-next?sku=${encodeURIComponent(sku)}`);
      if (!response.ok) return false;

      const data = await response.json();
      return data.success && !data.exists;
    } catch {
      return false;
    }
  }, []);

  // Efecto para generar SKU cuando cambien los parámetros relevantes
  useEffect(() => {
    if (!enabled || !system || !category) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generateSku();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, system, category, generateSku]);

  return {
    suggestedSku,
    isGenerating,
    error,
    nextSequence,
    exists,
    refreshSku,
    validateSku,
  };
}

export default useSkuGenerator;
