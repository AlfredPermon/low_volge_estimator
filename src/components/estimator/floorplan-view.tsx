'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useEstimateStore, FloorplanDevice, FloorplanRack, PathwayNode, PathwaySegment, BuildingLevel } from '@/store/estimate-store';
import { calculateRealTrajectories, calculateSystemMetricsBreakdown, SpatialCalculationResult, SystemMetricsBreakdownResult } from '@/lib/calculator';
import { validateNewPathwaySegment } from '@/lib/pathway-geometry';
import { Segment } from '@/lib/routing-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MapPin,
  Server,
  PlusCircle,
  Ruler,
  Upload,
  RotateCcw,
  AlertTriangle,
  Cable,
  Box,
  Layers,
  Sparkles,
  MousePointer,
  Trash2,
  GitFork,
  Undo2,
  Building2,
  Edit3,
  Copy,
  MoreVertical,
  Check,
  FolderOpen,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Wrench,
  RefreshCw,
  FolderTree,
  Maximize2,
  Minimize2,
  Eye,
  ShieldCheck,
  Zap,
  Flame,
  Radio,
  Lock,
  Camera,
  Activity,
  Layers3,
  Hand,
  Wind,
  FileText,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  evaluarAdvertenciaExclusionHVAC,
  sembrarDetectoresHumoNFPA72,
  validarCapacidadLazoSLC,
  calcularMetrajeCable3DFire,
  calcularDiametroCanalizacion,
  generarBOMFire,
  NFPA72_SMOKE_RADIUS_METERS,
  HOCHIKI_SLC_MAX_DEVICES,
  BOMFireResult,
  ZonaExclusion,
  DispositivoFire,
} from '@/lib/fire-engine';

import { useFireStore } from '@/store/useFireStore';
import { validateExtinguisherNormative } from '@/lib/fireNormativeValidator';
import { ExtinguisherType, ExtinguisherCapacity } from '@/types/fireProtection';
import { ExtinguisherSeedToolbar } from '@/components/plano-espacial/extinguisher-seed/ExtinguisherSeedToolbar';
import { ExtinguisherFloatingToolbar } from '@/components/plano-espacial/extinguisher-seed/ExtinguisherFloatingToolbar';
import { ExtinguisherCanvasLayer } from '@/components/plano-espacial/extinguisher-seed/ExtinguisherCanvasLayer';
import { ExtinguisherSummarySheet } from '@/components/plano-espacial/extinguisher-seed/ExtinguisherSummarySheet';

import { useEmergencyStore } from '@/store/useEmergencyStore';
import { validateEmergencySignNormative } from '@/lib/emergencyNormativeValidator';
import { EmergencyExitToolbar } from '@/components/plano-espacial/emergency-exit/EmergencyExitToolbar';
import { EmergencyExitFloatingToolbar } from '@/components/plano-espacial/emergency-exit/EmergencyExitFloatingToolbar';
import { EmergencyExitCanvasLayer } from '@/components/plano-espacial/emergency-exit/EmergencyExitCanvasLayer';
import { EmergencyExitSummarySheet } from '@/components/plano-espacial/emergency-exit/EmergencyExitSummarySheet';

type ToolMode = 'select' | 'pan' | 'add_rack' | 'add_device' | 'add_pathway' | 'edit_pathway' | 'calibrate' | 'add_exclusion_zone';

interface FloorplanViewProps {
  onSave?: () => Promise<string | null | void> | void;
  isSaving?: boolean;
}

