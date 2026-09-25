'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  EmergencySignDevice,
  NOM026SignCategory,
  ArrowDirection,
} from '@/types/emergencySignage';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import {
  DoorOpen,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Maximize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EmergencyExitCanvasLayerProps {
  devices: EmergencySignDevice[];
  scaleMetersPerPx: number; // scale in m/px (e.g. 0.05)
  showCoverageDistances?: boolean;
  currentFloorplanId?: string;
  selectedId?: string | null;
  onSelectDevice?: (device: EmergencySignDevice) => void;
  onRemoveDevice?: (id: string) => void;
  onMouseDownMarker?: (device: EmergencySignDevice, e: React.MouseEvent) => void;
}

// ─── Direct Vector SVG Sign Components matching standard NOM-026 images ────────

/** 1. SALIDA DE EMERGENCIA (Matches Reference Image 2) */
function SalidaDeEmergenciaSvg({
  angle = 0,
  scale = 1.0,
}: {
  angle?: number;
  scale?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-75 select-none origin-center"
      style={{
        transform: `rotate(${angle}deg) scale(${scale})`,
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
      }}
    >
      <svg
        width="82"
        height="50"
        viewBox="0 0 140 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md"
      >
        {/* Plaque background #00A651 */}
        <rect x="2" y="2" width="136" height="80" rx="6" fill="#00A651" stroke="#FFFFFF" strokeWidth="3" />
        <rect x="5" y="5" width="130" height="74" rx="4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

        {/* Pictogram: Person walking left + Left Arrow + Open Door */}
        <g transform="translate(10, 8)">
          {/* Person walking left */}
          <g stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="28" cy="8" r="4.5" fill="#FFFFFF" stroke="none" />
            <path d="M 28 14 C 23 18, 20 22, 19 28" />
            <path d="M 28 16 L 22 22 L 15 20" />
            <path d="M 28 16 L 33 22" />
            <path d="M 19 28 L 14 38 L 10 42" />
            <path d="M 19 28 L 26 36 L 29 42" />
          </g>

          {/* Left Arrow */}
          <g fill="#FFFFFF">
            <path d="M 64 25 L 47 25 L 47 19 L 36 28 L 47 37 L 47 31 L 64 31 Z" />
          </g>

          {/* Open Door Frame & Panel */}
          <g stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinejoin="round">
            <rect x="70" y="6" width="22" height="42" />
            <polygon points="74,9 90,14 90,41 74,45" fill="#FFFFFF" opacity="0.95" stroke="#00A651" strokeWidth="1.5" />
          </g>
        </g>

        {/* Text SALIDA DE EMERGENCIA */}
        <text
          x="70"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10.5"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.4"
        >
          SALIDA DE EMERGENCIA
        </text>
      </svg>
    </div>
  );
}

/** 2. ESCALERA DE EMERGENCIA (Matches Reference Image 1) */
function EscaleraDeEmergenciaSvg({
  angle = 0,
  scale = 1.0,
}: {
  angle?: number;
  scale?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-75 select-none origin-center"
      style={{
        transform: `rotate(${angle}deg) scale(${scale})`,
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
      }}
    >
      <svg
        width="82"
        height="50"
        viewBox="0 0 140 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md"
      >
        <rect x="2" y="2" width="136" height="80" rx="6" fill="#00A651" stroke="#FFFFFF" strokeWidth="3" />
        <rect x="5" y="5" width="130" height="74" rx="4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

        {/* Pictogram: Person running right + Right Arrow + Staircase */}
        <g transform="translate(8, 8)">
          <g stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="16" cy="8" r="4.5" fill="#FFFFFF" stroke="none" />
            <path d="M 16 14 C 20 18, 23 22, 24 28" />
            <path d="M 16 16 L 22 21 L 28 19" />
            <path d="M 16 16 L 11 22" />
            <path d="M 24 28 L 29 37 L 33 41" />
            <path d="M 24 28 L 17 36 L 14 42" />
          </g>

          {/* Right Arrow */}
          <g fill="#FFFFFF">
            <path d="M 38 25 L 55 25 L 55 19 L 66 28 L 55 37 L 55 31 L 38 31 Z" />
          </g>

          {/* Staircase & Railing */}
          <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1">
            <polygon points="72,46 72,40 78,40 78,34 84,34 84,28 90,28 90,22 96,22 96,16 102,16 102,46" />
            <path d="M 68,43 L 97,14 L 102,14 L 102,17 L 73,46 Z" />
            <rect x="97" y="16" width="3.5" height="30" fill="#FFFFFF" />
          </g>
        </g>

        {/* Text ESCALERA DE EMERGENCIA */}
        <text
          x="70"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.2"
        >
          ESCALERA DE EMERGENCIA
        </text>
      </svg>
    </div>
  );
}

/** 3. RUTA DE EVACUACIÓN (Matches Reference Image 3) */
function RutaDeEvacuacionSvg({
  angle = 0,
  scale = 1.0,
  routeNumber = '1',
}: {
  angle?: number;
  scale?: number;
  routeNumber?: string;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-75 select-none origin-center"
      style={{
        transform: `rotate(${angle}deg) scale(${scale})`,
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
      }}
    >
      <svg
        width="82"
        height="50"
        viewBox="0 0 140 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md"
      >
        <rect x="3" y="3" width="134" height="78" rx="10" fill="#00A651" stroke="#FFFFFF" strokeWidth="3" />
        <rect x="7" y="7" width="126" height="70" rx="8" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />

        {/* Large Central Arrow */}
        <g fill="#FFFFFF" transform="translate(14, 12)">
          <path d="M 4 14 L 64 14 C 64 14 64 3 64 3 L 102 24 L 64 45 C 64 45 64 34 64 34 L 4 34 Z" />
        </g>

        {/* Text RUTA DE EVACUACIÓN */}
        <text
          x="16"
          y="72"
          fill="#FFFFFF"
          fontSize="9.5"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.3"
        >
          RUTA DE EVACUACIÓN
        </text>

        {/* Optional Route Number */}
        {routeNumber && (
          <text
            x="122"
            y="74"
            textAnchor="end"
            fill="#FFFFFF"
            fontSize="22"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {routeNumber}
          </text>
        )}
      </svg>
    </div>
  );
}

/** 4. ZONA DE SEGURIDAD SVG */
function ZonaDeSeguridadSvg({
  angle = 0,
  scale = 1.0,
}: {
  angle?: number;
  scale?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-75 select-none origin-center"
      style={{
        transform: `rotate(${angle}deg) scale(${scale})`,
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
      }}
    >
      <svg
        width="82"
        height="50"
        viewBox="0 0 140 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md"
      >
        <rect x="2" y="2" width="136" height="80" rx="6" fill="#00A651" stroke="#FFFFFF" strokeWidth="3" />
        <g transform="translate(42, 8)" fill="#FFFFFF">
          <polygon points="28,2 24,10 32,10" />
          <polygon points="28,42 24,34 32,34" />
          <polygon points="2,22 10,18 10,26" />
          <polygon points="54,22 46,18 46,26" />
          <circle cx="28" cy="18" r="3" />
          <path d="M 23 28 C 23 23, 33 23, 33 28 Z" />
          <circle cx="20" cy="20" r="2.5" />
          <path d="M 16 29 C 16 25, 24 25, 24 29 Z" />
          <circle cx="36" cy="20" r="2.5" />
          <path d="M 32 29 C 32 25, 40 25, 40 29 Z" />
        </g>
        <text
          x="70"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          ZONA DE SEGURIDAD
        </text>
      </svg>
    </div>
  );
}

/** 5. PRIMEROS AUXILIOS SVG */
function PrimerosAuxiliosSvg({
  angle = 0,
  scale = 1.0,
}: {
  angle?: number;
  scale?: number;
}) {
  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-75 select-none origin-center"
      style={{
        transform: `rotate(${angle}deg) scale(${scale})`,
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.4))',
      }}
    >
      <svg
        width="82"
        height="50"
        viewBox="0 0 140 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-md"
      >
        <rect x="2" y="2" width="136" height="80" rx="6" fill="#00A651" stroke="#FFFFFF" strokeWidth="3" />
        <g fill="#FFFFFF" transform="translate(54, 10)">
          <rect x="12" y="4" width="8" height="32" rx="1.5" />
          <rect x="0" y="16" width="32" height="8" rx="1.5" />
        </g>
        <text
          x="70"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          PRIMEROS AUXILIOS
        </text>
      </svg>
    </div>
  );
}

