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
    if (!enabled) {
      setSuggestedSku('');
      setNextSequence(0);
      setExists(false);
      return;
    }
    
    if (!system || !category) {
      setSuggestedSku('');
      setNextSequence(0);
      setExists(false);
      return;
    }
    
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuggestedSku(data.suggestedSku);
        setNextSequence(data.nextSequence);
        setExists(data.exists);
        
        // Advertir si el SKU ya existe
        if (data.exists && data.existingItem) {
          toast.warning(`El SKU ${data.suggestedSku} ya existe`, {
            description: `Asignado a: ${data.existingItem.description}`,
          });
        }
      } else {
        throw new Error(data.error || 'Error desconocido al generar SKU');
      }
    } catch (err) {
      // Ignorar errores de aborto
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Error al generar SKU';
      setError(errorMessage);
      console.error('Error generating SKU:', err);
    } finally {
      setIsGenerating(false);
      isFetchingRef.current = false;
    }
  }, [system, category, enabled]);

  /**
   * Fuerza la regeneración del SKU
   */
  const refreshSku = useCallback(async () => {
    // Limpiar cualquier timer pendiente
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

    // Limpiar timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce para evitar múltiples llamadas rápidas
    debounceTimerRef.current = setTimeout(() => {
      generateSku();
    }, 300);
    
    return () => {
      // Limpiar al desmontar
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Cancelar petición pendiente
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