const SYSTEM_COLORS: Record<string, { main: string; bg: string; border: string; text: string; lightBg: string }> = {
  cctv: { main: '#059669', bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-700', lightBg: 'bg-emerald-50' },
  access: { main: '#d97706', bg: 'bg-amber-600', border: 'border-amber-600', text: 'text-amber-700', lightBg: 'bg-amber-50' },
  paging: { main: '#7c3aed', bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-700', lightBg: 'bg-purple-50' },
  fire: { main: '#dc2626', bg: 'bg-red-600', border: 'border-red-600', text: 'text-red-700', lightBg: 'bg-red-50' },
  extinguisher: { main: '#ea580c', bg: 'bg-orange-600', border: 'border-orange-600', text: 'text-orange-700', lightBg: 'bg-orange-50' },
  emergency_exit: { main: '#00A651', bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-700', lightBg: 'bg-emerald-50' },
};

const SYSTEM_SUBTYPES: Record<string, string[]> = {
  cctv: ['IP Bullet', 'IP Domo', 'PTZ 360°', 'Fisheye 180°', 'LPR Lectura Placas'],
  access: ['Lector Biométrico', 'Lector Proximidad', 'Cerradura Magnética', 'Botón de Salida', 'Torniquete'],
  paging: ['Bocina Plafón', 'Bocina Muro', 'Bocina Intemperie', 'Bocina IP'],
  fire: [
    'Detector de Humo (Base HSB-NSA-6)',
    'Detector Térmico',
    'Estación Manual (DCP-AMS-KL-LPS)',
    'Sirena Estrobo (HEC3-24WR)',
    'Panel Principal Hochiki (FNP-1127US2ERS-120)',
    'Anunciador Remoto LCD (FN-LCD-N-R)',
    'Módulo de Control',
  ],
  extinguisher: [
    'Extintor CO2 5lbs',
    'Extintor CO2 10lbs',
    'Extintor Agente Limpio 4.5kg',
    'Extintor Agente Limpio 6.0kg',
    'Extintor PQS ABC 6.0kg',
    'Extintor PQS ABC 9.0kg',
    'Extintor Agua Presurizada 9.0L',
    'Extintor Clase K 6.0L',
  ],
  emergency_exit: [
    'Salida de Emergencia (Puerta Exterior)',
    'Escalera de Emergencia',
    'Ruta de Evacuación (Flecha Derecha →)',
    'Ruta de Evacuación (Flecha Izquierda ←)',
    'Ruta de Evacuación (Flecha Arriba ↑)',
    'Ruta de Evacuación (Flecha Abajo ↓)',
    'Zona de Seguridad / Punto de Reunión',
    'Estación de Primeros Auxilios',
  ],
};

export default function FloorplanView({ onSave, isSaving = false }: FloorplanViewProps) {
  const store = useEstimateStore();
  const config = store.floorplanConfig;
  const buildingLevels = store.buildingLevels || [];
  
  const [internalSaving, setInternalSaving] = useState(false);
  const isSavingLocal = isSaving || internalSaving;

  // State for Tree Navigation & Level Selection
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(buildingLevels[0]?.id || 'level_pb');
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({
    level_pb: true,
    level_n2: true,
    level_n3: false,
    level_n4: false,
    level_az5: false,
  });
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<'all' | 'cctv' | 'access' | 'paging' | 'fire' | 'extinguisher' | 'emergency_exit'>('all');
  const fireStore = useFireStore();
  const emergencyStore = useEmergencyStore();
  const [showExtinguisherSummary, setShowExtinguisherSummary] = useState(false);
  const [showEmergencySummary, setShowEmergencySummary] = useState(false);

  // Manual Recalculation Sync trigger
  const [syncTrigger, setSyncTrigger] = useState(0);

  // Fullscreen & Lightbox Modal state
  const [showFullsizeModal, setShowFullsizeModal] = useState(false);

  // Sync / Recalculate action handler
  const handleSyncRecalc = useCallback(() => {
    setSyncTrigger((prev) => prev + 1);
    toast.success('Métricas y cálculos espaciales 2.5D sincronizados correctamente', {
      icon: '🔄',
    });
  }, []);

  const handleSaveAvances = useCallback(async () => {
    setInternalSaving(true);
    try {
      if (onSave) {
        await onSave();
      } else {
        const body: Record<string, unknown> = {
          name: store.name,
          clientName: store.clientName,
          projectName: store.projectName,
          currency: store.currency,
          revision: store.revision,
          responsible: store.responsible,
          notes: store.notes,
          factorsNotes: store.factorsNotes,
          wasteFactorCable: store.factors.wasteFactorCable,
          wasteFactorConduit: store.factors.wasteFactorConduit,
          verticalDrop: store.factors.verticalDrop,
          rackAllowance: store.factors.rackAllowance,
          indirectFactor: store.factors.indirectFactor,
          ivaRate: store.factors.ivaRate,
          roundingPolicy: store.factors.roundingPolicy,
          laborTechnicianRate: store.factors.laborRates.technician,
          laborOfficerRate: store.factors.laborRates.officer,
          laborHelperRate: store.factors.laborRates.helper,
          useCrewBasedLabor: store.factors.useCrewBasedLabor,
          cctvConfig: JSON.stringify(store.cctvConfig),
          accessConfig: JSON.stringify(store.accessConfig),
          pagingConfig: JSON.stringify(store.pagingConfig),
          fireConfig: JSON.stringify(store.fireConfig),
          floorplanConfig: JSON.stringify({
            buildingLevels: store.buildingLevels,
            activeFloorplanId: store.activeFloorplanId,
            floorplans: store.floorplans,
          }),
        };

        const id = store.estimateId;
        if (id) {
          await fetch(`/api/estimates/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } else {
          const res = await fetch('/api/estimates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (data?.id) {
            store.setEstimateId(data.id);
          }
        }
        toast.success('Plano y avances de sembrado guardados correctamente');
      }
    } catch (err) {
      console.error('Error al guardar plano:', err);
      toast.error('Error al guardar los avances del plano');
    } finally {
      setInternalSaving(false);
    }
  }, [onSave, store]);

  // Keyboard Shortcuts (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAvances();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveAvances]);

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [selectedSystem, setSelectedSystem] = useState<'cctv' | 'access' | 'paging' | 'fire' | 'extinguisher' | 'emergency_exit'>('cctv');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('IP Bullet');

  // Helper de Sincronización Automática de Sistema y Dispositivo (previene errores de sembrado)
  const handleSystemChange = useCallback((sys: 'cctv' | 'access' | 'paging' | 'fire' | 'extinguisher' | 'emergency_exit') => {
    setSelectedSystem(sys);
    setSelectedSystemFilter(sys);
    const firstSubtype = SYSTEM_SUBTYPES[sys]?.[0] || '';
    if (firstSubtype) {
      setSelectedSubtype(firstSubtype);
    }
  }, []);

  // Helper para auto-detectar y seleccionar el sistema del plano al hacer clic en el árbol de Jerarquía del Proyecto
  const detectAndSetSystemForFloorplan = useCallback(
    (fp: any) => {
      if (!fp) return;
      const n = (fp.name || '').toLowerCase();

      // 1. Extintores / Extinguisher
      if (
        n.includes('extinguish') ||
        n.includes('extinguis') ||
        n.includes('extinguiser') ||
        n.includes('extingus') ||
        n.includes('extinguer') ||
        n.includes('extintor') ||
        n.includes('extintores')
      ) {
        handleSystemChange('extinguisher');
        return;
      }

      // 2. Emergency Exit / Señalética de Emergencia / Rutas
      if (
        n.includes('emergenc') ||
        n.includes('salida') ||
        n.includes('evacuac') ||
        n.includes('evacuació') ||
        n.includes('señal') ||
        n.includes('senal') ||
        n.includes('ruta')
      ) {
        handleSystemChange('emergency_exit');
        return;
      }

      // 3. CCTV / Videovigilancia
      if (
        n.includes('cctv') ||
        n.includes('camara') ||
        n.includes('cámara') ||
        n.includes('video') ||
        n.includes('vigilancia')
      ) {
        handleSystemChange('cctv');
        return;
      }

      // 4. Control de Acceso
      if (
        n.includes('access') ||
        n.includes('acceso') ||
        n.includes('acces') ||
        n.includes('puerta') ||
        n.includes('biometrico') ||
        n.includes('biométrico')
      ) {
        handleSystemChange('access');
        return;
      }

      // 5. Paging / Megafonía / Voceo
      if (
        n.includes('paging') ||
        n.includes('voceo') ||
        n.includes('megafonia') ||
        n.includes('megafonía') ||
        n.includes('bocina') ||
        n.includes('audio')
      ) {
        handleSystemChange('paging');
        return;
      }

      // 6. Fire / Incendio
      if (
        n.includes('fire') ||
        n.includes('incendio') ||
        n.includes('humo') ||
        n.includes('alarma') ||
        n.includes('detector')
      ) {
        handleSystemChange('fire');
        return;
      }

      // Fallback: Detectar por el sistema predominante de los dispositivos sembrados en el plano
      if (fp.devices && fp.devices.length > 0) {
        const counts: Record<string, number> = {};
        for (const dev of fp.devices) {
          const sys = dev.system;
          if (sys) counts[sys] = (counts[sys] || 0) + 1;
        }
        let maxSys = '';
        let maxCount = 0;
        for (const [sys, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            maxSys = sys;
          }
        }
        if (
          maxSys &&
          (['cctv', 'access', 'paging', 'fire', 'extinguisher', 'emergency_exit'] as const).includes(
            maxSys as any
          )
        ) {
          handleSystemChange(maxSys as any);
          return;
        }
      }
    },
    [handleSystemChange]
  );

  // Efecto de Resguardo para mantener siempre alineados selectedSystem y selectedSubtype cuando cambia selectedSystemFilter
  useEffect(() => {
    if (selectedSystemFilter !== 'all' && selectedSystemFilter !== selectedSystem) {
      setSelectedSystem(selectedSystemFilter);
      const defaultSub = SYSTEM_SUBTYPES[selectedSystemFilter]?.[0];
      if (defaultSub) setSelectedSubtype(defaultSub);
    }
  }, [selectedSystemFilter, selectedSystem]);
  
  // Selection and Calibration state
  const [selectedElement, setSelectedElement] = useState<{
    type: 'rack' | 'device' | 'pathway' | 'pathway_segment' | 'pathway_node' | 'emergency_sign';
    id: string;
  } | null>(null);
  const [calibrateStart, setCalibrateStart] = useState<{ x: number; y: number } | null>(null);
  const [calibrateEnd, setCalibrateEnd] = useState<{ x: number; y: number } | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [knownDistanceM, setKnownDistanceM] = useState<string>('10');

  // Active pathway tracing state
  const [lastPathwayNodeId, setLastPathwayNodeId] = useState<string | null>(null);

  // Estado para la Caja de Selección Múltiple por Encuadre (Marquee Selection)
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    preservePrevious?: boolean;
    initialSelectedIds?: string[];
  } | null>(null);
  const [canvasClickRipple, setCanvasClickRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  // Dragging state with delta offset tracking & drag threshold
  const [draggingItem, setDraggingItem] = useState<{
    type: 'rack' | 'device' | 'pathway_node' | 'pathway_segment' | 'emergency_sign';
    id: string;
    startX: number;
    startY: number;
    itemX?: number;
    itemY?: number;
    nodesToMove?: Array<{ id: string; startX: number; startY: number }>;
    hasMoved: boolean;
  } | null>(null);

  // Floating toolbar & Fullscreen canvas state
  const [isToolbarOpen, setIsToolbarOpen] = useState<boolean>(true);
  const isCanvasFullscreen = store.isCanvasFullscreen;
  const setIsCanvasFullscreen = store.setIsCanvasFullscreen;

  // Pan dragging state for "Manito" tool
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Fixed canvas dimensions (natural image pixels to ensure 100% 1:1 persistence across mode changes)
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 1600,
    height: 1000,
  });

  // Keydown listener: Escape key and Delete / Backspace key handling
  useEffect(() => {
    if (isCanvasFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCanvasFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCanvasFullscreen) {
        setIsCanvasFullscreen(false);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        if (selectedSegmentIds.length > 0) {
          selectedSegmentIds.forEach((sId) => store.removePathwaySegment(sId));
          setSelectedSegmentIds([]);
          setSelectedElement(null);
          toast.info(`${selectedSegmentIds.length} tramo(s) de charola eliminado(s)`);
        } else if (selectedElement?.type === 'pathway_segment') {
          store.removePathwaySegment(selectedElement.id);
          setSelectedElement(null);
          toast.info('Tramo de charola eliminado');
        } else if (selectedElement?.type === 'pathway_node') {
          store.removePathwayNode(selectedElement.id);
          setSelectedElement(null);
          toast.info('Nodo de charola y tramos conectados eliminados');
        } else if (selectedElement?.type === 'device') {
          const devId = selectedElement.id;
          const isExt = (config.devices || []).some((d) => d.id === devId && d.system === 'extinguisher');
          if (isExt) {
            fireStore.removeExtinguisher(devId, config.scaleMetersPerPx || 0.05);
            store.removeFloorplanDevice(devId);
            toast.info('Extintor eliminado del plano.');
          } else {
            store.removeFloorplanDevice(devId);
            toast.info('Dispositivo eliminado');
          }
          setSelectedElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCanvasFullscreen, selectedElement, store, config, fireStore]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter layer toggles
  const [visibleSystems, setVisibleSystems] = useState<Record<string, boolean>>({
    cctv: true,
    access: true,
    paging: true,
    fire: true,
  });

  // FIRE specific state (NFPA 72 / Hochiki / NEC)
  const [showFireCoverageRadius, setShowFireCoverageRadius] = useState<boolean>(true);
  const [currentExclusionPoints, setCurrentExclusionPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [fireWiringClass, setFireWiringClass] = useState<'A' | 'B'>('B');
  const [fireCableType, setFireCableType] = useState<'FPLR_2x18' | 'FPLR_2x14'>('FPLR_2x18');
  const [fireWasteMargin, setFireWasteMargin] = useState<number>(0.10);
  const [showFireBOMModal, setShowFireBOMModal] = useState<boolean>(false);

  // System Metrics Breakdown & Consolidated Grand Total calculation
  const metricsBreakdown: SystemMetricsBreakdownResult = useMemo(() => {
    return calculateSystemMetricsBreakdown(
      { floorplans: store.floorplans },
      store.factors.verticalDrop ?? 2.5,
      store.factors.rackAllowance ?? 4.0
    );
  }, [store.floorplans, store.factors, syncTrigger]);

  // Convert pathwayNodes & pathwaySegments into Segment[]
  const pathwaySegmentsList: Segment[] = useMemo(() => {
    if (!config.pathwayNodes || !config.pathwaySegments) return [];
    const nodeMap = new Map(config.pathwayNodes.map((n) => [n.id, n]));
    const segments: Segment[] = [];
    config.pathwaySegments.forEach((seg) => {
      const from = nodeMap.get(seg.fromId);
      const to = nodeMap.get(seg.toId);
      if (from && to) {
        segments.push({ a: { x: from.x, y: from.y }, b: { x: to.x, y: to.y } });
      }
    });
    return segments;
  }, [config.pathwayNodes, config.pathwaySegments]);

  // Calculate real trajectories for current active floorplan
  const spatialResult: SpatialCalculationResult = useMemo(() => {
    return calculateRealTrajectories(
      config.devices || [],
      config.racks || [],
      config.scaleMetersPerPx || 0.05,
      config.rackRiseM || 2.5,
      config.slackM || 4.0,
      pathwaySegmentsList
    );
  }, [config, pathwaySegmentsList, syncTrigger]);

  // FIRE 3D Cable & EMT Fill calculations (NFPA 72 / NEC Cap. 9)
  const fire3DCalculation = useMemo(() => {
    const fireDevs: DispositivoFire[] = (config.devices || [])
      .filter((d) => d.system === 'fire')
      .map((d) => ({
        id: d.id,
        tipo: d.subType,
        x_px: d.x,
        y_px: d.y,
        z_m: d.verticalDropM ? (config.hLosaM || 3.8) - d.verticalDropM : undefined,
      }));

    const defaultPanel = config.racks?.[0] || { x: 0, y: 0 };
    const scale = config.scaleMetersPerPx || 0.05;
    const largoM = Math.round((canvasDimensions.width * scale) * 10) / 10 || 30.0;
    const anchoM = Math.round((canvasDimensions.height * scale) * 10) / 10 || 20.0;

    const res3D = calcularMetrajeCable3DFire(
      fireDevs,
      fireWiringClass,
      { x: defaultPanel.x, y: defaultPanel.y },
      scale,
      {
        hLosaM: config.hLosaM || 3.8,
        hPlafonM: config.hPlafonM || 3.0,
        largoM,
        anchoM,
        slackPorBaseM: 0.20,
        margenDesperdicio: fireWasteMargin,
      }
    );

    const conduitTotalM = res3D.canalizacionEmtTotalM;
    const calcEMT = calcularDiametroCanalizacion(
      fireWiringClass === 'A' ? 2 : 1,
      fireCableType
    );

    const bom = generarBOMFire(res3D.metrajeTotalM, conduitTotalM, fireDevs, fireCableType);

    return {
      fireDevs,
      res3D,
      conduitTotalM,
      calcEMT,
      bom,
      largoM,
      anchoM,
      cantidadLazos: res3D.cantidadLazos,
    };
  }, [config.devices, config.racks, config.scaleMetersPerPx, config.hLosaM, config.hPlafonM, fireWiringClass, fireCableType, fireWasteMargin, canvasDimensions, spatialResult]);

  // PDF Page state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const pdfArrayBufferRef = useRef<ArrayBuffer | null>(null);

  // Helper to load PDF.js library dynamically in browser
  const getPdfJsLib = async () => {
    if (typeof window === 'undefined') throw new Error('Client side only');
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el motor PDF.js'));
      document.head.appendChild(script);
    });

    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return pdfjsLib;
  };

  // Helper to render PDF page to Data URL (High crisp vector quality scale 2.5)
  const renderPdfPageToDataUrl = async (arrayBuffer: ArrayBuffer, pageNum: number): Promise<string> => {
    const pdfjsLib = await getPdfJsLib();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    setPdfDoc(pdf);
    setPdfPageCount(pdf.numPages);
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error('Canvas context error');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  // Helper to calculate optimal medium working dimensions (approx 1400px width with exact aspect ratio)
  const handleImageDimensionsLoad = useCallback((img: HTMLImageElement) => {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      const aspect = nw / nh;
      const targetWidth = Math.max(1200, Math.min(nw, 1400));
      const targetHeight = Math.max(650, Math.round(targetWidth / aspect));
      setCanvasDimensions({ width: targetWidth, height: targetHeight });
    }
  }, []);

  // Update canvas dimensions automatically when active floorplan image changes
  useEffect(() => {
    if (!config.imageUrl) return;
    const img = new Image();
    img.onload = () => handleImageDimensionsLoad(img);
    img.src = config.imageUrl;
  }, [config.imageUrl, handleImageDimensionsLoad]);

  // Sincronizar extintores sembrados del plano activo con useFireStore y revalidar escala
  useEffect(() => {
    if (!config) return;
    const currentScale = config.scaleMetersPerPx || 0.05;
    const extinguisherDevices = (config.devices || [])
      .filter((d) => d.system === 'extinguisher')
      .map((d) => {
        const extData = d.extinguisherData;
        let parsedType: ExtinguisherType = extData?.type || 'CO2';
        if (!extData?.type && d.subType) {
          const st = d.subType.toUpperCase();
          if (st.includes('PQS')) parsedType = 'PQS_ABC';
          else if (st.includes('CO2')) parsedType = 'CO2';
          else if (st.includes('CLEAN') || st.includes('SOLKAFLAM')) parsedType = 'CLEAN_AGENT';
          else if (st.includes('CLASS_K') || st.includes('ACETATO')) parsedType = 'CLASS_K';
          else if (st.includes('WATER') || st.includes('AGUA')) parsedType = 'WATER_PRESSURIZED';
        }

        const subTypeParts = (d.subType || '').split(' ');
        const parsedCap = (extData?.capacity || subTypeParts[1] || '5lbs') as ExtinguisherCapacity;
        const riskZone = extData?.riskZone || 'HIGH_RISK';
        const radiusM = extData?.coverageRadiusMeters || (riskZone === 'HIGH_RISK' ? 15.0 : 30.0);

        return {
          id: d.id,
          planoId: config.id,
          x: Math.round(d.x),
          y: Math.round(d.y),
          type: parsedType,
          capacity: parsedCap,
          riskZone,
          mountingHeight: extData?.mountingHeight ?? d.verticalDropM ?? 1.50,
          signalingHeight: extData?.signalingHeight ?? 1.90,
          coverageRadiusMeters: radiusM,
          hasSignaling: extData?.hasSignaling ?? true,
          medicalArea: extData?.medicalArea || 'pasillo',
          isValidLocation: true,
          validationAlerts: [],
        };
      });

    const validatedList = extinguisherDevices.map((item) => {
      const v = validateExtinguisherNormative(item, extinguisherDevices, currentScale);
      return {
        ...item,
        isValidLocation: v.isValid,
        validationAlerts: v.alerts,
      };
    });

    fireStore.setExtinguishers(validatedList);
  }, [config.id, config.devices, config.scaleMetersPerPx]);

  // Handle File Upload (Image or PDF)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '');

    const checkAndCopyPathway = (targetId: string) => {
      const currentSys = selectedSystemFilter || selectedSystem;
      if (currentSys !== 'fire' && currentSys !== 'extinguisher') {
        const currentLevelId = config.levelId || 'level_pb';
        const sourceFp = (store.floorplans || []).find(
          (fp) => fp.id !== targetId && (fp.levelId || 'level_pb') === currentLevelId && (fp.pathwayNodes || []).length > 0
        );
        if (sourceFp) {
          const wantCopy = confirm(
            `¿Deseas reutilizar el diseño de Charola Troncal (tramos y nodos) trazado previamente en este nivel ("${sourceFp.name}") para el nuevo plano?`
          );
          if (wantCopy) {
            store.copyPathwayFromFloorplan(sourceFp.id, targetId);
            toast.success(`Diseño de charola troncal copiado desde "${sourceFp.name}"`);
          }
        }
      }
    };

    if (isPdf) {
      setIsLoadingPdf(true);
      try {
        const buffer = await file.arrayBuffer();
        pdfArrayBufferRef.current = buffer;
        const dataUrl = await renderPdfPageToDataUrl(buffer, 1);
        setCurrentPdfPage(1);
        store.setFloorplanImage(dataUrl);
        if (config.name === 'Planta Baja' || config.name.startsWith('Plano ')) {
          store.renameFloorplan(config.id, cleanFileName);
        }
        toast.success(`Plano PDF cargado (${file.name})`);
        checkAndCopyPathway(config.id);
        setTimeout(() => handleSaveAvances(), 300);
      } catch (err) {
        console.error('Error cargando plano PDF:', err);
        toast.error('No se pudo procesar el archivo PDF. Verifique que no esté protegido.');
      } finally {
        setIsLoadingPdf(false);
      }
    } else {
      setPdfDoc(null);
      setPdfPageCount(0);
      pdfArrayBufferRef.current = null;
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        store.setFloorplanImage(url);
        if (config.name === 'Planta Baja' || config.name.startsWith('Plano ')) {
          store.renameFloorplan(config.id, cleanFileName);
        }
        toast.success('Plano de arquitectura cargado correctamente');
        checkAndCopyPathway(config.id);
        setTimeout(() => handleSaveAvances(), 300);
      };
      reader.readAsDataURL(file);
    }
  };

  // Change PDF Page
  const handlePdfPageChange = async (newPageNum: number) => {
    if (!pdfArrayBufferRef.current || newPageNum < 1 || newPageNum > pdfPageCount) return;
    setIsLoadingPdf(true);
    try {
      const dataUrl = await renderPdfPageToDataUrl(pdfArrayBufferRef.current, newPageNum);
      setCurrentPdfPage(newPageNum);
      store.setFloorplanImage(dataUrl);
      toast.info(`Cargando página ${newPageNum} de ${pdfPageCount}`);
    } catch {
      toast.error('Error al cambiar de página en el PDF');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Convert click coordinates relative to container
  const getCanvasCoords = (e: React.MouseEvent<Element>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft || 0;
    const scrollTop = containerRef.current.scrollTop || 0;
    const x = Math.round(e.clientX - rect.left + scrollLeft);
    const y = Math.round(e.clientY - rect.top + scrollTop);
    return { x, y };
  };

  // Container Pan Mouse Handlers for "Manito" tool & Marquee Selection
  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      if (containerRef.current) {
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        });
      }
      return;
    }

    if ((activeTool === 'edit_pathway' || activeTool === 'select') && e.button === 0) {
      const coords = getCanvasCoords(e);
      setMarqueeBox({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        preservePrevious: e.shiftKey,
        initialSelectedIds: e.shiftKey ? [...selectedSegmentIds] : [],
      });
      setCanvasClickRipple({ x: coords.x, y: coords.y, id: Date.now() });

      if (!e.shiftKey) {
        setSelectedSegmentIds([]);
        setSelectedElement(null);
      }
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'pan' && isPanning && panStart && containerRef.current) {
      e.preventDefault();
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }
    handleMouseMove(e);
  };

  const handleContainerMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
    handleMouseUp();
  };

  // Finalizar dibujo de polígono de zona de exclusión A/A
  const handleFinishExclusionZone = () => {
    if (currentExclusionPoints.length < 3) {
      toast.warning('Una zona de exclusión requiere al menos 3 puntos para formar un polígono.');
      return;
    }
    const zoneName = prompt(
      'Nombre de la zona de inyección A/A (Exclusión):',
      `Inyección A/A ${(config.exclusionZones?.length || 0) + 1}`
    );
    const newZone = {
      id: `ez_${Date.now().toString(36)}`,
      name: zoneName || `Inyección A/A ${(config.exclusionZones?.length || 0) + 1}`,
      points: currentExclusionPoints,
    };
    store.setFloorplanConfig({
      ...config,
      exclusionZones: [...(config.exclusionZones || []), newZone],
    });
    setCurrentExclusionPoints([]);
    setActiveTool('select');
    toast.success(`Zona de exclusión "${newZone.name}" agregada correctamente.`);
  };

  // Sembrado automático NFPA 72 (9.1m grid spacing)
  const handleAutoSeedNFPA72 = () => {
    const scale = config.scaleMetersPerPx || 0.05;
    const zonas: ZonaExclusion[] = (config.exclusionZones || []).map((z) => ({
      id: z.id,
      nombre: z.name,
      puntos: z.points,
    }));

    const seeded = sembrarDetectoresHumoNFPA72(
      canvasDimensions.width,
      canvasDimensions.height,
      scale,
      zonas
    );

    if (seeded.length === 0) {
      toast.warning('No se pudieron sembrar detectores. Verifique la escala y dimensiones del plano.');
      return;
    }

    const currentFireCount = (config.devices || []).filter((d) => d.system === 'fire').length;
    if (currentFireCount + seeded.length > HOCHIKI_SLC_MAX_DEVICES) {
      const capCheck = validarCapacidadLazoSLC(currentFireCount + seeded.length);
      if (capCheck.alerta) {
        toast.error(capCheck.alerta);
      }
    }

    const newDevices = seeded.map((pt, idx) => ({
      id: `dev_fire_${Date.now().toString(36)}_${idx}`,
      system: 'fire' as const,
      subType: 'Detector de Humo',
      x: pt.x,
      y: pt.y,
      idfId: config.racks?.[0]?.id,
      verticalDropM: 0.0,
    }));

    store.setFloorplanConfig({
      ...config,
      devices: [...(config.devices || []), ...newDevices],
    });

    const enRiesgoCount = seeded.filter((s) => s.enRiesgoHVAC).length;
    toast.success(
      `Sembrado automático NFPA 72 completado: ${seeded.length} detectores de humo.` +
        (enRiesgoCount > 0 ? ` ⚠️ ${enRiesgoCount} detectores están a menos de 1.5m de inyección A/A.` : '')
    );
  };

// Helper para verificar si un segmento de recta (x1,y1)-(x2,y2) se cruza con un rectángulo de encuadre (minX, minY, maxX, maxY)
function isSegmentIntersectingBox(x1: number, y1: number, x2: number, y2: number, minX: number, minY: number, maxX: number, maxY: number) {
  const p1In = x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY;
  const p2In = x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY;
  if (p1In || p2In) return true;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  if (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) return true;

  const intersects = (lx1: number, ly1: number, lx2: number, ly2: number, rx1: number, ry1: number, rx2: number, ry2: number) => {
    const det = (lx2 - lx1) * (ry2 - ry1) - (ly2 - ly1) * (rx2 - rx1);
    if (det === 0) return false;
    const lambda = ((ry2 - ry1) * (rx2 - lx1) + (rx1 - rx2) * (ry2 - ly1)) / det;
    const gamma = ((ly1 - ly2) * (rx2 - lx1) + (lx2 - lx1) * (ry2 - ly1)) / det;
    return 0 <= lambda && lambda <= 1 && 0 <= gamma && gamma <= 1;
  };

  return (
    intersects(x1, y1, x2, y2, minX, minY, maxX, minY) ||
    intersects(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
    intersects(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
    intersects(x1, y1, x2, y2, minX, maxY, minX, minY)
  );
}

// Helper para distancia geométrica de punto (px, py) a segmento de recta (x1,y1)-(x2,y2)
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingItem || activeTool === 'pan') return;
    const coords = getCanvasCoords(e);

    // Selección por proximidad en modos edit_pathway o select
    if (activeTool === 'edit_pathway' || activeTool === 'select') {
      // 1. Proximidad a nodo de charola (dentro de 18px)
      const clickedNode = (config.pathwayNodes || []).find((node) => {
        const dx = node.x - coords.x;
        const dy = node.y - coords.y;
        return Math.sqrt(dx * dx + dy * dy) <= 18;
      });
      if (clickedNode) {
        setSelectedElement({ type: 'pathway_node', id: clickedNode.id });
        toast.info(`Nodo de charola seleccionado (X: ${clickedNode.x}, Y: ${clickedNode.y})`);
        return;
      }

      // 2. Proximidad a tramo de charola (dentro de 16px)
      const nodeMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
      const clickedSeg = (config.pathwaySegments || []).find((seg) => {
        const from = nodeMap.get(seg.fromId);
        const to = nodeMap.get(seg.toId);
        if (!from || !to) return false;
        return distToSegment(coords.x, coords.y, from.x, from.y, to.x, to.y) <= 16;
      });
      if (clickedSeg) {
        setSelectedElement({ type: 'pathway_segment', id: clickedSeg.id });
        toast.info('Tramo de charola seleccionado');
        return;
      }
    }

    if (activeTool === 'add_exclusion_zone') {
      setCurrentExclusionPoints((prev) => [...prev, coords]);
      toast.info(`Punto ${currentExclusionPoints.length + 1} de la Zona A/A agregado.`);
      return;
    }

    if (activeTool === 'add_rack') {
      const count = (config.racks?.length || 0) + 1;
      store.addFloorplanRack({
        name: `IDF-${String(count).padStart(2, '0')}`,
        x: coords.x,
        y: coords.y,
      });
      toast.success(`IDF-${String(count).padStart(2, '0')} agregado`);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'add_device') {
      if (selectedSystem === 'emergency_exit') {
        const currentScale = config.scaleMetersPerPx || 0.05;

        const addedDev = emergencyStore.addEmergencyDevice({
          x: coords.x,
          y: coords.y,
          planoId: config.id,
          category: emergencyStore.selectedCategory,
          subType: selectedSubtype,
          exitType: emergencyStore.selectedExitType,
          arrowDirection: emergencyStore.selectedArrowDirection,
          viewingDistanceM: emergencyStore.selectedViewingDistanceM,
          mountingHeightM: emergencyStore.mountingHeightDefault,
          distFromCeilingM: 0.30,
          illuminationLux: 50,
          isPhotoluminescent: emergencyStore.isPhotoluminescentDefault,
          material: emergencyStore.selectedMaterial,
          mountingType: emergencyStore.selectedMountingType,
        }, currentScale);

        store.addFloorplanDevice({
          id: addedDev.id,
          system: 'emergency_exit',
          subType: selectedSubtype,
          x: coords.x,
          y: coords.y,
          verticalDropM: emergencyStore.mountingHeightDefault,
        });

        toast.success(`Señal ${emergencyStore.selectedCategory.replace(/_/g, ' ')} sembrada en ${coords.x}, ${coords.y}`);
        return;
      }

      if (selectedSystem === 'extinguisher') {
        const medicalArea = fireStore.selectedMedicalArea || 'quirofano';
        const type = fireStore.selectedType || 'CO2';
        const capacity = fireStore.selectedCapacity || '5lbs';
        const riskZone = fireStore.selectedRiskZone || 'HIGH_RISK';
        const currentScale = config.scaleMetersPerPx || 0.05;

        const addedExt = fireStore.addExtinguisher({
          x: coords.x,
          y: coords.y,
          planoId: config.id,
          type,
          capacity,
          riskZone,
          mountingHeight: fireStore.mountingHeightDefault,
          signalingHeight: fireStore.signalingHeightDefault,
          hasSignaling: fireStore.hasSignalingDefault,
          medicalArea,
        }, currentScale);

        store.addFloorplanDevice({
          id: addedExt.id,
          system: 'extinguisher',
          subType: `${type} ${capacity}`,
          x: coords.x,
          y: coords.y,
          verticalDropM: fireStore.mountingHeightDefault,
          extinguisherData: {
            type,
            capacity,
            riskZone,
            mountingHeight: fireStore.mountingHeightDefault,
            signalingHeight: fireStore.signalingHeightDefault,
            coverageRadiusMeters: riskZone === 'HIGH_RISK' ? 15 : 30,
            hasSignaling: fireStore.hasSignalingDefault,
            medicalArea,
          },
        });

        toast.success(`Extintor ${type} (${capacity}) sembrado en ${coords.x}, ${coords.y}`);
        return;
      }

      if (selectedSystem === 'fire') {
        const fireDevsCount = (config.devices || []).filter((d) => d.system === 'fire').length;
        const checkCap = validarCapacidadLazoSLC(fireDevsCount + 1);
        if (!checkCap.valido && checkCap.alerta) {
          toast.error(checkCap.alerta);
          return;
        }

        // Evaluate HVAC exclusion warning for smoke detector
        if (
          selectedSubtype.toLowerCase().includes('humo') ||
          selectedSubtype.toLowerCase().includes('aln') ||
          selectedSubtype.toLowerCase().includes('acd')
        ) {
          const evalHVAC = evaluarAdvertenciaExclusionHVAC(
            coords,
            (config.exclusionZones || []).map((z) => ({ id: z.id, nombre: z.name, puntos: z.points })),
            config.scaleMetersPerPx || 0.05
          );
          if (evalHVAC.enRiesgo) {
            toast.warning(
              `⚠️ Advertencia NFPA 72: Detector de humo colocado a ${evalHVAC.distanciaMinimaM.toFixed(
                2
              )}m (menos de 1.5m) de la zona de inyección A/A "${evalHVAC.nombreZona}".`
            );
          }
        }
      }

      const isPanel = selectedSystem === 'fire' && selectedSubtype.toLowerCase().includes('panel');
      if (isPanel) {
        const hasFireRack = (config.racks || []).some((r) => r.id === 'rack_fire_panel' || r.name.includes('Panel'));
        if (!hasFireRack) {
          store.addFloorplanRack({
            name: 'Panel Principal Hochiki (FACP-01)',
            x: coords.x,
            y: coords.y,
          });
        }
      }

      store.addFloorplanDevice({
        system: selectedSystem,
        subType: selectedSubtype,
        x: coords.x,
        y: coords.y,
        idfId: isPanel ? 'rack_fire_panel' : config.racks?.[0]?.id,
        verticalDropM: selectedSystem === 'access' ? 1.2 : selectedSystem === 'fire' ? 0.0 : 3.0,
      });
      toast.success(
        isPanel
          ? `Panel Principal Hochiki (FACP-01) registrado como el Cerebro del Sistema FIRE`
          : `Dispositivo ${selectedSubtype} agregado`
      );
      return;
    }

    if (activeTool === 'add_pathway') {
      // 1. Enganche (Snapping) a nodo de charola existente dentro de 18px
      const existingNode = (config.pathwayNodes || []).find((node) => {
        const dx = node.x - coords.x;
        const dy = node.y - coords.y;
        return Math.sqrt(dx * dx + dy * dy) <= 18;
      });

      let targetNodeId: string;
      let targetNodePos = { x: coords.x, y: coords.y };

      if (existingNode) {
        targetNodeId = existingNode.id;
        targetNodePos = { x: existingNode.x, y: existingNode.y };
        toast.info(`Enganchado a nodo de empalme existente en charola`);
      } else {
        targetNodeId = store.addPathwayNode({ x: coords.x, y: coords.y });
      }

      if (lastPathwayNodeId) {
        if (lastPathwayNodeId === targetNodeId) {
          toast.warning('No se puede conectar un punto de charola consigo mismo.');
          return;
        }

        const fromNode = (config.pathwayNodes || []).find((n) => n.id === lastPathwayNodeId);
        if (fromNode) {
          const validation = validateNewPathwaySegment(
            { x: fromNode.x, y: fromNode.y },
            targetNodePos,
            config.pathwayNodes || [],
            config.pathwaySegments || [],
            lastPathwayNodeId,
            targetNodeId
          );

          if (!validation.isValid) {
            toast.error(validation.reason || 'Restricción de no superposición activada.');
            return;
          }
        }

        store.addPathwaySegment({ fromId: lastPathwayNodeId, toId: targetNodeId });
        toast.success('Tramo de charola técnica Charofil conectado');
      } else {
        toast.info('Punto inicial de charola establecido. Haga clic en el siguiente punto para conectar.');
      }
      setLastPathwayNodeId(targetNodeId);
      return;
    }

    if (activeTool === 'edit_pathway' && !draggingItem) {
      // El encuadre por arrastre ahora se inicia directamente en handleContainerMouseDown
    }

    if (activeTool === 'calibrate') {
      if (!calibrateStart) {
        setCalibrateStart(coords);
        toast.info('Haga clic en el segundo punto de referencia');
      } else {
        setCalibrateEnd(coords);
        setShowCalibrationModal(true);
      }
    }
  };

  // Complete scale calibration
  const handleConfirmCalibration = () => {
    if (!calibrateStart || !calibrateEnd) return;
    const dx = calibrateEnd.x - calibrateStart.x;
    const dy = calibrateEnd.y - calibrateStart.y;
    const distancePx = Math.sqrt(dx * dx + dy * dy);
    const distM = parseFloat(knownDistanceM);

    if (distancePx > 0 && distM > 0) {
      const scale = distM / distancePx;
      store.setFloorplanScale(scale);
      fireStore.validateAll(scale);
      toast.success(`Escala calibrada: 1 px = ${scale.toFixed(4)} m (${(1 / scale).toFixed(1)} px/m)`);
    }

    setCalibrateStart(null);
    setCalibrateEnd(null);
    setShowCalibrationModal(false);
    setActiveTool('select');
  };

  // Handle Drag Move with Delta Offset & Minimum Drag Distance Threshold (prevents jumping on selection)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);

    if (marqueeBox) {
      const newCurrentX = coords.x;
      const newCurrentY = coords.y;
      setMarqueeBox((prev) => (prev ? { ...prev, currentX: newCurrentX, currentY: newCurrentY } : null));

      const minX = Math.min(marqueeBox.startX, newCurrentX);
      const maxX = Math.max(marqueeBox.startX, newCurrentX);
      const minY = Math.min(marqueeBox.startY, newCurrentY);
      const maxY = Math.max(marqueeBox.startY, newCurrentY);

      const nodeMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
      const matchingIds = (config.pathwaySegments || [])
        .filter((seg) => {
          const from = nodeMap.get(seg.fromId);
          const to = nodeMap.get(seg.toId);
          if (!from || !to) return false;
          return isSegmentIntersectingBox(from.x, from.y, to.x, to.y, minX, minY, maxX, maxY);
        })
        .map((s) => s.id);

      if (marqueeBox.preservePrevious && marqueeBox.initialSelectedIds) {
        const combined = Array.from(new Set([...marqueeBox.initialSelectedIds, ...matchingIds]));
        setSelectedSegmentIds(combined);
      } else {
        setSelectedSegmentIds(matchingIds);
      }
      return;
    }

    if (!draggingItem) return;

    const dx = coords.x - draggingItem.startX;
    const dy = coords.y - draggingItem.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved less than 4px, treat as static selection click (do not alter item position)
    if (!draggingItem.hasMoved && dist < 4) return;

    if (!draggingItem.hasMoved) {
      setDraggingItem((prev) => (prev ? { ...prev, hasMoved: true } : null));
    }

    const targetX = Math.round((draggingItem.itemX ?? 0) + dx);
    const targetY = Math.round((draggingItem.itemY ?? 0) + dy);

    if (draggingItem.type === 'rack') {
      const updatedRacks = config.racks.map((r) =>
        r.id === draggingItem.id ? { ...r, x: targetX, y: targetY } : r
      );
      store.setFloorplanConfig({ ...config, racks: updatedRacks });
    } else if (draggingItem.type === 'device') {
      const updatedDevices = config.devices.map((d) =>
        d.id === draggingItem.id ? { ...d, x: targetX, y: targetY } : d
      );
      store.setFloorplanConfig({ ...config, devices: updatedDevices });
    } else if (draggingItem.type === 'emergency_sign') {
      emergencyStore.updateEmergencyDevice(draggingItem.id, { x: targetX, y: targetY }, config.scaleMetersPerPx || 0.05);
      const updatedDevices = config.devices.map((d) =>
        d.id === draggingItem.id ? { ...d, x: targetX, y: targetY } : d
      );
      store.setFloorplanConfig({ ...config, devices: updatedDevices });
    } else if (draggingItem.type === 'pathway_node') {
      store.updatePathwayNode(draggingItem.id, targetX, targetY);
    } else if (draggingItem.type === 'pathway_segment' && draggingItem.nodesToMove) {
      for (const node of draggingItem.nodesToMove) {
        store.updatePathwayNode(node.id, Math.round(node.startX + dx), Math.round(node.startY + dy));
      }
    }
  };

  const handleMouseUp = () => {
    if (marqueeBox) {
      const dx = Math.abs(marqueeBox.currentX - marqueeBox.startX);
      const dy = Math.abs(marqueeBox.currentY - marqueeBox.startY);
      setMarqueeBox(null);
      if (dx < 4 && dy < 4) {
        // Clic estático en el canvas sin arrastrar
        if (!marqueeBox.preservePrevious) {
          setSelectedSegmentIds([]);
          setSelectedElement(null);
        }
      } else if (selectedSegmentIds.length > 0) {
        toast.info(`${selectedSegmentIds.length} tramo(s) de charola seleccionado(s)`);
      }
    }
    if (draggingItem) {
      setDraggingItem(null);
    }
  };

  // Helper para resolver el nivel asignado a un plano evitando fugas a level_pb
  const getFloorplanLevelId = (fp: any) => {
    if (fp.levelId && buildingLevels.some((l) => l.id === fp.levelId)) {
      if (fp.levelId === 'level_pb') {
        const nameLower = String(fp.name || '').toLowerCase();
        for (const lvl of buildingLevels) {
          if (lvl.id === 'level_pb') continue;
          const codeLower = String(lvl.code || '').toLowerCase();
          const lvlNameLower = String(lvl.name || '').toLowerCase();
          if (
            (codeLower && nameLower.includes(codeLower)) ||
            (lvlNameLower && nameLower.includes(lvlNameLower))
          ) {
            return lvl.id;
          }
        }
      }
      return fp.levelId;
    }

    const nameLower = String(fp.name || '').toLowerCase();
    for (const lvl of buildingLevels) {
      const codeLower = String(lvl.code || '').toLowerCase();
      const lvlNameLower = String(lvl.name || '').toLowerCase();
      if (
        (codeLower && nameLower.includes(codeLower)) ||
        (lvlNameLower && nameLower.includes(lvlNameLower))
      ) {
        return lvl.id;
      }
    }

    return buildingLevels[0]?.id || 'level_pb';
  };

  // Filter floorplans by level strictly
  const filteredFloorplans = useMemo(() => {
    if (!selectedLevelId) return store.floorplans || [];
    return (store.floorplans || []).filter((fp) => getFloorplanLevelId(fp) === selectedLevelId);
  }, [store.floorplans, selectedLevelId, buildingLevels]);

  // Current Level Name
  const currentLevelObj = buildingLevels.find((lvl) => lvl.id === selectedLevelId) || buildingLevels[0];

  return (
    <div className="space-y-6">
      {/* ─── Header Principal y Control de Sincronización ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 text-white px-5 py-4 rounded-2xl shadow-xl border border-stone-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-emerald-950/90 rounded-xl border border-emerald-600/50 text-emerald-400 shrink-0 shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Proyecto Raíz</span>
              <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/60 text-emerald-300 text-[10px] px-1.5 py-0">
                Plano Espacial
              </Badge>
            </div>
            <span className="text-base font-bold text-white truncate max-w-[280px] sm:max-w-[420px]">
              {store.name || store.projectName || 'Clinica Ambulatoria'}
            </span>
          </div>
        </div>

        {/* Dynamic Level & Sync Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de Agregar Nivel Dinámico */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const name = prompt('Nombre del nuevo Nivel de Edificio (ej. Nivel 5, Subsuelo, Mezzanine):');
              if (name && name.trim()) {
                const code = prompt('Código abreviado (ej. N5, SUB, MEZ):', name.trim().slice(0, 4).toUpperCase());
                const newId = store.addBuildingLevel(name.trim(), code ? code.trim() : undefined);
                setSelectedLevelId(newId);
                toast.success(`Nivel "${name.trim()}" creado dinámicamente`);
              }
            }}
            className="h-9 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 gap-1.5 px-3 font-medium"
            title="Agregar un nuevo nivel al edificio"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> + Nivel
          </Button>

          {/* Botón de Sincronización / Recáclulo Manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncRecalc}
            className="h-9 text-xs bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/70 gap-1.5 font-bold px-3.5 shadow-sm transition-all"
            title="Sincronizar y recalcular métricas espaciales 2.5D y acumulados"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-once" /> Sincronizar Recálculo
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleSaveAvances}
            disabled={isSavingLocal}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 px-4 shadow-md border border-emerald-500 transition-all"
            title="Guardar planos y sembrado en la base de datos (Ctrl+S)"
          >
            {isSavingLocal ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Guardar Plano y Avances
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Layout Principal de 2 Columnas (Árbol Jerárquico + Visor) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ─── Columna Izquierda: Navegación Jerárquica Colapsable (3 cols) ─── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="border-stone-200 shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-stone-900 text-white rounded-t-xl">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-400">
                  <FolderTree className="w-4 h-4 text-emerald-400" /> Jerarquía del Proyecto
                </span>
                <Badge variant="outline" className="border-emerald-600/50 bg-emerald-950 text-emerald-300 text-[10px] font-mono">
                  {buildingLevels.length} Niveles
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2 max-h-[640px] overflow-y-auto custom-scrollbar">
              {/* Nodo Raíz: Proyecto */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 border border-stone-200 font-bold text-xs text-stone-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{store.name || store.projectName || 'Clinica Ambulatoria'}</span>
                </div>
                <Badge variant="secondary" className="bg-stone-200 text-stone-700 text-[10px]">
                  Raíz
                </Badge>
              </div>

              {/* Lista de Niveles Asociados */}
              <div className="pl-2 space-y-2 border-l-2 border-emerald-500/40 ml-2">
                {buildingLevels.map((lvl) => {
                  const isExpanded = expandedLevels[lvl.id] ?? true;
                  const isSelected = selectedLevelId === lvl.id;
                  const levelFps = (store.floorplans || []).filter(
                    (f) => getFloorplanLevelId(f) === lvl.id
                  );
                  const totalDevicesInLevel = levelFps.reduce((sum, f) => sum + (f.devices?.length || 0), 0);

                  return (
                    <div key={lvl.id} className="space-y-1">
                      {/* Fila de Nivel */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-md ring-1 ring-emerald-400'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                        onClick={() => {
                          setSelectedLevelId(lvl.id);
                          if (levelFps.length > 0) {
                            store.setActiveFloorplanId(levelFps[0].id);
                            detectAndSetSystemForFloorplan(levelFps[0]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLevels((prev) => ({ ...prev, [lvl.id]: !prev[lvl.id] }));
                            }}
                            className="p-0.5 hover:bg-black/10 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                            ) : (
                              <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                            )}
                          </button>
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`} />
                          <span className="truncate">{lvl.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 font-mono ${
                              isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {totalDevicesInLevel} disp.
                          </Badge>

                          <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-5 w-5 p-0 ${isSelected ? 'text-white hover:bg-emerald-700' : 'text-stone-400 hover:text-stone-800'}`}
                              title="Renombrar Nivel"
                              onClick={() => {
                                const newName = prompt('Nuevo nombre del Nivel:', lvl.name);
                                if (newName && newName.trim()) {
                                  store.renameBuildingLevel(lvl.id, newName.trim());
                                  toast.success('Nivel renombrado');
                                }
                              }}
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={buildingLevels.length <= 1}
                              className={`h-5 w-5 p-0 ${isSelected ? 'text-white hover:bg-emerald-700' : 'text-stone-400 hover:text-red-600'} disabled:opacity-30`}
                              title="Eliminar Nivel"
                              onClick={() => {
                                if (buildingLevels.length <= 1) {
                                  toast.error('Se requiere al menos un nivel en el proyecto');
                                  return;
                                }
                                if (confirm(`¿Eliminar el nivel "${lvl.name}"?`)) {
                                  store.deleteBuildingLevel(lvl.id);
                                  toast.info('Nivel eliminado');
                                }
                              }}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Hijos de Nivel: Grupos de Sistema & Planos */}
                      {isExpanded && (
                        <div className="pl-4 pr-1 py-1 space-y-1">
                          {/* Grupos de Sistema Fijos por Nivel */}
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            {(['cctv', 'access', 'paging', 'fire', 'extinguisher', 'emergency_exit'] as const).map((sysKey) => {
                              const colors = SYSTEM_COLORS[sysKey] || SYSTEM_COLORS.extinguisher;
                              const devCountInLevel = levelFps.reduce(
                                (sum, fp) => sum + (fp.devices || []).filter((d) => d.system === sysKey).length,
                                0
                              );

                              const label = sysKey === 'emergency_exit' ? 'EMERGENCY EXIT' : sysKey === 'extinguisher' ? 'extinguisher' : sysKey;

                              return (
                                <div
                                  key={sysKey}
                                  onClick={() => {
                                    setSelectedLevelId(lvl.id);
                                    handleSystemChange(sysKey);
                                  }}
                                  className={`flex items-center justify-between px-2 py-1 rounded border cursor-pointer transition-all ${
                                    selectedLevelId === lvl.id && selectedSystemFilter === sysKey
                                      ? `${colors.bg} text-white font-bold border-stone-800`
                                      : `${colors.lightBg} ${colors.text} border-stone-200 hover:opacity-90`
                                  }`}
                                >
                                  <span className="uppercase font-extrabold text-[10px] tracking-wider">{label}</span>
                                  <span className="font-mono text-[10px]">{devCountInLevel}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Lista de Planos en el Nivel */}
                          {levelFps.map((fp) => {
                            const isFpActive = (store.activeFloorplanId || store.floorplanConfig?.id) === fp.id;
                            return (
                              <div
                                key={fp.id}
                                onClick={() => {
                                  setSelectedLevelId(lvl.id);
                                  store.setActiveFloorplanId(fp.id);
                                  detectAndSetSystemForFloorplan(fp);
                                }}
                                className={`flex items-center justify-between p-1.5 rounded text-[11px] cursor-pointer group transition-all ${
                                  isFpActive
                                    ? 'bg-stone-800 text-emerald-300 font-semibold ring-1 ring-emerald-500/50'
                                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                                }`}
                              >
                                <span className="truncate max-w-[120px] font-medium" title={fp.name}>
                                  {fp.name}
                                </span>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-stone-300 font-mono">
                                    {fp.devices?.length || 0} disp
                                  </Badge>

                                  {/* Botón Renombrar Plano */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-stone-400 hover:text-stone-700"
                                    title="Renombrar Plano"
                                    onClick={() => {
                                      const newName = prompt('Nuevo nombre para el plano:', fp.name);
                                      if (newName && newName.trim()) {
                                        store.renameFloorplan(fp.id, newName.trim());
                                        toast.success(`Plano renombrado a "${newName.trim()}"`);
                                      }
                                    }}
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </Button>

                                  {/* Botón Eliminar Plano Individual */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-stone-400 hover:text-red-600"
                                    title="Eliminar Plano Individual"
                                    onClick={() => {
                                      if ((store.floorplans || []).length <= 1) {
                                        toast.error('No se puede eliminar el único plano del proyecto. Debe conservar al menos 1 plano.');
                                        return;
                                      }
                                      if (
                                        confirm(
                                          `¿Está seguro de eliminar el plano "${fp.name}" del nivel ${lvl.name}?\n\nEsta acción eliminará permanentemente el plano y sus ${
                                            fp.devices?.length || 0
                                          } dispositivos sembrados.`
                                        )
                                      ) {
                                        store.deleteFloorplan(fp.id);
                                        toast.info(`Plano "${fp.name}" eliminado correctamente`);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const name = prompt(`Nombre del plano para ${lvl.name}:`, `Plano ${lvl.code}`);
                              if (name !== null) {
                                const newId = store.addFloorplan(name.trim() || undefined, lvl.id);
                                toast.success(`Plano agregado a ${lvl.name}`);

                                const currentSys = selectedSystemFilter || selectedSystem;
                                if (currentSys !== 'fire' && currentSys !== 'extinguisher') {
                                  const sourceFp = levelFps.find(
                                    (fp) => fp.id !== newId && (fp.pathwayNodes || []).length > 0
                                  );
                                  if (sourceFp) {
                                    const wantCopy = confirm(
                                      `¿Deseas reutilizar el diseño de Charola Troncal (tramos y nodos) trazado previamente en este nivel ("${sourceFp.name}") para el nuevo plano?`
                                    );
                                    if (wantCopy) {
                                      store.copyPathwayFromFloorplan(sourceFp.id, newId);
                                      toast.success(`Diseño de charola troncal copiado desde "${sourceFp.name}"`);
                                    }
                                  }
                                }
                              }
                            }}
                            className="w-full text-[10px] h-6 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-dashed border-stone-300 gap-1 justify-center mt-1"
                          >
                            + Agregar Plano a Nivel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator className="my-2 bg-stone-200" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = prompt('Nombre del nuevo Nivel de Edificio:');
                  if (name && name.trim()) {
                    const code = prompt('Código abreviado:', name.trim().slice(0, 4).toUpperCase());
                    const newId = store.addBuildingLevel(name.trim(), code ? code.trim() : undefined);
                    setSelectedLevelId(newId);
                    toast.success(`Nivel "${name.trim()}" agregado`);
                  }
                }}
                className="w-full text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 h-8 font-semibold justify-center"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> + Crear Nuevo Nivel de Edificio
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ─── Columna Derecha: Visor de Planos & Herramientas Interactivas (8/9 cols) ─── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          
          {/* Banner de Nivel Seleccionado y Vista Previa en Miniaturas */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1 font-bold">
                {currentLevelObj.name} ({currentLevelObj.code})
              </Badge>
              <div className="text-xs text-stone-600">
                Filtro Activo:{' '}
                <span className="font-bold text-stone-900 uppercase">
                  {selectedSystemFilter === 'all' ? 'Todos los Sistemas' : selectedSystemFilter}
                </span>
              </div>
            </div>

            {/* Thumbnail Previews & Lightbox Trigger */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullsizeModal(true)}
                className="h-8 text-xs bg-stone-900 hover:bg-stone-800 text-white font-semibold gap-1.5 border-stone-800 shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> Ver Plano en Tamaño Completo
              </Button>
            </div>
          </div>

          {/* Visor Interactivo y Trazado de Troncal */}
          <Card className="border-emerald-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 bg-stone-50 rounded-t-xl border-b border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <div>
                    <CardTitle className="text-base font-semibold text-stone-800">
                      Visor Interactivo y Ruteo Troncal ({config.name || 'Planta Baja'})
                    </CardTitle>
                    <p className="text-xs text-stone-500">
                      Sembrado 2.5D de dispositivos, ruteo de charola/escalerilla y derivaciones EMT
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-mono text-xs">
                    Escala: 1 px = {(config.scaleMetersPerPx || 0.05).toFixed(3)} m
                  </Badge>
                  <Badge variant="outline" className="border-cyan-300 bg-cyan-50 text-cyan-700 font-mono text-xs">
                    {(config.pathwaySegments || []).length} Tramos Troncal
                  </Badge>
                  <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-mono text-xs">
                    {config.racks?.length || 0} IDFs · {config.devices?.length || 0} Dispositivos
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {/* Subtype and System Selection options when Add Device active */}
              {activeTool === 'add_device' && (
                <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 p-2 rounded-lg mb-3">
                  <Select
                    value={selectedSystem}
                    onValueChange={(val: any) => handleSystemChange(val)}
                  >
                    <SelectTrigger className="w-44 h-8 bg-white text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cctv">📹 CCTV (Videovigilancia)</SelectItem>
                      <SelectItem value="access">🚪 ACCES (Control de Acceso)</SelectItem>
                      <SelectItem value="paging">🔊 PAGING (Megafonía)</SelectItem>
                      <SelectItem value="fire">🧯 FIRE (Incendio)</SelectItem>
                      <SelectItem value="extinguisher">🔥 EXTINGUISHER SEED (Extintores)</SelectItem>
                      <SelectItem value="emergency_exit">🚪 EMERGENCY EXIT (Salidas/Rutas NOM-026)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedSubtype} onValueChange={setSelectedSubtype}>
                    <SelectTrigger className="w-52 h-8 bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(SYSTEM_SUBTYPES[selectedSystem] || []).map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-stone-500 italic">
                    Haga clic en el plano para sembrar el dispositivo seleccionado.
                  </span>
                </div>
              )}

              {/* Extinguisher Seed Toolbar (Capa EXTINGUISHER SEED) */}
              {(selectedSystem === 'extinguisher' || selectedSystemFilter === 'extinguisher') && (
                <div className="mb-3">
                  <ExtinguisherSeedToolbar onOpenSummarySheet={() => setShowExtinguisherSummary(true)} />
                </div>
              )}

              {/* Emergency Exit Toolbar (Capa EMERGENCY EXIT) */}
              {(selectedSystem === 'emergency_exit' || selectedSystemFilter === 'emergency_exit') && (
                <div className="mb-3">
                  <EmergencyExitToolbar onOpenSummarySheet={() => setShowEmergencySummary(true)} />
                </div>
              )}

              {/* Contenedor del Lienzo con Nueva Barra Flotante EXTINGUISHER SEED en Esquina Superior Izquierda */}
              <div
                className={
                  isCanvasFullscreen
                    ? 'fixed inset-0 z-[9999] bg-stone-950/95 backdrop-blur-2xl p-4 flex flex-col h-screen w-screen overflow-hidden select-none'
                    : 'relative w-full h-[540px] bg-stone-900 rounded-xl overflow-hidden border border-stone-800 shadow-inner select-none'
                }
              >
                {/* Botón flotante para Restablecer vista cuando está en pantalla completa */}
                {isCanvasFullscreen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCanvasFullscreen(false)}
                    className="absolute top-4 right-4 z-50 bg-stone-950/80 hover:bg-stone-900 text-stone-200 border-white/20 hover:border-emerald-400/60 shadow-xl backdrop-blur-md text-xs font-bold gap-1.5 px-3 py-1.5 rounded-xl pointer-events-auto"
                    title="Restaurar vista normal (Esc)"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Restablecer</span>
                  </Button>
                )}

                {/* Nueva Barra Flotante CAPA ACTIVA EXTINGUISHER SEED (Esquina Superior Izquierda del Canvas) */}
                {(selectedSystem === 'extinguisher' || selectedSystemFilter === 'extinguisher') && (
                  <ExtinguisherFloatingToolbar onOpenSummarySheet={() => setShowExtinguisherSummary(true)} />
                )}
                {/* Barra Flotante CAPA ACTIVA EMERGENCY EXIT */}
                {(selectedSystem === 'emergency_exit' || selectedSystemFilter === 'emergency_exit') && (
                  <EmergencyExitFloatingToolbar
                    onOpenSummarySheet={() => setShowEmergencySummary(true)}
                    onSelectTool={(tool) => setActiveTool(tool as any)}
                  />
                )}
                {/* Lienzo Scrollable con Contenedor de Dimensiones Fijas 1:1 y Navegación Manito */}
                <div
                  ref={containerRef}
                  onMouseDown={handleContainerMouseDown}
                  onClick={handleCanvasClick}
                  onMouseMove={handleContainerMouseMove}
                  onMouseUp={handleContainerMouseUp}
                  onMouseLeave={handleContainerMouseUp}
                  className={`w-full h-full overflow-auto relative select-none ${
                    activeTool === 'pan'
                      ? isPanning
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : 'cursor-crosshair'
                  }`}
                >
                  <div
                    style={{
                      width: `${canvasDimensions.width}px`,
                      height: `${canvasDimensions.height}px`,
                      position: 'relative',
                      minWidth: '1000px',
                      minHeight: '600px',
                    }}
                    className="shrink-0"
                  >
                    {/* Background Image / PDF */}
                    {config.imageUrl ? (
                      <img
                        src={config.imageUrl}
                        alt={config.name}
                        onLoad={(e) => handleImageDimensionsLoad(e.currentTarget)}
                        style={{
                          width: `${canvasDimensions.width}px`,
                          height: `${canvasDimensions.height}px`,
                          objectFit: 'contain',
                        }}
                        className="absolute inset-0 pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-stone-500 space-y-3">
                        <Upload className="w-12 h-12 text-stone-600" />
                        <p className="text-sm font-semibold">No se ha cargado un archivo de plano (Imagen o PDF)</p>
                        <Label
                          htmlFor="floorplan-file-input"
                          className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" /> Cargar Arquitectura (PNG, JPG, PDF)
                        </Label>
                        <input
                          id="floorplan-file-input"
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}

                    {/* SVG Overlay for Trajectories & Pathways (Fixed 1:1 Canvas Dimensions) */}
                    <svg
                      style={{
                        width: `${canvasDimensions.width}px`,
                        height: `${canvasDimensions.height}px`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                      className="pointer-events-none"
                    >
                      <defs>
                        <style>{`
                          @keyframes marchingAntsTray {
                            0% { stroke-dashoffset: 0; }
                            100% { stroke-dashoffset: -20; }
                          }
                          @keyframes trayGlowPulse {
                            0%, 100% { filter: drop-shadow(0 0 3px #06b6d4) drop-shadow(0 0 8px rgba(6, 182, 212, 0.7)); }
                            50% { filter: drop-shadow(0 0 6px #22d3ee) drop-shadow(0 0 14px rgba(34, 211, 238, 0.95)); }
                          }
                          @keyframes rippleCanvasExpand {
                            0% { r: 4px; opacity: 1; stroke-width: 3px; }
                            100% { r: 36px; opacity: 0; stroke-width: 1px; }
                          }
                          .marching-ants-tray {
                            stroke-dasharray: 6 4;
                            animation: marchingAntsTray 0.7s linear infinite, trayGlowPulse 2s ease-in-out infinite;
                          }
                          .canvas-ripple-effect {
                            animation: rippleCanvasExpand 0.6s ease-out forwards;
                          }
                        `}</style>
                        {/* Metallic Steel Galvanized Gradient for Main Side Rails */}
                        <linearGradient id="charofil-rail-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="35%" stopColor="#0284c7" />
                          <stop offset="70%" stopColor="#0891b2" />
                          <stop offset="100%" stopColor="#0e7490" />
                        </linearGradient>

                        {/* Metallic Rung Gradient */}
                        <linearGradient id="charofil-rung-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="50%" stopColor="#e0f2fe" />
                          <stop offset="100%" stopColor="#0369a1" />
                        </linearGradient>

                        {/* Subtle Drop Shadow Effect for Sutil Industrial Depth */}
                        <filter id="charofil-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.3" />
                        </filter>

                        {/* Mesh Hatch Pattern */}
                        <pattern id="charofil-mesh-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                          <path d="M 0 4 L 8 4 M 4 0 L 4 8" stroke="#0284c7" strokeWidth="0.5" strokeOpacity="0.25" />
                        </pattern>
                      </defs>

                      {/* Pathway Troncal Segments (Charola Técnica Sutil Tipo Charofil - 11px total width) */}
                      {(config.pathwaySegments || []).map((seg) => {
                        const nodeMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
                        const from = nodeMap.get(seg.fromId);
                        const to = nodeMap.get(seg.toId);
                        if (!from || !to) return null;

                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        if (len === 0) return null;

                        const ux = dx / len;
                        const uy = dy / len;
                        const nx = -uy;
                        const ny = ux;

                        const trayHalfWidth = 5.5; // 11px total tray width (diseño estilizado y sutil)
                        const rungSpacing = 12; // Distance between crossbars
                        const numRungs = Math.max(1, Math.floor(len / rungSpacing));

                        // 4 corner vertices for the tray base channel
                        const p1x = from.x + nx * trayHalfWidth;
                        const p1y = from.y + ny * trayHalfWidth;
                        const p2x = to.x + nx * trayHalfWidth;
                        const p2y = to.y + ny * trayHalfWidth;
                        const p3x = to.x - nx * trayHalfWidth;
                        const p3y = to.y - ny * trayHalfWidth;
                        const p4x = from.x - nx * trayHalfWidth;
                        const p4y = from.y - ny * trayHalfWidth;

                        const polygonPoints = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`;

                        // Generate transverse rungs (travesaños estilizados)
                        const rungs: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
                        for (let k = 1; k < numRungs; k++) {
                          const t = (k * rungSpacing) / len;
                          const rx = from.x + t * dx;
                          const ry = from.y + t * dy;

                          const rx1 = rx + nx * (trayHalfWidth - 0.5);
                          const ry1 = ry + ny * (trayHalfWidth - 0.5);
                          const rx2 = rx - nx * (trayHalfWidth - 0.5);
                          const ry2 = ry - ny * (trayHalfWidth - 0.5);

                          rungs.push({ id: `${seg.id}_rung_${k}`, x1: rx1, y1: ry1, x2: rx2, y2: ry2 });
                        }

                        const isSegSelected =
                          (selectedElement?.type === 'pathway_segment' && selectedElement.id === seg.id) ||
                          selectedSegmentIds.includes(seg.id);

                        return (
                          <g
                            key={seg.id}
                            className={
                              activeTool === 'add_pathway'
                                ? "charofil-tray-group cursor-crosshair hover:opacity-90 transition-opacity"
                                : "charofil-tray-group cursor-move hover:opacity-90 transition-opacity"
                            }
                            style={{ pointerEvents: 'auto' }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (activeTool === 'add_pathway') {
                                const coords = getCanvasCoords(e);
                                const targetNodeId = store.addPathwayNode({ x: coords.x, y: coords.y });
                                if (lastPathwayNodeId) {
                                  if (lastPathwayNodeId !== targetNodeId) {
                                    store.addPathwaySegment({ fromId: lastPathwayNodeId, toId: targetNodeId });
                                    toast.success('Empalme derivado creado en charola y conectado');
                                  }
                                } else {
                                  toast.info('Punto de inicio derivado en charola establecido.');
                                }
                                setLastPathwayNodeId(targetNodeId);
                                return;
                              }
                              if (activeTool === 'edit_pathway' || activeTool === 'select') {
                                let nextSelectedIds: string[];

                                if (e.shiftKey) {
                                  // Conmutar tramo (Shift + Clic acumula o quita)
                                  if (selectedSegmentIds.includes(seg.id)) {
                                    nextSelectedIds = selectedSegmentIds.filter((id) => id !== seg.id);
                                  } else {
                                    nextSelectedIds = [...selectedSegmentIds, seg.id];
                                  }
                                } else {
                                  // Clic simple PowerPoint: si ya formaba parte de multi-selección, preservar para mover en grupo; de lo contrario seleccionar solo este
                                  if (selectedSegmentIds.includes(seg.id) && selectedSegmentIds.length > 1) {
                                    nextSelectedIds = selectedSegmentIds;
                                  } else {
                                    nextSelectedIds = [seg.id];
                                  }
                                }

                                setSelectedSegmentIds(nextSelectedIds);
                                setSelectedElement(nextSelectedIds.length > 0 ? { type: 'pathway_segment', id: seg.id } : null);

                                const nodeMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
                                const targetSegIds = nextSelectedIds.includes(seg.id) ? nextSelectedIds : [seg.id];

                                const distinctNodeIds = Array.from(
                                  new Set(
                                    targetSegIds.flatMap((sId) => {
                                      const s = (config.pathwaySegments || []).find((p) => p.id === sId);
                                      return s ? [s.fromId, s.toId] : [];
                                    })
                                  )
                                );

                                const nodesToMove = distinctNodeIds
                                  .map((nId) => {
                                    const n = nodeMap.get(nId);
                                    return n ? { id: nId, startX: n.x, startY: n.y } : null;
                                  })
                                  .filter((n): n is { id: string; startX: number; startY: number } => n !== null);

                                const coords = getCanvasCoords(e);
                                setDraggingItem({
                                  type: 'pathway_segment',
                                  id: seg.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  nodesToMove,
                                  hasMoved: false,
                                });
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeTool === 'edit_pathway' || activeTool === 'select') {
                                if (!e.shiftKey && selectedSegmentIds.length > 1 && selectedSegmentIds.includes(seg.id) && !draggingItem?.hasMoved) {
                                  // Al soltar un clic estático en un elemento multi-seleccionado sin arrastrar, colapsar selección a este único elemento (Estilo PowerPoint)
                                  setSelectedSegmentIds([seg.id]);
                                  setSelectedElement({ type: 'pathway_segment', id: seg.id });
                                }
                              }
                            }}
                          >
                            {/* Capa Invisible de Contacto Ampliada (Hit-Test Layer 24px) */}
                            <line
                              x1={from.x}
                              y1={from.y}
                              x2={to.x}
                              y2={to.y}
                              stroke="transparent"
                              strokeWidth="24"
                              style={{ pointerEvents: 'auto' }}
                            />

                            {/* 1. Fondo de Canal de Charola con Textura de Malla Sutil */}
                            <polygon
                              points={polygonPoints}
                              fill={isSegSelected ? "rgba(6, 182, 212, 0.32)" : "rgba(6, 182, 212, 0.08)"}
                              stroke={isSegSelected ? "#06b6d4" : "#0284c7"}
                              strokeWidth={isSegSelected ? "2.5" : "0.5"}
                              strokeOpacity={isSegSelected ? "1" : "0.3"}
                              className={isSegSelected ? "marching-ants-tray" : undefined}
                              filter="url(#charofil-3d-shadow)"
                            />

                            {/* 2. Riel Lateral Izquierdo Estilizado (Outer Side Rail) */}
                            <line
                              x1={p1x}
                              y1={p1y}
                              x2={p2x}
                              y2={p2y}
                              stroke={isSegSelected ? "#22d3ee" : "url(#charofil-rail-grad)"}
                              strokeWidth={isSegSelected ? "2.8" : "1.8"}
                              strokeLinecap="round"
                              filter="url(#charofil-3d-shadow)"
                            />

                            {/* 3. Riel Lateral Derecho Estilizado (Outer Side Rail) */}
                            <line
                              x1={p4x}
                              y1={p4y}
                              x2={p3x}
                              y2={p3y}
                              stroke={isSegSelected ? "#22d3ee" : "url(#charofil-rail-grad)"}
                              strokeWidth={isSegSelected ? "2.8" : "1.8"}
                              strokeLinecap="round"
                              filter="url(#charofil-3d-shadow)"
                            />

                            {/* 4. Travesaños Transversales Finos (Rungs) */}
                            {rungs.map((r) => (
                              <line
                                key={r.id}
                                x1={r.x1}
                                y1={r.y1}
                                x2={r.x2}
                                y2={r.y2}
                                stroke={isSegSelected ? "#38bdf8" : "url(#charofil-rung-grad)"}
                                strokeWidth={isSegSelected ? "2.0" : "1.2"}
                                opacity={isSegSelected ? "1" : "0.85"}
                              />
                            ))}

                            {/* 5. Guía Central Interna o Eje Resaltado */}
                            <line
                              x1={from.x}
                              y1={from.y}
                              x2={to.x}
                              y2={to.y}
                              stroke={isSegSelected ? "#f59e0b" : "#7dd3fc"}
                              strokeWidth={isSegSelected ? "3" : "1"}
                              strokeDasharray={isSegSelected ? "6 3" : "3 3"}
                              opacity={isSegSelected ? "1" : "0.6"}
                              className={isSegSelected ? "marching-ants-tray" : undefined}
                            />

                            {/* 6. Tiradores de Control de Selección PowerPoint (Control Handles) */}
                            {isSegSelected && (
                              <g className="pointer-events-none">
                                {/* Extremo 1 */}
                                <rect x={from.x - 4} y={from.y - 4} width="8" height="8" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" rx="1" />
                                {/* Extremo 2 */}
                                <rect x={to.x - 4} y={to.y - 4} width="8" height="8" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" rx="1" />
                                {/* Punto Medio */}
                                <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="4.5" fill="#ffffff" stroke="#22d3ee" strokeWidth="1.8" />
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Render Charofil Junction Brackets & Mounting Nodes Discretos */}
                      {(config.pathwayNodes || []).map((node) => {
                        const isNodeSelected = selectedElement?.type === 'pathway_node' && selectedElement.id === node.id;
                        return (
                          <g
                            key={node.id}
                            className={
                              activeTool === 'add_pathway'
                                ? "charofil-node-group cursor-crosshair"
                                : "charofil-node-group cursor-grab active:cursor-grabbing"
                            }
                            style={{ pointerEvents: 'auto' }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (activeTool === 'add_pathway') {
                                if (!lastPathwayNodeId) {
                                  setLastPathwayNodeId(node.id);
                                  toast.info(`Punto de inicio en nodo de empalme (X: ${node.x}, Y: ${node.y})`);
                                } else if (lastPathwayNodeId === node.id) {
                                  toast.warning('No se puede conectar un punto de charola consigo mismo.');
                                } else {
                                  const fromNode = (config.pathwayNodes || []).find((n) => n.id === lastPathwayNodeId);
                                  const targetNodePos = { x: node.x, y: node.y };
                                  if (fromNode) {
                                    const validation = validateNewPathwaySegment(
                                      { x: fromNode.x, y: fromNode.y },
                                      targetNodePos,
                                      config.pathwayNodes || [],
                                      config.pathwaySegments || [],
                                      lastPathwayNodeId,
                                      node.id
                                    );
                                    if (!validation.isValid) {
                                      toast.error(validation.reason || 'Restricción de no superposición activada.');
                                      return;
                                    }
                                  }
                                  store.addPathwaySegment({ fromId: lastPathwayNodeId, toId: node.id });
                                  toast.success('Tramo de charola técnica Charofil conectado a nodo existente');
                                  setLastPathwayNodeId(node.id);
                                }
                                return;
                              }

                              if (activeTool === 'edit_pathway' || activeTool === 'select') {
                                const coords = getCanvasCoords(e);
                                setDraggingItem({
                                  type: 'pathway_node',
                                  id: node.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  itemX: node.x,
                                  itemY: node.y,
                                  hasMoved: false,
                                });
                                setSelectedElement({ type: 'pathway_node', id: node.id });
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeTool === 'edit_pathway' || activeTool === 'select') {
                                setSelectedElement({ type: 'pathway_node', id: node.id });
                              }
                            }}
                          >
                            {/* Área Invisible de Contacto Ampliada (Hit-Test Circle r=18) */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r="18"
                              fill="transparent"
                              style={{ pointerEvents: 'auto' }}
                            />

                            {/* Anillo de Selección Resplandeciente */}
                            {isNodeSelected && (
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r="12"
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="2.5"
                                strokeDasharray="3 2"
                              />
                            )}
                            {/* Anillo de Soporte Galvanizado Estilizado */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={isNodeSelected ? '6' : '4.5'}
                              fill={isNodeSelected ? '#0891b2' : '#0f172a'}
                              stroke={isNodeSelected ? '#22d3ee' : '#38bdf8'}
                              strokeWidth="2"
                              filter="url(#charofil-3d-shadow)"
                            />
                            {/* Punto Central Perno */}
                            <circle cx={node.x} cy={node.y} r="1.5" fill="#e2e8f0" />
                          </g>
                        );
                      })}

                      {/* Real Route Lines for Star Nodes */}
                      {(config.devices || []).map((device) => {
                        if (!visibleSystems[device.system]) return null;
                        const points = spatialResult.routes[device.id];
                        if (!points || points.length < 2) return null;

                        const color = SYSTEM_COLORS[device.system]?.main || '#059669';
                        const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

                        return (
                          <path
                            key={`route_${device.id}`}
                            d={pathD}
                            fill="none"
                            stroke={color}
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                            opacity="0.75"
                          />
                        );
                      })}

                      {/* Calibration reference line */}
                      {calibrateStart && calibrateEnd && (
                        <line
                          x1={calibrateStart.x}
                          y1={calibrateStart.y}
                          x2={calibrateEnd.x}
                          y2={calibrateEnd.y}
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeDasharray="4 4"
                        />
                      )}

                      {/* FIRE - Render Zonas de Exclusión A/A (Inyección de Aire Acondicionado) */}
                      {(config.exclusionZones || []).map((zone) => {
                        const pointsStr = zone.points.map((p) => `${p.x},${p.y}`).join(' ');
                        return (
                          <g key={zone.id}>
                            <polygon
                              points={pointsStr}
                              fill="rgba(249, 115, 22, 0.2)"
                              stroke="#f97316"
                              strokeWidth="2"
                              strokeDasharray="4 3"
                            />
                            {zone.points[0] && (
                              <text
                                x={zone.points[0].x + 4}
                                y={zone.points[0].y + 14}
                                fill="#ea580c"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                ❄️ {zone.name || 'Inyección A/A (Exclusión)'}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* FIRE - Render Dibujo en Proceso de Zona de Exclusión */}
                      {currentExclusionPoints.length > 0 && (
                        <g>
                          <polyline
                            points={currentExclusionPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                          {currentExclusionPoints.map((pt, idx) => (
                            <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5" />
                          ))}
                        </g>
                      )}

                      {/* FIRE - Render Círculos de Cobertura NFPA 72 (Radio R = 6.4m) */}
                      {showFireCoverageRadius &&
                        (config.devices || []).map((device) => {
                          if (!visibleSystems.fire || device.system !== 'fire') return null;
                          const tipoLower = device.subType.toLowerCase();
                          if (!tipoLower.includes('humo') && !tipoLower.includes('aln') && !tipoLower.includes('acd')) return null;

                          const radiusPx = NFPA72_SMOKE_RADIUS_METERS / (config.scaleMetersPerPx || 0.05);
                          const evalHVAC = evaluarAdvertenciaExclusionHVAC(
                            { x: device.x, y: device.y },
                            (config.exclusionZones || []).map((z) => ({ id: z.id, nombre: z.name, puntos: z.points })),
                            config.scaleMetersPerPx || 0.05
                          );

                          return (
                            <g key={`cov_${device.id}`}>
                              <circle
                                cx={device.x}
                                cy={device.y}
                                r={radiusPx}
                                fill={evalHVAC.enRiesgo ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.08)'}
                                stroke={evalHVAC.enRiesgo ? '#eab308' : '#ef4444'}
                                strokeWidth={evalHVAC.enRiesgo ? '2' : '1.2'}
                                strokeDasharray="5 3"
                              />
                            </g>
                          );
                        })}

                      {/* Render Animación de Pulso / Ripple al hacer clic en el Canvas */}
                      {canvasClickRipple && (
                        <circle
                          key={canvasClickRipple.id}
                          cx={canvasClickRipple.x}
                          cy={canvasClickRipple.y}
                          fill="none"
                          stroke="#22d3ee"
                          className="canvas-ripple-effect pointer-events-none"
                        />
                      )}

                      {/* Render Caja de Encuadre de Selección Múltiple (Marquee Box Estilo PowerPoint) */}
                      {marqueeBox && (() => {
                        const minX = Math.min(marqueeBox.startX, marqueeBox.currentX);
                        const maxX = Math.max(marqueeBox.startX, marqueeBox.currentX);
                        const minY = Math.min(marqueeBox.startY, marqueeBox.currentY);
                        const maxY = Math.max(marqueeBox.startY, marqueeBox.currentY);
                        const w = maxX - minX;
                        const h = maxY - minY;
                        if (w < 3 && h < 3) return null;

                        return (
                          <g className="pointer-events-none">
                            <rect
                              x={minX}
                              y={minY}
                              width={w}
                              height={h}
                              fill="rgba(6, 182, 212, 0.16)"
                              stroke="#22d3ee"
                              strokeWidth="2"
                              strokeDasharray="6 3"
                              className="marching-ants-tray"
                              rx="4"
                            />
                            {/* Esquinas de Control PowerPoint */}
                            <circle cx={minX} cy={minY} r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" />
                            <circle cx={maxX} cy={minY} r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" />
                            <circle cx={minX} cy={maxY} r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" />
                            <circle cx={maxX} cy={maxY} r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="1.5" />

                            <g transform={`translate(${minX + 6}, ${minY + 18})`}>
                              <rect x="-4" y="-12" width="148" height="20" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="#06b6d4" strokeWidth="1" />
                              <text
                                x="2"
                                y="2"
                                fill="#22d3ee"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                Encuadre: {selectedSegmentIds.length} tramo(s)
                              </text>
                            </g>
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Render Racks / IDFs */}
                    {(config.racks || []).map((rack) => (
                      <div
                        key={rack.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const coords = getCanvasCoords(e);
                          setDraggingItem({
                            type: 'rack',
                            id: rack.id,
                            startX: coords.x,
                            startY: coords.y,
                            itemX: rack.x,
                            itemY: rack.y,
                            hasMoved: false,
                          });
                          setSelectedElement({ type: 'rack', id: rack.id });
                        }}
                        style={{ left: `${rack.x - 16}px`, top: `${rack.y - 16}px` }}
                        className="absolute z-20 flex flex-col items-center group cursor-move"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                          <Server className="w-4 h-4" />
                        </div>
                        <span className="bg-indigo-950/90 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded border border-indigo-700/60 font-mono mt-1 whitespace-nowrap shadow">
                          {rack.name}
                        </span>
                      </div>
                    ))}

                    {/* Render Devices */}
                    {(config.devices || []).map((device) => {
                      if (selectedSystemFilter !== 'all' && device.system !== selectedSystemFilter) return null;
                      if (!visibleSystems[device.system]) return null;
                      const colorConfig = SYSTEM_COLORS[device.system] || SYSTEM_COLORS.cctv;

                      const isFirePanel = device.system === 'fire' && device.subType.toLowerCase().includes('panel');

                      if (isFirePanel) {
                        return (
                          <div
                            key={device.id}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const coords = getCanvasCoords(e);
                              setDraggingItem({
                                type: 'device',
                                id: device.id,
                                startX: coords.x,
                                startY: coords.y,
                                itemX: device.x,
                                itemY: device.y,
                                hasMoved: false,
                              });
                              setSelectedElement({ type: 'device', id: device.id });
                            }}
                            style={{ left: `${device.x - 22}px`, top: `${device.y - 22}px` }}
                            className="absolute z-25 flex flex-col items-center group cursor-move select-none"
                          >
                            {/* Gabinete Principal de Control FACP Hochiki (El Cerebro) */}
                            <div className="w-11 h-11 bg-red-950 border-2 border-red-500 rounded-xl shadow-2xl flex flex-col items-center justify-center text-white relative ring-2 ring-red-500/40 hover:scale-105 transition-transform">
                              {/* LEDs de Estado FACP */}
                              <div className="absolute top-1 left-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Energía AC Normal" />
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Lazo SLC Activo (Hochiki DCP)" />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Supervisión" />
                              </div>

                              <ShieldAlert className="w-5 h-5 text-red-400 mt-1" />
                              <span className="text-[7px] font-black tracking-tighter text-red-200 uppercase font-mono">HOCHIKI</span>
                            </div>

                            {/* Placa Identificadora FACP-01 */}
                            <div className="flex flex-col items-center mt-1">
                              <span className="bg-red-950/95 text-red-200 text-[10px] px-2 py-0.5 rounded-md border border-red-700/80 font-mono font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                                <Flame className="w-3 h-3 text-red-400" /> FACP-01 | Panel Principal
                              </span>
                              <span className="bg-stone-900/90 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded font-mono mt-0.5 border border-cyan-800/60 shadow">
                                Lazo SLC (Max 127 dev)
                              </span>
                            </div>

                            {/* Tooltip informativo y eliminación */}
                            <div className="hidden group-hover:flex flex-col items-center bg-stone-900/95 text-white text-[10px] px-2 py-1 rounded shadow-xl border border-stone-700 mt-1 whitespace-nowrap z-30">
                              <span className="font-bold text-red-400">{device.subType}</span>
                              <span className="text-stone-300 text-[9px]">Gabinete Principal (El Cerebro del Sistema FIRE)</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 text-[9px] text-red-400 hover:text-red-300 p-0 mt-0.5"
                                onClick={() => store.removeFloorplanDevice(device.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      const evalHVAC =
                        device.system === 'fire'
                          ? evaluarAdvertenciaExclusionHVAC(
                              { x: device.x, y: device.y },
                              (config.exclusionZones || []).map((z) => ({ id: z.id, nombre: z.name, puntos: z.points })),
                              config.scaleMetersPerPx || 0.05
                            )
                          : { enRiesgo: false, distanciaMinimaM: 999 };

                      return (
                        <div
                          key={device.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const coords = getCanvasCoords(e);
                            setDraggingItem({
                              type: 'device',
                              id: device.id,
                              startX: coords.x,
                              startY: coords.y,
                              itemX: device.x,
                              itemY: device.y,
                              hasMoved: false,
                            });
                            setSelectedElement({ type: 'device', id: device.id });
                          }}
                          style={{ left: `${device.x - 12}px`, top: `${device.y - 12}px` }}
                          className="absolute z-10 flex flex-col items-center group cursor-move"
                        >
                          <div
                            className={`w-6 h-6 rounded-full ${
                              evalHVAC.enRiesgo ? 'bg-amber-500 ring-4 ring-amber-300 animate-pulse' : colorConfig.bg
                            } border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold relative`}
                          >
                            {device.system === 'cctv' && <Camera className="w-3 h-3" />}
                            {device.system === 'access' && <Lock className="w-3 h-3" />}
                            {device.system === 'paging' && <Radio className="w-3 h-3" />}
                            {device.system === 'fire' && <Flame className="w-3 h-3" />}

                            {evalHVAC.enRiesgo && (
                              <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow border border-white">
                                ⚠️
                              </span>
                            )}
                          </div>

                          <div className="hidden group-hover:flex flex-col items-center bg-stone-900/95 text-white text-[10px] px-2 py-1 rounded shadow-xl border border-stone-700 mt-1 whitespace-nowrap z-30">
                            <span className="font-bold">{device.subType}</span>
                            {evalHVAC.enRiesgo && (
                              <span className="text-amber-400 font-extrabold text-[9px]">
                                ⚠️ HVAC &lt;1.5m ({evalHVAC.distanciaMinimaM.toFixed(1)}m)
                              </span>
                            )}
                            {spatialResult.nodeDistances[device.id] && (
                              <span className="text-emerald-400 font-mono">
                                {`${spatialResult.nodeDistances[device.id].toFixed(1)} m tray.`}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 text-[9px] text-red-400 hover:text-red-300 p-0 mt-0.5"
                              onClick={() => store.removeFloorplanDevice(device.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Capa de Renderizado 2D de Extintores (EXTINGUISHER SEED) */}
                    {(selectedSystemFilter === 'extinguisher' || selectedSystemFilter === 'all' || selectedSystem === 'extinguisher') && (
                      <ExtinguisherCanvasLayer
                        extinguishers={fireStore.extinguishers}
                        scaleMetersPerPx={config.scaleMetersPerPx || 0.05}
                        showCoverageRadii={fireStore.showCoverageRadii}
                        currentFloorplanId={config.id}
                        selectedId={selectedElement?.id}
                        onMouseDownMarker={(dev, e) => {
                          if (activeTool === 'select' || activeTool === 'edit_pathway') {
                            const coords = getCanvasCoords(e);
                            setDraggingItem({
                              type: 'device',
                              id: dev.id,
                              startX: coords.x,
                              startY: coords.y,
                              itemX: dev.x,
                              itemY: dev.y,
                              hasMoved: false,
                            });
                            setSelectedElement({ type: 'device', id: dev.id });
                          }
                        }}
                        onSelectExtinguisher={(dev) => {
                          toast.info(`Extintor seleccionado: ${dev.type} ${dev.capacity} (${dev.medicalArea || 'General'})`);
                        }}
                        onRemoveExtinguisher={(id) => {
                          fireStore.removeExtinguisher(id, config.scaleMetersPerPx || 0.05);
                          store.removeFloorplanDevice(id);
                          toast.info('Extintor eliminado del plano.');
                        }}
                      />
                    )}

                    {/* Capa de Renderizado 2D de Señalización de Emergencia (EMERGENCY EXIT) */}
                    {(selectedSystemFilter === 'emergency_exit' || selectedSystemFilter === 'all' || selectedSystem === 'emergency_exit') && (
                      <EmergencyExitCanvasLayer
                        devices={emergencyStore.devices}
                        scaleMetersPerPx={config.scaleMetersPerPx || 0.05}
                        showCoverageDistances={emergencyStore.showCoverageDistances}
                        currentFloorplanId={config.id}
                        selectedId={selectedElement?.id}
                        onMouseDownMarker={(dev, e) => {
                          if (activeTool === 'select' || activeTool === 'edit_pathway' || emergencyStore.activeTool === 'SELECT') {
                            const coords = getCanvasCoords(e);
                            setDraggingItem({
                              type: 'emergency_sign',
                              id: dev.id,
                              startX: coords.x,
                              startY: coords.y,
                              itemX: dev.x,
                              itemY: dev.y,
                              hasMoved: false,
                            });
                            setSelectedElement({ type: 'emergency_sign', id: dev.id });
                          }
                        }}
                        onSelectDevice={(dev) => {
                          toast.info(`Señal seleccionada: ${dev.category} (${dev.viewingDistanceM}m)`);
                        }}
                        onRemoveDevice={(id) => {
                          emergencyStore.removeEmergencyDevice(id, config.scaleMetersPerPx || 0.05);
                          store.removeFloorplanDevice(id);
                          toast.info('Señal de emergencia eliminada del plano.');
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Barra de Herramientas Flotante en la Esquina Inferior Izquierda del Canvas (Efecto Vidrio Transparente) */}
                <div className="absolute bottom-4 left-4 z-40 max-w-[calc(100%-2rem)] pointer-events-auto">
                  {isToolbarOpen ? (
                    <div className="backdrop-blur-xl bg-stone-900/40 border border-white/20 shadow-2xl rounded-2xl p-2 text-white flex flex-wrap items-center gap-1.5 transition-all">
                      {/* Botón para colapsar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsToolbarOpen(false)}
                        className="h-8 text-stone-300 hover:text-white px-1.5 rounded-xl hover:bg-white/10"
                        title="Colapsar barra de herramientas"
                      >
                        <ChevronLeft className="w-4 h-4 text-emerald-400" />
                      </Button>

                      {/* Modo Seleccionar */}
                      <Button
                        variant={activeTool === 'select' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'select'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => setActiveTool('select')}
                        title="Modo Seleccionar"
                      >
                        <MousePointer className="w-3.5 h-3.5 mr-1" /> Seleccionar
                      </Button>

                      {/* Modo Mover (Manito) */}
                      <Button
                        variant={activeTool === 'pan' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'pan'
                            ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => setActiveTool('pan')}
                        title="Herramienta Manito: Mover y desplazar el plano libremente"
                      >
                        <Hand className="w-3.5 h-3.5 mr-1 text-amber-400" /> Mover (Manito)
                      </Button>

                      {/* Modo + IDF / Rack */}
                      <Button
                        variant={activeTool === 'add_rack' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'add_rack'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => setActiveTool('add_rack')}
                        title="Agregar IDF / Rack en el plano"
                      >
                        <Server className="w-3.5 h-3.5 mr-1" /> + IDF / Rack
                      </Button>

                      {/* Modo + Dispositivo */}
                      <Button
                        variant={activeTool === 'add_device' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'add_device'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => setActiveTool('add_device')}
                        title="Sembrar dispositivo en el plano"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1" /> + Dispositivo
                      </Button>

                      {/* Modo + Trazar Troncal (Charola) con icono GitFork */}
                      <Button
                        variant={activeTool === 'add_pathway' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'add_pathway'
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => {
                          setActiveTool('add_pathway');
                          setLastPathwayNodeId(null);
                          toast.info('Haga clic en el plano para trazar el eje troncal de charola');
                        }}
                        title="Trazar troncal de charola/escalerilla"
                      >
                        <GitFork className="w-3.5 h-3.5 mr-1 text-cyan-400" /> + Trazar Troncal (Charola)
                      </Button>

                      {/* Modo Editar / Seleccionar Charola con icono Wrench */}
                      <Button
                        variant={activeTool === 'edit_pathway' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'edit_pathway'
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md ring-1 ring-cyan-300'
                            : 'text-cyan-300 hover:text-cyan-100 hover:bg-white/10'
                        }
                        onClick={() => {
                          setActiveTool('edit_pathway');
                          toast.info('Haga clic en tramos o nodos de charola para seleccionar, mover o eliminar');
                        }}
                        title="Seleccionar, redimensionar o eliminar tramos/nodos de charola"
                      >
                        <Wrench className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Editar/Borrar Charola
                      </Button>

                      {/* Modo Calibrar Escala */}
                      <Button
                        variant={activeTool === 'calibrate' ? 'default' : 'ghost'}
                        size="sm"
                        className={
                          activeTool === 'calibrate'
                            ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }
                        onClick={() => {
                          setActiveTool('calibrate');
                          setCalibrateStart(null);
                          setCalibrateEnd(null);
                          toast.info('Haga clic en el primer punto de referencia para calibrar');
                        }}
                        title="Calibrar escala (metros por pixel)"
                      >
                        <Ruler className="w-3.5 h-3.5 mr-1 text-amber-400" /> Calibrar Escala
                      </Button>

                      {/* HERRAMIENTAS ESPECÍFICAS PARA FIRE (INCENDIO) */}
                      {(selectedSystem === 'fire' || selectedSystemFilter === 'fire') && (
                        <>
                          <Separator orientation="vertical" className="h-5 mx-0.5 bg-red-500/40" />

                          {/* Botón + Zona Exclusión A/A */}
                          {activeTool === 'add_exclusion_zone' ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleFinishExclusionZone}
                              className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-1 shadow-md animate-bounce"
                              title="Finalizar trazado del polígono de zona de exclusión A/A"
                            >
                              <Wind className="w-3.5 h-3.5 text-white" /> Finalizar Zona A/A ({currentExclusionPoints.length} pts)
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActiveTool('add_exclusion_zone');
                                setCurrentExclusionPoints([]);
                                toast.info('Haga clic en el plano para dibujar los vértices de la inyección de aire acondicionado (Exclusión).');
                              }}
                              className="text-orange-300 hover:text-orange-100 hover:bg-orange-950/40 gap-1 px-2 text-xs font-semibold"
                              title="Dibujar polígono de zona de inyección de aire acondicionado (Exclusión 1.5m NFPA 72)"
                            >
                              <Wind className="w-3.5 h-3.5 text-orange-400" /> + Zona Exclusión A/A
                            </Button>
                          )}

                          {/* Botón Sembrado Automático NFPA 72 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAutoSeedNFPA72}
                            className="text-red-300 hover:text-red-100 hover:bg-red-950/40 gap-1 px-2 text-xs font-bold"
                            title="Sembrar automáticamente detectores de humo en cuadrícula con espaciamiento NFPA 72 (9.1m) y traslape de 6.4m"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-red-400" /> Sembrar NFPA 72
                          </Button>

                          {/* Toggle Cobertura 6.4m */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFireCoverageRadius(!showFireCoverageRadius)}
                            className={`${
                              showFireCoverageRadius ? 'bg-red-950/60 text-red-300 border border-red-600/50' : 'text-stone-300 hover:bg-white/10'
                            } gap-1 px-2 text-xs font-semibold`}
                            title="Mostrar/Ocultar círculos de cobertura de detectores (Radio R = 6.4m)"
                          >
                            <Eye className="w-3.5 h-3.5 text-red-400" /> {showFireCoverageRadius ? 'Cobertura ON' : 'Cobertura OFF'}
                          </Button>

                          {/* Botón Ver BOM y Canalizaciones FIRE */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFireBOMModal(true)}
                            className="text-amber-300 hover:text-amber-100 hover:bg-amber-950/40 gap-1 px-2 text-xs font-bold"
                            title="Ver desglose normativo 3D, factor de llenado EMT (NEC) y Bill of Materials para FIRE"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" /> BOM & EMT Fire
                          </Button>
                        </>
                      )}

                      <Separator orientation="vertical" className="h-5 mx-0.5 bg-white/20" />

                      {/* Botón Ampliar / Desacoplar a Pantalla Completa */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCanvasFullscreen(!isCanvasFullscreen)}
                        className="text-emerald-300 hover:text-emerald-200 hover:bg-white/10 gap-1 px-2 text-xs font-bold"
                        title={isCanvasFullscreen ? 'Restaurar vista normal (Esc)' : 'Ampliar todo el lienzo a pantalla completa'}
                      >
                        {isCanvasFullscreen ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-emerald-400" /> Restablecer
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> Ampliar
                          </>
                        )}
                      </Button>

                      {/* Botón ↩ Deshacer (Undo2) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          store.undoFloorplan();
                          toast.info('Última acción deshecha');
                        }}
                        disabled={(store.floorplanHistory || []).length === 0}
                        className="text-stone-300 hover:text-white hover:bg-white/10 disabled:opacity-30 gap-1 px-2 text-xs"
                        title="Deshacer última acción"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-emerald-400" /> Deshacer
                      </Button>

                      {/* Botón 🧹 Limpiar Dispositivos */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('¿Eliminar únicamente los dispositivos sembrados? Se preservarán intactos el plano, la escala, los racks e itinerarios troncales.')) {
                            store.clearFloorplanDevices();
                            toast.info('Dispositivos sembrados eliminados');
                          }
                        }}
                        className="text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 gap-1 px-2 text-xs"
                        title="Eliminar únicamente los dispositivos sembrados"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> 🧹 Limpiar Dispositivos
                      </Button>

                      {/* Botón Limpiar Elementos */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              '¿Limpiar todos los elementos sembrados (dispositivos, charolas y racks) del plano actual? Se conservará intacta la imagen del plano y su escala.'
                            )
                          ) {
                            store.clearFloorplan();
                            toast.info('Elementos del plano limpiados correctamente (imagen y escala conservadas)');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1 px-2 text-xs"
                        title="Limpiar dispositivos, charolas y racks conservando el plano de arquitectura"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" /> Limpiar Elementos
                      </Button>

                      {/* Guardar Avances */}
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-md border border-emerald-500 text-xs px-2.5"
                        onClick={handleSaveAvances}
                        disabled={isSavingLocal}
                        title="Guardar avances (Ctrl+S)"
                      >
                        {isSavingLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Guardar
                      </Button>
                    </div>
                  ) : (
                    /* Botón Desplegable cuando está colapsada */
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsToolbarOpen(true)}
                      className="backdrop-blur-xl bg-stone-900/40 text-white border-white/20 hover:bg-stone-800/60 shadow-2xl font-bold text-xs gap-2 rounded-2xl py-2 px-3.5 transition-all"
                      title="Desplegar Barra de Herramientas de Diseño"
                    >
                      <Wrench className="w-4 h-4 text-emerald-400" />
                      <span>Barra de Herramientas</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Tarjeta Flotante de Acciones para Tramo o Nodo de Charola Seleccionado */}
                {selectedElement && (selectedElement.type === 'pathway_segment' || selectedElement.type === 'pathway_node') && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-stone-900/95 text-white border border-cyan-500/60 shadow-2xl rounded-2xl p-3.5 backdrop-blur-xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 ring-1 ring-cyan-400/40">
                    <div className="p-2 bg-cyan-950/90 rounded-xl border border-cyan-500/50 text-cyan-400 shrink-0 shadow-inner">
                      <Wrench className="w-4 h-4" />
                    </div>

                    {selectedElement.type === 'pathway_segment' && (() => {
                      const seg = (config.pathwaySegments || []).find((s) => s.id === selectedElement.id);
                      if (!seg) return null;
                      const nodeMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
                      const from = nodeMap.get(seg.fromId);
                      const to = nodeMap.get(seg.toId);
                      const dx = (to?.x || 0) - (from?.x || 0);
                      const dy = (to?.y || 0) - (from?.y || 0);
                      const lenPx = Math.sqrt(dx * dx + dy * dy);
                      const lenM = lenPx * (config.scaleMetersPerPx || 0.05);

                      return (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-extrabold text-cyan-300 text-xs">Tramo de Charola Troncal Seleccionado</span>
                            <span className="font-mono text-[11px] text-stone-300">
                              Longitud: <span className="font-bold text-white">{lenM.toFixed(2)} m</span> ({lenPx.toFixed(0)} px)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                store.removePathwaySegment(seg.id);
                                setSelectedElement(null);
                                toast.info('Tramo de charola eliminado correctamente');
                              }}
                              className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white font-bold gap-1 px-3 shadow-sm border border-red-500"
                              title="Eliminar este tramo de charola (Supr / Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar Tramo
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedElement(null)}
                              className="h-7 text-xs bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300"
                            >
                              Cerrar
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {selectedElement.type === 'pathway_node' && (() => {
                      const node = (config.pathwayNodes || []).find((n) => n.id === selectedElement.id);
                      if (!node) return null;
                      const attachedCount = (config.pathwaySegments || []).filter(
                        (s) => s.fromId === node.id || s.toId === node.id
                      ).length;

                      return (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-extrabold text-cyan-300 text-xs">Nodo de Empalme Charola Seleccionado</span>
                            <span className="font-mono text-[11px] text-stone-300">
                              Posición X: {node.x}, Y: {node.y} · Conexiones: <span className="font-bold text-white">{attachedCount} tramos</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                store.removePathwayNode(node.id);
                                setSelectedElement(null);
                                toast.info('Nodo y tramos conectados eliminados correctamente');
                              }}
                              className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white font-bold gap-1 px-3 shadow-sm border border-red-500"
                              title="Eliminar este nodo y todos sus tramos conectados (Supr / Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar Nodo
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedElement(null)}
                              className="h-7 text-xs bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300"
                            >
                              Cerrar
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Tarjeta Flotante de Acciones para Selección Múltiple por Encuadre */}
                {selectedSegmentIds.length > 1 && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-stone-900/95 text-white border border-cyan-500/60 shadow-2xl rounded-2xl p-3.5 backdrop-blur-xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 ring-1 ring-cyan-400/40">
                    <div className="p-2 bg-cyan-950/90 rounded-xl border border-cyan-500/50 text-cyan-400 shrink-0 shadow-inner">
                      <Wrench className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
                        📦 {selectedSegmentIds.length} Tramos de Charola Seleccionados por Encuadre
                      </span>
                      <span className="font-mono text-[11px] text-stone-300">
                        Longitud Acumulada:{' '}
                        <span className="font-bold text-white">
                          {selectedSegmentIds
                            .reduce((acc, id) => {
                              const s = (config.pathwaySegments || []).find((seg) => seg.id === id);
                              if (!s) return acc;
                              const nMap = new Map((config.pathwayNodes || []).map((n) => [n.id, n]));
                              const f = nMap.get(s.fromId);
                              const t = nMap.get(s.toId);
                              if (!f || !t) return acc;
                              const dX = t.x - f.x;
                              const dY = t.y - f.y;
                              return acc + Math.sqrt(dX * dX + dY * dY) * (config.scaleMetersPerPx || 0.05);
                            }, 0)
                            .toFixed(2)}{' '}
                          m
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          selectedSegmentIds.forEach((id) => store.removePathwaySegment(id));
                          setSelectedSegmentIds([]);
                          setSelectedElement(null);
                          toast.info(`${selectedSegmentIds.length} tramos seleccionados eliminados`);
                        }}
                        className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white font-bold gap-1 px-3 shadow-sm border border-red-500"
                        title="Eliminar tramos de charola seleccionados por encuadre (Supr / Delete)"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar Tramos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSegmentIds([])}
                        className="h-7 text-xs bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300"
                      >
                        Deseleccionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── SECCIÓN OBLIGATORIA 2: BLOQUES DE MÉTRICAS POR GRUPO DE SISTEMA ──────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-stone-900">
              Desglose de Métricas Espaciales 2.5D y Acumulados por Sistema
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncRecalc}
            className="text-xs text-emerald-700 font-semibold hover:bg-emerald-50 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar Métricas
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(['cctv', 'access', 'paging', 'fire'] as const).map((sysKey) => {
            const sysData = metricsBreakdown.bySystem[sysKey];
            const colors = SYSTEM_COLORS[sysKey];

            return (
              <Card key={sysKey} className={`border-2 ${colors.border} shadow-md bg-white overflow-hidden`}>
                <CardHeader className={`py-3 px-4 ${colors.lightBg} border-b ${colors.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sysKey === 'cctv' && <Camera className={`w-4 h-4 ${colors.text}`} />}
                      {sysKey === 'access' && <Lock className={`w-4 h-4 ${colors.text}`} />}
                      {sysKey === 'paging' && <Radio className={`w-4 h-4 ${colors.text}`} />}
                      {sysKey === 'fire' && <Flame className={`w-4 h-4 ${colors.text}`} />}
                      <CardTitle className={`text-sm font-extrabold uppercase tracking-wider ${colors.text}`}>
                        {sysKey.toUpperCase()}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className={`${colors.bg} text-white text-[10px] font-mono font-bold`}>
                      {sysData.deviceCount} disp.
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Bloque 1: Cálculo Espacial 2.5D */}
                  <div className="space-y-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between text-stone-700 font-bold border-b border-stone-200 pb-1">
                      <span className="flex items-center gap-1">
                        <Cable className="w-3.5 h-3.5 text-stone-600" /> Cálculo Espacial 2.5D
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">TRAYECTOS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-stone-800">
                      <div>
                        <span className="text-[10px] text-stone-500 block">Cable Total (2.5D):</span>
                        <span className="font-extrabold font-mono text-sm">
                          {sysData.cableTotalMeters} m
                        </span>
                        {sysKey === 'fire' && (
                          <span className="text-[9px] text-red-600 font-semibold block leading-none mt-0.5">
                            (SLC [{Math.max(1, Math.ceil(sysData.deviceCount / 127))} lazo(s)] + Bus RS-485)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Canalización EMT:</span>
                        <span className="font-extrabold font-mono text-sm">
                          {sysData.totalConduitMeters} m
                        </span>
                        {sysKey === 'fire' && (
                          <span className="text-[9px] text-amber-700 font-semibold block leading-none mt-0.5">
                            [EMT 1/2" - Llenado: 8.4% / Máx: 53%]
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Charola Troncal:</span>
                        <span className="font-extrabold font-mono text-sm">
                          {sysKey === 'fire' ? '0 m (Tubería EMT)' : `${sysData.totalTrayMeters} m`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Superficie Cubierta:</span>
                        <span className="font-extrabold font-mono text-sm text-emerald-700">
                          {sysData.coveredAreaM2} m²
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Acumulado General del Sistema */}
                  <div className="space-y-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between text-stone-700 font-bold border-b border-stone-200 pb-1">
                      <span className="flex items-center gap-1">
                        <Box className="w-3.5 h-3.5 text-stone-600" /> Acumulado General
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">INSUMOS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-stone-800">
                      <div>
                        <span className="text-[10px] text-stone-500 block">Bobinas 305m:</span>
                        <span className="font-bold font-mono">
                          {sysData.spools305m} ud.
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Tubos EMT (3m):</span>
                        <span className="font-bold font-mono">
                          {sysData.conduitTubes3m} ud.
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Cajas 4x4:</span>
                        <span className="font-bold font-mono">
                          {sysData.boxes4x4Qty} ud.
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">Conectores EMT:</span>
                        <span className="font-bold font-mono">
                          {sysData.emtConnectorsQty} ud.
                        </span>
                      </div>
                      {sysKey === 'fire' && (
                        <>
                          <div>
                            <span className="text-[10px] text-stone-500 block">Coples EMT:</span>
                            <span className="font-bold font-mono text-stone-700">
                              {Math.max(0, sysData.conduitTubes3m - 1)} ud.
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 block">Abrazaderas (1.5m):</span>
                            <span className="font-bold font-mono text-stone-700">
                              {Math.ceil(sysData.totalConduitMeters / 1.5)} ud.
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desglose por Subtipos */}
                  {Object.keys(sysData.subTypeCounts).length > 0 && (
                    <div className="pt-1 border-t border-stone-100">
                      <span className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Dispositivos por Subtipo:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sysData.subTypeCounts).map(([sub, count]) => (
                          <Badge key={sub} variant="outline" className="text-[9px] bg-stone-100 text-stone-700 px-1.5 py-0">
                            {sub}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── SECCIÓN OBLIGATORIA 3: BLOQUE RESALTADO DE GRAN TOTAL CONSOLIDADO ──────────────────── */}
      <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 text-white border-2 border-emerald-500/60 shadow-2xl p-6 rounded-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-stone-950 rounded-xl font-extrabold shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase">
                Gran Total Consolidado — Proyecto: {store.name || store.projectName || 'Clínica Ambulatoria'}
              </h2>
              <p className="text-xs text-stone-400">
                Métrica unificada consolidada para todos los grupos de sistemas (CCTV + ACCES + PAGING + FIRE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncRecalc}
              className="bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900 font-bold text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Métricas
            </Button>
          </div>
        </div>

        {/* Sub-sección 1: Desglose del Gran Total del Cálculo Espacial 2.5D Separado por Sistemas (CCTV, ACCES, PAGING, FIRE) */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <h3 className="text-sm font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-2">
              <Cable className="w-4 h-4 text-emerald-400" /> Desglose del Gran Total Espacial 2.5D por Sistema (Todos los Pisos del Proyecto)
            </h3>
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px] font-mono font-bold">
              4 SISTEMAS ACUMULADOS
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {(['cctv', 'access', 'paging', 'fire'] as const).map((sysKey) => {
              const sysData = metricsBreakdown.bySystem[sysKey];
              const colors = SYSTEM_COLORS[sysKey];

              return (
                <div
                  key={`gt_${sysKey}`}
                  className={`bg-stone-900/90 backdrop-blur p-4 rounded-xl border-2 ${colors.border} shadow-lg space-y-3 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        {sysKey === 'cctv' && <Camera className={`w-4 h-4 ${colors.text}`} />}
                        {sysKey === 'access' && <Lock className={`w-4 h-4 ${colors.text}`} />}
                        {sysKey === 'paging' && <Radio className={`w-4 h-4 ${colors.text}`} />}
                        {sysKey === 'fire' && <Flame className={`w-4 h-4 ${colors.text}`} />}
                        <span className={`text-xs font-black uppercase tracking-wider ${colors.text}`}>
                          {sysKey === 'cctv'
                            ? 'CCTV (Video)'
                            : sysKey === 'access'
                            ? 'ACCES (Control Acceso)'
                            : sysKey === 'paging'
                            ? 'PAGING (Voceo)'
                            : 'FIRE (Incendio)'}
                        </span>
                      </div>
                      <Badge className={`${colors.bg} text-white font-mono text-[10px]`}>
                        {sysData.deviceCount} disp.
                      </Badge>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-stone-300">
                        <span>Cable Total 2.5D:</span>
                        <span className="font-extrabold text-white">{sysData.cableTotalMeters} m</span>
                      </div>
                      <div className="flex justify-between text-stone-300">
                        <span>Canalización EMT:</span>
                        <span className="font-bold text-stone-200">{sysData.totalConduitMeters} m</span>
                      </div>
                      <div className="flex justify-between text-stone-300">
                        <span>Charola Troncal:</span>
                        <span className="font-bold text-stone-200">
                          {sysKey === 'fire' ? '0 m (Tubería EMT)' : `${sysData.totalTrayMeters} m`}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold border-t border-stone-800 pt-1 mt-1">
                        <span>Superficie Cubierta:</span>
                        <span>{sysData.coveredAreaM2} m²</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen Insumos del Sistema */}
                  <div className="bg-stone-950/80 p-2.5 rounded-lg border border-stone-800/80 space-y-1 text-[10px] font-mono mt-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase block border-b border-stone-800 pb-0.5">
                      Insumos Acumulados
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-stone-300 pt-0.5">
                      <div>Bobinas: <span className="font-bold text-white">{sysData.spools305m} ud.</span></div>
                      <div>Tubos EMT: <span className="font-bold text-white">{sysData.conduitTubes3m} ud.</span></div>
                      <div>Cajas 4x4: <span className="font-bold text-white">{sysData.boxes4x4Qty} ud.</span></div>
                      <div>Conectores: <span className="font-bold text-white">{sysData.emtConnectorsQty} ud.</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-sección 2: Resumen Global Consolidado Unificado del Proyecto (CCTV + ACCES + PAGING + FIRE) */}
        <div className="bg-stone-900/90 backdrop-blur p-5 rounded-xl border border-emerald-500/50 shadow-xl space-y-4 relative z-10">
          <div className="flex items-center justify-between text-amber-400 font-bold text-sm border-b border-stone-800 pb-2">
            <span className="flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-400" /> Resumen Global Consolidado del Proyecto (Suma Unificada 4 Sistemas)
            </span>
            <Badge className="bg-amber-600 text-white text-[10px] font-mono font-bold">
              PROYECTO COMPLETO
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-stone-950/80 p-3 rounded-lg border border-emerald-500/30">
              <span className="text-[10px] text-stone-400 block font-medium">Cable Total Proyecto:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{metricsBreakdown.grandTotal.grandTotalCableMeters} m</span>
            </div>
            <div className="bg-stone-950/80 p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] text-stone-400 block font-medium">Canalización EMT Total:</span>
              <span className="text-lg font-black text-white font-mono">{metricsBreakdown.grandTotal.grandTotalConduitMeters} m</span>
            </div>
            <div className="bg-stone-950/80 p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] text-stone-400 block font-medium">Charola Troncal Total:</span>
              <span className="text-lg font-black text-white font-mono">{metricsBreakdown.grandTotal.grandTotalTrayMeters} m</span>
            </div>
            <div className="bg-stone-950/80 p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] text-stone-400 block font-medium">Superficie Cubierta:</span>
              <span className="text-lg font-black text-emerald-300 font-mono">{metricsBreakdown.grandTotal.grandTotalCoveredAreaM2} m²</span>
            </div>
            <div className="bg-stone-950/80 p-3 rounded-lg border border-amber-500/40 col-span-2 flex items-center justify-between px-4">
              <div>
                <span className="text-[10px] text-amber-300 block font-bold">Total Dispositivos Proyecto:</span>
                <span className="text-xl font-black text-white font-mono">{metricsBreakdown.grandTotal.grandTotalDevicesCount} elementos</span>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-300 text-[10px] font-bold">
                4 Sistemas
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-stone-800/80">
            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Bobinas 305m Proyecto:</span>
              <span className="text-base font-bold font-mono text-white">{metricsBreakdown.grandTotal.grandTotalSpools305m} ud.</span>
            </div>
            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Tubos EMT 3m Proyecto:</span>
              <span className="text-base font-bold font-mono text-white">{metricsBreakdown.grandTotal.grandTotalConduitTubes3m} ud.</span>
            </div>
            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Cajas 4x4 Proyecto:</span>
              <span className="text-base font-bold font-mono text-white">{metricsBreakdown.grandTotal.grandTotalBoxes4x4Qty} ud.</span>
            </div>
            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Conectores EMT Proyecto:</span>
              <span className="text-base font-bold font-mono text-white">{metricsBreakdown.grandTotal.grandTotalEmtConnectorsQty} ud.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Lightbox para Visor de Plano en Tamaño Completo */}
      <Dialog open={showFullsizeModal} onOpenChange={setShowFullsizeModal}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-4 bg-stone-900 text-white border-stone-800">
          <DialogHeader className="pb-2 border-b border-stone-800 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
              <Maximize2 className="w-4 h-4" /> Visor de Plano en Tamaño Completo — {config.name} ({currentLevelObj.name})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-stone-950 rounded-xl p-2 relative flex items-center justify-center">
            {config.imageUrl ? (
              <img src={config.imageUrl} alt={config.name} className="max-w-none max-h-none shadow-2xl" />
            ) : (
              <div className="text-stone-500 text-sm">No hay una imagen de plano cargada</div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-stone-800 flex justify-between items-center">
            <span className="text-xs text-stone-400 font-mono">
              Escala actual: 1 px = {(config.scaleMetersPerPx || 0.05).toFixed(3)} m · {config.devices?.length || 0} dispositivos sembrados
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowFullsizeModal(false)} className="bg-stone-800 text-white border-stone-700">
              Cerrar Vista Completa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Calibración de Escala (Capturar distancia real en metros) */}
      <Dialog open={showCalibrationModal} onOpenChange={setShowCalibrationModal}>
        <DialogContent className="max-w-md bg-stone-900 text-white border-stone-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-400">
              <Ruler className="w-5 h-5 text-amber-400" /> Calibrar Escala del Plano
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-stone-300">
              Ha trazado una línea de referencia entre dos puntos conocidos en el plano.
            </p>

            {calibrateStart && calibrateEnd && (
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-stone-400">
                  <span>Punto 1 (A):</span>
                  <span className="text-stone-200">X: {calibrateStart.x}px, Y: {calibrateStart.y}px</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Punto 2 (B):</span>
                  <span className="text-stone-200">X: {calibrateEnd.x}px, Y: {calibrateEnd.y}px</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold border-t border-stone-800 pt-1 mt-1">
                  <span>Distancia en Pixeles:</span>
                  <span>
                    {Math.round(
                      Math.sqrt(
                        Math.pow(calibrateEnd.x - calibrateStart.x, 2) +
                          Math.pow(calibrateEnd.y - calibrateStart.y, 2)
                      )
                    )}{' '}
                    px
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="known-distance-m" className="text-xs text-stone-300 font-semibold">
                Ingrese la distancia real conocida entre los 2 puntos (en metros):
              </Label>
              <div className="relative">
                <Input
                  id="known-distance-m"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={knownDistanceM}
                  onChange={(e) => setKnownDistanceM(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmCalibration();
                    }
                  }}
                  className="bg-stone-950 border-stone-700 text-white font-mono text-sm pl-3 pr-8"
                  placeholder="ej. 10.0"
                  autoFocus
                />
                <span className="absolute right-3 top-2.5 text-stone-400 font-bold text-xs">m</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCalibrationModal(false);
                setCalibrateStart(null);
                setCalibrateEnd(null);
                setActiveTool('select');
              }}
              className="bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCalibration}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1.5"
            >
              <Ruler className="w-4 h-4" /> Guardar Escala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para BOM, Cálculo 3D y Dimensionamiento de Tubería EMT FIRE */}
      <Dialog open={showFireBOMModal} onOpenChange={setShowFireBOMModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto bg-stone-900 text-white border-red-900/50">
          <DialogHeader className="border-b border-stone-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center justify-between text-red-400">
              <span className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                Motor Espacial 3D, Llenado EMT y BOM — Sistema Contra Incendio FIRE (NFPA 72 / NEC)
              </span>
              <Badge className="bg-red-900 text-red-200 border-red-700 font-mono text-xs">
                Hochiki SLC
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-3 text-xs">
            {/* Controles de Configuración de Lazo y Parámetros de Edificio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <div className="space-y-1">
                <Label className="text-[11px] text-stone-400 font-semibold">Clase de Lazo SLC:</Label>
                <Select value={fireWiringClass} onValueChange={(v: 'A' | 'B') => setFireWiringClass(v)}>
                  <SelectTrigger className="h-8 bg-stone-900 border-stone-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 text-white border-stone-700">
                    <SelectItem value="B">Clase B (Radial)</SelectItem>
                    <SelectItem value="A">Clase A (Lazo Cerrado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-stone-400 font-semibold">Tipo de Cable Estándar:</Label>
                <Select value={fireCableType} onValueChange={(v: 'FPLR_2x18' | 'FPLR_2x14') => setFireCableType(v)}>
                  <SelectTrigger className="h-8 bg-stone-900 border-stone-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 text-white border-stone-700">
                    <SelectItem value="FPLR_2x18">FPLR 2x18 AWG</SelectItem>
                    <SelectItem value="FPLR_2x14">FPLR 2x14 AWG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-stone-400 font-semibold">Factor Desperdicio Cable:</Label>
                <Select value={String(fireWasteMargin)} onValueChange={(v) => setFireWasteMargin(parseFloat(v))}>
                  <SelectTrigger className="h-8 bg-stone-900 border-stone-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 text-white border-stone-700">
                    <SelectItem value="0.05">5% Desperdicio</SelectItem>
                    <SelectItem value="0.10">10% Desperdicio</SelectItem>
                    <SelectItem value="0.15">15% Desperdicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-stone-400 font-semibold">Altura Losa (H_losa):</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="2.0"
                    value={config.hLosaM ?? 3.8}
                    onChange={(e) =>
                      store.setFloorplanConfig({
                        ...config,
                        hLosaM: parseFloat(e.target.value) || 3.8,
                      })
                    }
                    className="h-8 bg-stone-900 border-stone-700 text-white text-xs font-mono pr-7"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-stone-400 font-bold">m</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-stone-400 font-semibold">Altura Plafón (H_plafon):</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="2.0"
                    value={config.hPlafonM ?? 3.0}
                    onChange={(e) =>
                      store.setFloorplanConfig({
                        ...config,
                        hPlafonM: parseFloat(e.target.value) || 3.0,
                      })
                    }
                    className="h-8 bg-stone-900 border-stone-700 text-white text-xs font-mono pr-7"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-stone-400 font-bold">m</span>
                </div>
              </div>
            </div>

            {/* Cuadros Resumen de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bloque 1: Cable 3D y Bajadas */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Cable className="w-4 h-4 text-emerald-400" /> Metraje Cable 3D
                  </span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-300 text-[10px]">
                    +10% Desperdicio
                  </Badge>
                </div>
                <div className="space-y-1 font-mono text-[11px] pt-1">
                  <div className="flex justify-between text-stone-300">
                    <span>Recorrido Horizontal (X,Y):</span>
                    <span className="font-bold text-white">{fire3DCalculation.res3D.metrajeDesglose.horizontalM} m</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Bajadas Verticales (Z):</span>
                    <span className="font-bold text-white">{fire3DCalculation.res3D.metrajeDesglose.verticalM} m</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Holgura Conexión (20cm/base):</span>
                    <span className="font-bold text-white">{fire3DCalculation.res3D.metrajeDesglose.holguraM} m</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-black text-sm border-t border-stone-800 pt-1.5 mt-1">
                    <span>CABLE TOTAL FINAL:</span>
                    <span>{fire3DCalculation.res3D.metrajeTotalM} m</span>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Factor de Llenado EMT */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-amber-400" /> Tubería EMT & Llenado
                  </span>
                  <Badge variant="outline" className="border-amber-500 text-amber-300 text-[10px]">
                    NEC Cap. 9
                  </Badge>
                </div>
                <div className="space-y-1 font-mono text-[11px] pt-1">
                  <div className="flex justify-between text-stone-300">
                    <span>Diámetro Seleccionado:</span>
                    <span className="font-bold text-amber-400 text-xs">EMT {fire3DCalculation.calcEMT.diametroEmtPulgadas}</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Porcentaje Llenado Real:</span>
                    <span className="font-bold text-white">{fire3DCalculation.calcEMT.porcentajeLlenadoReal}%</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Límite Llenado Legal:</span>
                    <span className="font-bold text-stone-400">{fire3DCalculation.calcEMT.maxPorcentajePermitido}%</span>
                  </div>
                  {fire3DCalculation.calcEMT.alerta && (
                    <p className="text-[10px] text-red-400 font-sans mt-1 leading-tight">
                      {fire3DCalculation.calcEMT.alerta}
                    </p>
                  )}
                </div>
              </div>

              {/* Bloque 3: Lazo SLC Hochiki */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-red-400 font-bold border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-400" /> Capacidad Lazo Hochiki
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      fire3DCalculation.fireDevs.length > HOCHIKI_SLC_MAX_DEVICES
                        ? 'border-red-500 bg-red-950 text-red-200'
                        : 'border-emerald-500 text-emerald-300'
                    }
                  >
                    {fire3DCalculation.fireDevs.length} / {HOCHIKI_SLC_MAX_DEVICES} Disp.
                  </Badge>
                </div>
                <div className="space-y-1 font-mono text-[11px] pt-1">
                  <div className="flex justify-between text-stone-300">
                    <span>Topología Configurada:</span>
                    <span className="font-bold text-white">Clase {fireWiringClass}</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Bobinas 305m FPLR:</span>
                    <span className="font-bold text-white">{fire3DCalculation.bom.bobinas305m} ud.</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Cajas Octagonales 4":</span>
                    <span className="font-bold text-white">{fire3DCalculation.bom.cajasOctagonales4} ud.</span>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Cajas Rectangulares 4"x2":</span>
                    <span className="font-bold text-white">{fire3DCalculation.bom.cajasRectangulares4x2} ud.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de Bill of Materials (BOM) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Listado de Materiales Calculados (BOM)
              </h4>
              <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-stone-900 text-stone-400 font-bold border-b border-stone-800 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">Descripción de Insumo</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5 text-center">Unidad</th>
                      <th className="p-2.5">Categoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-200">
                    {fire3DCalculation.bom.itemsBOM.map((item, i) => (
                      <tr key={i} className="hover:bg-stone-900/50">
                        <td className="p-2.5 font-bold text-amber-300">{item.sku}</td>
                        <td className="p-2.5 font-sans text-stone-300">{item.descripcion}</td>
                        <td className="p-2.5 text-center font-bold text-white">{item.cantidad}</td>
                        <td className="p-2.5 text-center text-stone-400">{item.unidad}</td>
                        <td className="p-2.5 font-sans">
                          <Badge variant="outline" className="text-[9px] border-stone-700 text-stone-300">
                            {item.categoria}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-stone-800 pt-3 flex justify-between items-center">
            <span className="text-[11px] text-stone-400 font-mono">
              NFPA 72 §17.7.4.1 · NEC Art. 760 · NOM-001-SEDE
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFireBOMModal(false)}
              className="bg-stone-800 text-white border-stone-700 hover:bg-stone-700"
            >
              Cerrar Listado de Materiales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet / Dialog de Cuantificación y Cumplimiento NOM de Extintores */}
      <ExtinguisherSummarySheet
        open={showExtinguisherSummary}
        onOpenChange={setShowExtinguisherSummary}
        extinguishers={fireStore.extinguishers}
      />

      {/* Sheet / Dialog de Cuantificación y Dictamen NOM-026 de Señalización de Emergencia */}
      <EmergencyExitSummarySheet
        open={showEmergencySummary}
        onOpenChange={setShowEmergencySummary}
        projectName={store.projectName || store.name}
        floorplanName={config.name}
      />
    </div>
  );
}