// Map ArrowDirection string to default angle degrees
function getDirectionAngle(dir?: ArrowDirection): number {
  switch (dir) {
    case 'RIGHT':
      return 0;
    case 'DOWN_RIGHT':
      return 45;
    case 'DOWN':
      return 90;
    case 'DOWN_LEFT':
      return 135;
    case 'LEFT':
      return 180;
    case 'UP_LEFT':
      return 225;
    case 'UP':
      return 270;
    case 'UP_RIGHT':
      return 315;
    default:
      return 0;
  }
}

export function EmergencyExitCanvasLayer({
  devices,
  scaleMetersPerPx = 0.05,
  showCoverageDistances = true,
  currentFloorplanId,
  selectedId,
  onSelectDevice,
  onRemoveDevice,
  onMouseDownMarker,
}: EmergencyExitCanvasLayerProps) {
  const store = useEmergencyStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ─── Direct Interactive Manipulation States ──────────────────────────────
  const [rotatingDeviceId, setRotatingDeviceId] = useState<string | null>(null);
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const initialAngleRef = useRef<number>(0);

  const [resizingDeviceId, setResizingDeviceId] = useState<string | null>(null);
  const [currentScale, setCurrentScale] = useState<number>(1.0);
  const initialScaleRef = useRef<number>(1.0);
  const resizeStartDistRef = useRef<number>(40);

  // Dragging state for left-click movement
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isActuallyDragging, setIsActuallyDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; devX: number; devY: number }>({
    mouseX: 0,
    mouseY: 0,
    devX: 0,
    devY: 0,
  });

  const displayRadii = showCoverageDistances ?? store.showCoverageDistances;
  const activeDevices = devices.filter(
    (dev) => !dev.planoId || !currentFloorplanId || dev.planoId === currentFloorplanId
  );

  // ─── 1. Rotation via Right-Click Logic ────────────────────────────────────
  const handleStartRotate = (dev: EmergencySignDevice, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startDeg = dev.arrowAngle ?? getDirectionAngle(dev.arrowDirection);
    initialAngleRef.current = startDeg;
    setCurrentAngle(startDeg);
    setRotatingDeviceId(dev.id);

    toast.info('🔄 Modo Girar: Mueva el ratón para orientar la señal. Clic o ESC para terminar.', {
      duration: 3500,
    });
  };

  // ─── 2. Direct Corner Drag Resizing Logic ───────────────────────────────
  const handleStartCornerResize = (dev: EmergencySignDevice, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left-click only
    e.preventDefault();
    e.stopPropagation();

    const startSc = dev.customScale || 1.0;
    initialScaleRef.current = startSc;
    setCurrentScale(startSc);

    const el = document.getElementById(`emg_marker_${dev.id}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      resizeStartDistRef.current = Math.max(10, Math.sqrt(dx * dx + dy * dy));
    } else {
      resizeStartDistRef.current = 40;
    }

    setResizingDeviceId(dev.id);

    toast.info('📏 Redimensionando: Arrastre hacia afuera para aumentar o hacia adentro para reducir. Suelte o ESC para fijar.', {
      duration: 3500,
    });
  };

  // ─── 3. Left-Click Dragging Handler ──────────────────────────────────────
  const handleStartDrag = (dev: EmergencySignDevice, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left-click only
    // Don't drag if user clicked on interactive buttons inside popover or corner handles
    if (
      (e.target as HTMLElement)?.closest('button') ||
      (e.target as HTMLElement)?.closest('.corner-resize-handle')
    ) {
      return;
    }
    e.stopPropagation();

    if (onMouseDownMarker) {
      onMouseDownMarker(dev, e);
    }

    setDraggingId(dev.id);
    setIsActuallyDragging(false); // Popover visible until actual movement > 3px
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      devX: dev.x,
      devY: dev.y,
    };
  };

  // Global mousemove, mouseup & keydown listeners for Rotate, Resize, and Drag
  useEffect(() => {
    if (!rotatingDeviceId && !resizingDeviceId && !draggingId) return;

    const activeDev = devices.find(
      (d) => d.id === rotatingDeviceId || d.id === resizingDeviceId || d.id === draggingId
    );

    const handleMouseMove = (e: MouseEvent) => {
      if (rotatingDeviceId && activeDev) {
        const el = document.getElementById(`emg_marker_${rotatingDeviceId}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = e.clientX - centerX;
          const dy = e.clientY - centerY;

          let rad = Math.atan2(dy, dx);
          let deg = Math.round((rad * 180) / Math.PI);
          if (deg < 0) deg += 360;

          const cardinalSnaps = [0, 45, 90, 135, 180, 225, 270, 315, 360];
          for (const snap of cardinalSnaps) {
            if (Math.abs(deg - snap) <= 6) {
              deg = snap === 360 ? 0 : snap;
              break;
            }
          }

          setCurrentAngle(deg);
        }
      }

      if (resizingDeviceId && activeDev) {
        const el = document.getElementById(`emg_marker_${resizingDeviceId}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = e.clientX - centerX;
          const dy = e.clientY - centerY;
          const currentDist = Math.sqrt(dx * dx + dy * dy);

          const scaleRatio = currentDist / (resizeStartDistRef.current || 40);
          let newSc = Number((initialScaleRef.current * scaleRatio).toFixed(2));
          newSc = Math.min(3.0, Math.max(0.4, newSc));

          setCurrentScale(newSc);
        }
      }

      if (draggingId) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hide popover window immediately as soon as icon starts moving (> 3px)
        if (dist > 3 && !isActuallyDragging) {
          setIsActuallyDragging(true);
        }

        const newX = Math.round(dragStartRef.current.devX + dx);
        const newY = Math.round(dragStartRef.current.devY + dy);

        store.updateEmergencyDevice(draggingId, { x: newX, y: newY }, scaleMetersPerPx);
      }
    };

    const handleMouseDownOrClick = (e: MouseEvent) => {
      // Ignore click on interactive buttons inside popover or corner handles
      if (
        (e.target as HTMLElement)?.closest('button') ||
        (e.target as HTMLElement)?.closest('.corner-resize-handle')
      ) {
        return;
      }

      if (rotatingDeviceId) {
        e.preventDefault();
        e.stopPropagation();
        store.updateEmergencyDevice(rotatingDeviceId, { arrowAngle: currentAngle }, scaleMetersPerPx);
        setRotatingDeviceId(null);
        toast.success(`🚨 Giro fijado en ${currentAngle}°`);
      }
    };

    const handleMouseUp = () => {
      if (draggingId) {
        setDraggingId(null);
        setIsActuallyDragging(false);
      }

      if (resizingDeviceId) {
        store.updateEmergencyDevice(resizingDeviceId, { customScale: currentScale }, scaleMetersPerPx);
        setResizingDeviceId(null);
        toast.success(`📏 Tamaño de icono actualizado (${(currentScale * 100).toFixed(0)}%)`);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();

        if (rotatingDeviceId) {
          store.updateEmergencyDevice(
            rotatingDeviceId,
            { arrowAngle: initialAngleRef.current },
            scaleMetersPerPx
          );
          setRotatingDeviceId(null);
          toast.info('❌ Proceso de girar cancelado');
        }

        if (resizingDeviceId) {
          store.updateEmergencyDevice(
            resizingDeviceId,
            { customScale: initialScaleRef.current },
            scaleMetersPerPx
          );
          setResizingDeviceId(null);
          toast.info('❌ Ajuste de tamaño cancelado');
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mousedown', handleMouseDownOrClick, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mousedown', handleMouseDownOrClick, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [rotatingDeviceId, resizingDeviceId, draggingId, isActuallyDragging, currentAngle, currentScale, devices, scaleMetersPerPx, store]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* ─── SVG Layer para Radios de Visualización Normativos (S >= L^2 / 2000) ─── */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        {displayRadii &&
          activeDevices.map((dev) => {
            const displayRadiusM = dev.viewingDistanceM || 15.0;
            const radiusPx = scaleMetersPerPx > 0 ? displayRadiusM / scaleMetersPerPx : displayRadiusM * 20;
            const isValid = dev.isValidLocation;

            return (
              <g key={`emg_radius_${dev.id}`}>
                <circle
                  cx={dev.x}
                  cy={dev.y}
                  r={radiusPx}
                  fill={isValid ? 'rgba(0, 166, 81, 0.12)' : 'rgba(239, 68, 68, 0.22)'}
                  stroke={isValid ? '#00A651' : '#ef4444'}
                  strokeWidth="1.5"
                  strokeDasharray={isValid ? '6 4' : '4 3'}
                  className="transition-all duration-300"
                />
                <text
                  x={dev.x}
                  y={dev.y - radiusPx + 14}
                  textAnchor="middle"
                  fill={isValid ? '#00A651' : '#ef4444'}
                  fontSize="10"
                  fontWeight="bold"
                  className="select-none font-mono drop-shadow-sm"
                >
                  Visualización NOM-026: {displayRadiusM}m ({Math.round(radiusPx)}px)
                </text>
              </g>
            );
          })}
      </svg>

      {/* ─── Render de Iconos de Señalización NOM-026 Rediseñados ─── */}
      {activeDevices.map((dev) => {
        const isHovered = hoveredId === dev.id;
        const isSelected = selectedId === dev.id;
        const isValid = dev.isValidLocation;

        const isRotating = rotatingDeviceId === dev.id;
        const isResizing = resizingDeviceId === dev.id;
        const isThisItemMoving = draggingId === dev.id && isActuallyDragging;

        // Hide popover while moving/dragging, rotating, or resizing so canvas visibility is unobstructive
        const showPopover = (isHovered || isSelected) && !isThisItemMoving && !isRotating && !isResizing;

        const angle = isRotating ? currentAngle : dev.arrowAngle ?? getDirectionAngle(dev.arrowDirection);
        const scale = isResizing ? currentScale : dev.customScale ?? 1.0;

        return (
          <div
            key={`emg_marker_${dev.id}`}
            id={`emg_marker_${dev.id}`}
            style={{
              position: 'absolute',
              left: `${dev.x}px`,
              top: `${dev.y}px`,
              zIndex: isRotating || isResizing || isHovered || isSelected ? 100 : 20,
            }}
            className={`pointer-events-auto group select-none transition-shadow ${
              isThisItemMoving ? 'cursor-grabbing scale-105' : 'cursor-grab'
            }`}
            onMouseEnter={() => setHoveredId(dev.id)}
            onMouseLeave={() => setHoveredId(null)}
            onContextMenu={(e) => handleStartRotate(dev, e)}
            onMouseDown={(e) => handleStartDrag(dev, e)}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectDevice) onSelectDevice(dev);
            }}
          >
            {/* Alerta parpadeante si no cumple la norma */}
            {!isValid && (
              <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
            )}

            {/* Container principal del icono de señalización */}
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              {dev.category === 'SALIDA_DE_EMERGENCIA' && (
                <SalidaDeEmergenciaSvg angle={angle} scale={scale} />
              )}
              {dev.category === 'ESCALERA_DE_EMERGENCIA' && (
                <EscaleraDeEmergenciaSvg angle={angle} scale={scale} />
              )}
              {dev.category === 'RUTA_DE_EVACUACION' && (
                <RutaDeEvacuacionSvg angle={angle} scale={scale} routeNumber={dev.associatedRouteId || '1'} />
              )}
              {dev.category === 'ZONA_DE_SEGURIDAD' && (
                <ZonaDeSeguridadSvg angle={angle} scale={scale} />
              )}
              {dev.category === 'PRIMEROS_AUXILIOS' && (
                <PrimerosAuxiliosSvg angle={angle} scale={scale} />
              )}

              {/* Indicador de Estado Normativo */}
              <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md border border-stone-300 z-10">
                {isValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce shrink-0" />
                )}
              </span>
            </div>

            {/* ─── Direct Corner Drag Resize Handles (Visibles al seleccionar / pasar el mouse) ─── */}
            {(isHovered || isSelected || isResizing) && !isRotating && !isThisItemMoving && (
              <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                {/* Bounding box outline */}
                <div
                  style={{
                    width: `${86 * scale}px`,
                    height: `${54 * scale}px`,
                  }}
                  className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 border border-emerald-400/80 rounded-md ring-1 ring-emerald-400/30"
                />

                {/* Corner Handle: Top-Left */}
                <span
                  onMouseDown={(e) => handleStartCornerResize(dev, e)}
                  style={{ transform: `translate(${-43 * scale}px, ${-27 * scale}px)` }}
                  className="corner-resize-handle absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto z-40 ring-2 ring-emerald-400/50"
                  title="Arrastrar con clic izquierdo: hacia afuera para aumentar, hacia adentro para reducir"
                />

                {/* Corner Handle: Top-Right */}
                <span
                  onMouseDown={(e) => handleStartCornerResize(dev, e)}
                  style={{ transform: `translate(${43 * scale}px, ${-27 * scale}px)` }}
                  className="corner-resize-handle absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto z-40 ring-2 ring-emerald-400/50"
                  title="Arrastrar con clic izquierdo: hacia afuera para aumentar, hacia adentro para reducir"
                />

                {/* Corner Handle: Bottom-Left */}
                <span
                  onMouseDown={(e) => handleStartCornerResize(dev, e)}
                  style={{ transform: `translate(${-43 * scale}px, ${27 * scale}px)` }}
                  className="corner-resize-handle absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto z-40 ring-2 ring-emerald-400/50"
                  title="Arrastrar con clic izquierdo: hacia afuera para aumentar, hacia adentro para reducir"
                />

                {/* Corner Handle: Bottom-Right */}
                <span
                  onMouseDown={(e) => handleStartCornerResize(dev, e)}
                  style={{ transform: `translate(${43 * scale}px, ${27 * scale}px)` }}
                  className="corner-resize-handle absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto z-40 ring-2 ring-emerald-400/50"
                  title="Arrastrar con clic izquierdo: hacia afuera para aumentar, hacia adentro para reducir"
                />
              </div>
            )}

            {/* ─── Interactive Overlay: Rotating Process Animation ─── */}
            {isRotating && (
              <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-400 animate-spin -translate-x-1/2 -translate-y-1/2 absolute left-0 top-0" style={{ animationDuration: '8s' }} />

                {[0, 45, 90, 135, 180, 225, 270, 315].map((snapDeg) => {
                  const rad = (snapDeg * Math.PI) / 180;
                  const px = Math.cos(rad) * 48;
                  const py = Math.sin(rad) * 48;
                  const isActiveSnap = Math.abs(currentAngle - snapDeg) <= 3;
                  return (
                    <span
                      key={snapDeg}
                      style={{ transform: `translate(${px}px, ${py}px)` }}
                      className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
                        isActiveSnap
                          ? 'w-3 h-3 bg-emerald-400 ring-4 ring-emerald-300 shadow-lg'
                          : 'w-2 h-2 bg-cyan-400 opacity-70'
                      }`}
                    />
                  );
                })}

                <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900/95 text-cyan-300 border border-cyan-500/80 rounded-full px-3 py-1 shadow-2xl text-[11px] font-black flex items-center gap-1.5 animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Girando: {currentAngle}°</span>
                </div>
              </div>
            )}

            {/* ─── Interactive Overlay: Resizing Process Animation & HUD ─── */}
            {isResizing && (
              <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                {/* Dynamic Floating HUD Badge for Resizing */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900/95 text-emerald-300 border border-emerald-500/80 rounded-xl px-3 py-1 shadow-2xl text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Escala: {(currentScale * 100).toFixed(0)}% (
                    {(dev.widthM * 100 * currentScale).toFixed(1)} x{' '}
                    {(dev.heightM * 100 * currentScale).toFixed(1)} cm)
                  </span>
                </div>
              </div>
            )}

            {/* Tooltip Popover Glassmorphism (Desaparece al arrastrar/mover para no obstruir) */}
            {showPopover && (
              <div
                className="absolute left-0 bottom-[36px] -translate-x-1/2 w-72 bg-stone-900/95 backdrop-blur-md text-stone-100 p-3 rounded-xl shadow-2xl border border-emerald-500/40 text-xs z-50 pointer-events-auto space-y-2 select-none"
                onMouseEnter={() => setHoveredId(dev.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Tooltip */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 drop-shadow-sm">
                    <DoorOpen className="w-4 h-4" />
                    <span>{dev.category.replace(/_/g, ' ')}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      isValid
                        ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-300 font-bold'
                        : 'border-red-400/60 bg-red-950/90 text-red-300 font-bold'
                    }`}
                  >
                    {isValid ? 'CUMPLE NOM-026' : 'ALERTA NORMATIVA'}
                  </Badge>
                </div>

                {/* Specification stats */}
                <div className="space-y-1 text-[11px] text-stone-200">
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Orientación / Ángulo:</span>
                    <span className="font-bold text-emerald-400 font-mono">{angle}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Escala / Tamaño:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {(scale * 100).toFixed(0)}% ({(dev.widthM * 100 * scale).toFixed(1)} x{' '}
                      {(dev.heightM * 100 * scale).toFixed(1)} cm)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Distancia Obs. (L):</span>
                    <span className="font-bold text-white font-mono">{dev.viewingDistanceM} metros</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Altura Montaje:</span>
                    <span className="font-bold text-white font-mono">{dev.mountingHeightM.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Soporte / Material:</span>
                    <span className="font-bold text-stone-200 truncate max-w-[140px]" title={dev.material}>
                      {dev.material.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Validation Alerts */}
                {dev.validationAlerts && dev.validationAlerts.length > 0 && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Advertencias Normativas:
                    </span>
                    <ul className="space-y-0.5 text-[10px] text-red-300 list-disc pl-3">
                      {dev.validationAlerts.map((alert, idx) => (
                        <li key={idx} className="leading-tight font-medium">
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Interactive Actions */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleStartRotate(dev, e)}
                    className="h-6 text-[10px] bg-stone-800 text-cyan-300 border-cyan-500/50 hover:bg-cyan-950 font-bold gap-1 px-2"
                    title="Girar con el ratón (Clic derecho)"
                  >
                    <RotateCw className="w-3 h-3 text-cyan-400" /> Girar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleStartCornerResize(dev, e)}
                    className="h-6 text-[10px] bg-stone-800 text-emerald-300 border-emerald-500/50 hover:bg-emerald-950 font-bold gap-1 px-2"
                    title="Arrastre las esquinas con clic izquierdo (hacia afuera para aumentar, hacia adentro para reducir)"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-400" /> Redimensionar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setHoveredId(null);
                      if (onRemoveDevice) {
                        onRemoveDevice(dev.id);
                      } else {
                        store.removeEmergencyDevice(dev.id);
                      }
                    }}
                    className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/60 font-bold gap-1 px-1.5"
                    title="Eliminar esta señal"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
