'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEstimateStore } from '@/store/estimate-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Clock,
  FileText,
  Info,
  CheckCircle2,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportVivotekFormToExcel, VivotekFormData, VivotekProductItem } from '@/lib/vivotek-export';
import AddVivotekDeviceDialog from './add-vivotek-device-dialog';
import EditVivotekDeviceDialog from './edit-vivotek-device-dialog';
import EmailVivotekDialog from './email-vivotek-dialog';

const WARRANTY_OPTIONS = [
  { label: 'Sin garantía (0%)', value: 'Sin garantía', rate: 0 },
  { label: '1 año (5%)', value: '1 año (5%)', rate: 0.05 },
  { label: '2 años (10%)', value: '2 años (10%)', rate: 0.10 },
  { label: '3 años (15%)', value: '3 años (15%)', rate: 0.15 },
];

// Mapeo oficial de modelos y descripciones VIVOTEK por tipo de equipo
const VIVOTEK_MODEL_MAP: Record<string, { model: string; description: string; cost: number }> = {
  bullet: {
    model: 'IB9389-EHTVL-V3',
    description: 'Camara IP bullet exterior 5 MP, Lente Varifocal Remoto 2.7-13.5mm, IR 50 Mts, IP66, IK10, WDR Pro',
    cost: 7805.18,
  },
  domo: {
    model: 'MD9584-H',
    description: 'Camara IP domo exterior, 5 Megapixeles, Lente fijo 3.6mm, IR 50 Mts, Conector M12, IP68, IK10, Nema 4x, EN50155 OT4',
    cost: 7480.00,
  },
  dome: {
    model: 'MD9584-H',
    description: 'Camara IP domo exterior, 5 Megapixeles, Lente fijo 3.6mm, IR 50 Mts, Conector M12, IP68, IK10, Nema 4x, EN50155 OT4',
    cost: 7480.00,
  },
  ptz: {
    model: 'SD9368-EHL',
    description: 'Camara IP PTZ exterior, 4 Megapixeles, 32x Zoom Optico, IR 150 Mts, WDR Pro, IP66, IK10, Nema 4X',
    cost: 28500.00,
  },
  fisheye: {
    model: 'FE9382-EHV-V2',
    description: 'Camara IP Fisheye 360°, 12 Megapixeles, IR 15 Mts, IP66, IK10, Dewarping en Hardware, Microfono integrado',
    cost: 15200.00,
  },
  panoramic: {
    model: 'MS9321-EHV',
    description: 'Camara IP Panorámica 180°, 20 Megapixeles, 4 sensores CMOS, IR 30 Mts, IP66, IK10, Smart Stream III',
    cost: 32400.00,
  },
  panoramica: {
    model: 'MS9321-EHV',
    description: 'Camara IP Panorámica 180°, 20 Megapixeles, 4 sensores CMOS, IR 30 Mts, IP66, IK10, Smart Stream III',
    cost: 32400.00,
  },
  nvr: {
    model: 'NR9682-V3',
    description: 'Grabador NVR VIVOTEK 64 Canales H.265, 8 Bahías SATA Hot-Swap, RAID 0/1/5/6/10, Soporte VAST 2 / VSS',
    cost: 174024.00,
  },
  switch: {
    model: 'AW-GET-083A-120',
    description: 'Switch PoE Industrial VIVOTEK 8 Puertos Gigabit PoE+ (30W por puerto), 2 Puertos SFP Uplink, Presupuesto 120W, IP30',
    cost: 8450.00,
  },
};

function resolveModelAndDescription(
  itemKey: string,
  itemDesc: string,
  priceCatalog: any[]
) {
  const k = (itemKey || '').trim().toLowerCase();
  const d = (itemDesc || '').trim().toLowerCase();
  const combined = `${k} ${d}`;

  // 1. Buscar coincidencia directa en la BD de Precios por modelo o SKU
  const dbMatch = priceCatalog.find(
    (it) =>
      (it.model && it.model.toLowerCase() === k) ||
      (it.sku && it.sku.toLowerCase() === k) ||
      (it.model && k.includes(it.model.toLowerCase())) ||
      (it.sku && k.includes(it.sku.toLowerCase()))
  );

  let modelStr = dbMatch?.model || dbMatch?.sku || '';
  let descStr = dbMatch?.description || itemDesc || '';
  let unitCost = dbMatch?.unitCost ?? 0;

  // Si el modelo retornado es un código genérico como CCTV-CAM-001, ignorarlo para forzar el modelo real
  if (modelStr.toUpperCase().startsWith('CCTV-')) {
    modelStr = '';
  }

  // 2. Si no se encontró un modelo real, mapear según las palabras clave de VIVOTEK
  if (!modelStr) {
    for (const [key, map] of Object.entries(VIVOTEK_MODEL_MAP)) {
      if (combined.includes(key)) {
        modelStr = map.model;
        if (!descStr || descStr.includes('Camara IP domo exterior, 5 MP')) {
          descStr = map.description;
        }
        if (unitCost === 0) {
          unitCost = map.cost;
        }
        break;
      }
    }
  }

  // Valores fallback garantizados
  if (!modelStr) {
    modelStr = 'MD9584-H';
  }
  if (!descStr) {
    descStr = 'Camara IP domo exterior, 5 Megapixeles, Lente fijo 3.6mm, IR 50 Mts, Conector M12, IP68, IK10, Nema 4x, EN50155 OT4';
  }
  if (unitCost === 0) {
    unitCost = 7480.00;
  }

  return { model: modelStr, description: descStr, unitCost };
}

function isVivotekEquipment(modelo: string, descripcion: string, brand?: string): boolean {
  const m = (modelo || '').toLowerCase();
  const d = (descripcion || '').toLowerCase();
  const b = (brand || '').toLowerCase();

  // Exclusión estricta de componentes que NO son Cámaras, NVR o Switch VIVOTEK
  if (
    d.includes('cable') ||
    d.includes('conduit') ||
    d.includes('codo') ||
    d.includes('cople') ||
    d.includes('tubo') ||
    d.includes('monitor') ||
    d.includes('pantalla') ||
    d.includes('montaje') ||
    d.includes('disco') ||
    d.includes('organizador') ||
    d.includes('batería') ||
    d.includes('anunciador') ||
    d.includes('estación manual') ||
    d.includes('estrobo') ||
    d.includes('chapa') ||
    d.includes('botón') ||
    d.includes('torniquete') ||
    d.includes('altavoz') ||
    d.includes('detector') ||
    d.includes('licencia') ||
    d.includes('computadora') ||
    b.includes('samsung') ||
    b.includes('unifi') ||
    b.includes('ubiquiti') ||
    b.includes('zkteco') ||
    b.includes('hochiki') ||
    b.includes('panduit') ||
    b.includes('belden') ||
    b.includes('surix') ||
    b.includes('epcom') ||
    b.includes('seagate') ||
    b.includes('western') ||
    b.includes('hid') ||
    b.includes('bosch') ||
    m.startsWith('can-') ||
    m.startsWith('cab-') ||
    m.startsWith('usw-') ||
    m.startsWith('mag') ||
    m.startsWith('bzl') ||
    m.startsWith('ss24') ||
    m.startsWith('alo-') ||
    m.startsWith('atj-') ||
    m.startsWith('dcp-') ||
    m.startsWith('hcs') ||
    m.startsWith('lfc') ||
    m.startsWith('5220') ||
    m.startsWith('pst-') ||
    m.startsWith('la102') ||
    m.startsWith('hsb-') ||
    m.startsWith('lk7') ||
    m.startsWith('ls27') ||
    m.startsWith('g65') ||
    m.startsWith('qm55') ||
    m.startsWith('epb') ||
    m.startsWith('wmpv') ||
    m.startsWith('pul') ||
    m.startsWith('k11') ||
    m.startsWith('zkb') ||
    m.startsWith('sx00') ||
    m.startsWith('servoc')
  ) {
    return false;
  }

  // Aceptar si es de marca Vivotek o sufijos de modelo Vivotek (NR, ND, FD, IB, MD, SD, FE, MS, AW)
  if (
    b.includes('vivotek') ||
    m.startsWith('nr') ||
    m.startsWith('nd') ||
    m.startsWith('fd') ||
    m.startsWith('ib') ||
    m.startsWith('md') ||
    m.startsWith('sd') ||
    m.startsWith('fe') ||
    m.startsWith('ms') ||
    m.startsWith('aw-')
  ) {
    return true;
  }

  // Aceptar únicamente si es Cámara, NVR o Switch Vivotek
  return (
    d.includes('cámara') ||
    d.includes('camara') ||
    d.includes('nvr') ||
    d.includes('grabador') ||
    (d.includes('switch') && d.includes('vivotek'))
  );
}

// Helper para gestión de folios únicos sin duplicados
function getUniqueFolio(existingFolio?: string): string {
  let usedFolios: string[] = [];
  try {
    const stored = localStorage.getItem('lve.vivotek_registered_folios');
    if (stored) {
      usedFolios = JSON.parse(stored);
    }
  } catch {
    // silent
  }

  if (existingFolio && existingFolio.trim()) {
    const trimmed = existingFolio.trim();
    if (!usedFolios.includes(trimmed)) {
      usedFolios.push(trimmed);
      try {
        localStorage.setItem('lve.vivotek_registered_folios', JSON.stringify(usedFolios));
      } catch {
        // silent
      }
    }
    return trimmed;
  }

  let candidate = '';
  let attempts = 0;
  do {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    candidate = `REG-VIV-${randNum}`;
    attempts++;
  } while (usedFolios.includes(candidate) && attempts < 100);

  usedFolios.push(candidate);
  try {
    localStorage.setItem('lve.vivotek_registered_folios', JSON.stringify(usedFolios));
  } catch {
    // silent
  }

  return candidate;
}

export default function VivotekForm() {
  const store = useEstimateStore();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Modales de agregar, editar producto y email
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Intentar cargar la sesión del usuario para autollenar persona que registra
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser({ name: data.user.name || '', email: data.user.email || '' });
        }
      })
      .catch(() => {});
  }, []);

  // Estado principal del formulario
  const [formData, setFormData] = useState<VivotekFormData>({
    numRegistro: '',
    nombreProyecto: '',
    fechaRegistro: new Date().toISOString().split('T')[0],
    empresaUsuarioFinal: '',
    lugarProyecto: '',
    contactoUsuarioFinal: '',
    emailUsuarioFinal: '',
    descripcionProyecto: '',
    vmsIntegracion: 'VIVOTEK VAST 2 / VAST Security Station',
    competencia: '',
    tipoCompra: 'Una sola compra',
    fechaEstimadaCompra: '',

    nombreEmpresaIntegrador: '',
    telefonoIntegrador: '',
    personaRegistraIntegrador: '',
    emailIntegrador: '',
    responsableIngenieria: '',
    numCertificado: '',

    nombreMayorista: 'TVC Línea Comercial',
    telefonoMayorista: '',
    personaRegistraMayorista: '',
    emailMayorista: '',

    productos: [],
  });

  const storageKey = useMemo(() => {
    return `lve.vivotek_form.${store.estimateId || 'draft'}`;
  }, [store.estimateId]);

  // Función para importar productos desde la BD de Precios y el Presupuesto (SOLO Cámaras, NVRs, Switches VIVOTEK)
  const handleImportProducts = useCallback(async () => {
    const newItems: VivotekProductItem[] = [];

    // 1. Cargar catálogo completo desde la base de datos de Precios
    let priceCatalog: any[] = [];
    try {
      const res = await fetch('/api/prices?limit=1000');
      if (res.ok) {
        const json = await res.json();
        priceCatalog = json.data ?? json ?? [];
      }
    } catch {
      // silent
    }

    const addedModels = new Set<string>();

    // 2. Extraer desde las partidas calculadas del Presupuesto (store.result.lineItems)
    if (store.result?.lineItems && store.result.lineItems.length > 0) {
      store.result.lineItems.forEach((it) => {
        const { model, description, unitCost } = resolveModelAndDescription(
          it.modelo || it.code || it.description,
          it.description,
          priceCatalog
        );

        // FILTRO ESTRICTO: Solo incluir Cámaras, NVRs y Switches VIVOTEK
        if (isVivotekEquipment(model, description, it.marca)) {
          const cantidad = Math.max(1, it.quantity);

          if (!addedModels.has(model.toLowerCase())) {
            addedModels.add(model.toLowerCase());
            newItems.push({
              modelo: model,
              descripcion: description,
              cantidad,
              precioRegularCompra: 0,
              precioProyecto: 0,
              extensionGarantia: 'Sin garantía',
              precioUnitario: 0,
              precioTotal: 0,
              observaciones: `Equipo VIVOTEK`,
              comentarios: 'Extraído de Presupuesto',
            });
          }
        }
      });
    }

    // 3. Extraer Cámaras de cctvConfig si no estaban en lineItems
    if (store.cctvConfig?.cameras && store.cctvConfig.cameras.length > 0) {
      store.cctvConfig.cameras.forEach((cam) => {
        if (cam.qty > 0) {
          const { model, description } = resolveModelAndDescription(
            cam.model || cam.type,
            `Camara IP ${cam.type} exterior`,
            priceCatalog
          );
          const cantidad = Math.max(1, cam.qty);

          if (isVivotekEquipment(model, description) && !addedModels.has(model.toLowerCase())) {
            addedModels.add(model.toLowerCase());
            newItems.push({
              modelo: model,
              descripcion: description,
              cantidad,
              precioRegularCompra: 0,
              precioProyecto: 0,
              extensionGarantia: 'Sin garantía',
              precioUnitario: 0,
              precioTotal: 0,
              observaciones: `Cámara VIVOTEK (${cam.type})`,
              comentarios: 'Importado de CCTV Presupuesto',
            });
          }
        }
      });
    }

    // 4. Extraer Grabadores NVR VIVOTEK
    if (store.cctvConfig?.nvr && store.cctvConfig.nvr.qty > 0) {
      const nvrModel = store.cctvConfig.nvr.nvrModel || 'NR9682-V3';
      const { model, description } = resolveModelAndDescription(
        nvrModel,
        `Grabador NVR VIVOTEK ${nvrModel}`,
        priceCatalog
      );
      const cantidad = Math.max(1, store.cctvConfig.nvr.qty);

      if (isVivotekEquipment(model, description) && !addedModels.has(model.toLowerCase())) {
        addedModels.add(model.toLowerCase());
        newItems.push({
          modelo: model,
          descripcion: description,
          cantidad,
          precioRegularCompra: 0,
          precioProyecto: 0,
          extensionGarantia: 'Sin garantía',
          precioUnitario: 0,
          precioTotal: 0,
          observaciones: `Grabador NVR VIVOTEK | Retención: ${store.cctvConfig.nvr.recordingDays || 30} días`,
          comentarios: 'Gravador NVR VIVOTEK de Presupuesto',
        });
      }
    }

    // 5. Extraer Switches VIVOTEK
    const switchPorts = store.cctvConfig?.fixedSwitchPorts ?? 0;
    if (switchPorts > 0) {
      const switchModel = 'AW-GET-083A-120';
      const { model, description } = resolveModelAndDescription(
        switchModel,
        `Switch Industrial VIVOTEK PoE+ ${switchPorts} Puertos`,
        priceCatalog
      );
      const cantidad = Math.ceil(switchPorts / 8) || 1;

      if (isVivotekEquipment(model, description) && !addedModels.has(model.toLowerCase())) {
        addedModels.add(model.toLowerCase());
        newItems.push({
          modelo: model,
          descripcion: description,
          cantidad,
          precioRegularCompra: 0,
          precioProyecto: 0,
          extensionGarantia: 'Sin garantía',
          precioUnitario: 0,
          precioTotal: 0,
          observaciones: `Switch PoE VIVOTEK para ${switchPorts} puertos`,
          comentarios: 'Switch VIVOTEK de Presupuesto',
        });
      }
    }

    if (newItems.length === 0) {
      toast.info('No se encontraron equipos VIVOTEK (Cámaras, NVRs o Switches) en el Presupuesto. Puedes agregar filas con "+ Agregar Fila".');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      productos: newItems,
    }));

    toast.success(`${newItems.length} equipos VIVOTEK (Cámaras, NVRs, Switches) extraídos del Presupuesto`);
  }, [store.cctvConfig, store.result]);

  // Cargar estado guardado o autollenar al inicio
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      // silent
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Si los productos guardados contienen items no-Vivotek o códigos obsoletos genéricos (CCTV-CAM-001), sanitizarlos y forzar precios en 0
        if (Array.isArray(parsed.productos)) {
          const sanitized = parsed.productos
            .filter((p: VivotekProductItem) => isVivotekEquipment(p.modelo, p.descripcion))
            .map((p: VivotekProductItem) => ({
              ...p,
              precioRegularCompra: 0,
              precioProyecto: 0,
              precioUnitario: 0,
              precioTotal: 0,
            }));
          parsed.productos = sanitized;
        }

        const hasLegacyCodes = Array.isArray(parsed.productos) && parsed.productos.some(
          (p: VivotekProductItem) => !p.modelo || p.modelo.startsWith('CCTV-')
        );

        if (parsed.productos && parsed.productos.length > 0 && !hasLegacyCodes) {
          parsed.numRegistro = getUniqueFolio(parsed.numRegistro);
          setFormData(parsed);
          return;
        }
      } catch {
        // silent
      }
    }

    // Auto-llenar desde el proyecto activo por defecto
    const today = new Date().toISOString().split('T')[0];
    const genReg = getUniqueFolio('');

    setFormData((prev) => ({
      ...prev,
      numRegistro: prev.numRegistro ? getUniqueFolio(prev.numRegistro) : genReg,
      nombreProyecto: store.projectName || store.name || '',
      fechaRegistro: prev.fechaRegistro || today,
      empresaUsuarioFinal: store.clientName || '',
      lugarProyecto: store.projectName || '',
      descripcionProyecto: store.notes || `Registro de oportunidad para proyecto ${store.projectName || store.name || ''}`,
      nombreEmpresaIntegrador: store.clientName || '',
      personaRegistraIntegrador: currentUser?.name || store.responsible || '',
      emailIntegrador: currentUser?.email || '',
      responsableIngenieria: store.responsible || currentUser?.name || '',
    }));

    // Ejecutar importación automatizada
    handleImportProducts();
  }, [storageKey, store.projectName, store.name, store.clientName, store.notes, store.responsible, currentUser, handleImportProducts]);

  // Guardar cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch {
      // silent
    }
  }, [formData, storageKey]);

  // Función para forzar el autollenado desde el Proyecto activo
  const handleAutoFill = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({
      ...prev,
      nombreProyecto: store.projectName || store.name || prev.nombreProyecto,
      fechaRegistro: prev.fechaRegistro || today,
      empresaUsuarioFinal: store.clientName || prev.empresaUsuarioFinal,
      lugarProyecto: store.projectName || prev.lugarProyecto,
      descripcionProyecto: store.notes || prev.descripcionProyecto,
      personaRegistraIntegrador: currentUser?.name || store.responsible || prev.personaRegistraIntegrador,
      emailIntegrador: currentUser?.email || prev.emailIntegrador,
      responsableIngenieria: store.responsible || prev.responsableIngenieria,
    }));
    handleImportProducts();
    toast.success('Datos y equipos auto-completados desde la configuración del proyecto');
  }, [store.projectName, store.name, store.clientName, store.notes, store.responsible, currentUser, handleImportProducts]);

  // Agregar producto desde el catálogo/modal
  const handleAddProductFromDialog = (item: VivotekProductItem) => {
    setFormData((prev) => ({
      ...prev,
      productos: [...prev.productos, item],
    }));
  };

  const handleRemoveProduct = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
    toast.info('Fila de producto eliminada');
  };

  const handleOpenEditDialog = (index: number) => {
    setEditingIndex(index);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedProduct = (updatedProduct: VivotekProductItem) => {
    if (editingIndex === null) return;
    setFormData((prev) => {
      const updated = [...prev.productos];
      updated[editingIndex] = updatedProduct;
      return { ...prev, productos: updated };
    });
    toast.success('Producto actualizado correctamente');
  };

  const handleProductChange = (index: number, field: keyof VivotekProductItem, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.productos];
      const item = { ...updated[index], [field]: value };

      // Recalcular Precios
      const qty = Number(item.cantidad) || 0;
      const basePrice = Number(item.precioProyecto) || 0;

      const opt = WARRANTY_OPTIONS.find((w) => w.value === item.extensionGarantia);
      const rate = opt ? opt.rate : 0;

      const unitPrice = basePrice * (1 + rate);
      item.precioUnitario = Math.round(unitPrice * 100) / 100;
      item.precioTotal = Math.round(qty * item.precioUnitario * 100) / 100;

      updated[index] = item;
      return { ...prev, productos: updated };
    });
  };

  // Imprimir / PDF
  const handlePrint = () => {
    window.print();
  };

  // Exportar Excel
  const handleExportExcel = async () => {
    try {
      await exportVivotekFormToExcel(formData);
      toast.success('Archivo Excel de Registro VIVOTEK descargado con éxito');
    } catch {
      toast.error('Ocurrió un error al generar el archivo Excel');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* ── Top Bar / Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-stone-800">Formato de Registro de Proyecto</h2>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                VIVOTEK / TVC 2026
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Registro oficial de oportunidades con protección de margen y garantía extendida
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleAutoFill} className="gap-1.5 text-stone-700 bg-stone-50 hover:bg-stone-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Auto-llenar
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportProducts} className="gap-1.5 text-stone-700 bg-stone-50 hover:bg-stone-100">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Importar Equipos
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-stone-700">
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailDialogOpen(true)}
            className="gap-1.5 text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 font-medium"
          >
            <Mail className="w-4 h-4" />
            E-MAIL
          </Button>
          <Button size="sm" onClick={handleExportExcel} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* ── Número de Registro ──────────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm bg-gradient-to-r from-stone-900 to-stone-800 text-white">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-stone-300 text-xs font-semibold uppercase tracking-wider">Número de Registro</Label>
            <div className="flex items-center gap-2">
              <Input
                value={formData.numRegistro}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, numRegistro: val });
                  if (val.trim()) {
                    getUniqueFolio(val);
                  }
                }}
                placeholder="Ej. REG-VIV-83921"
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-stone-400 font-mono text-lg tracking-wide w-64 focus:bg-white/20"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newFolio = getUniqueFolio('');
                  setFormData({ ...formData, numRegistro: newFolio });
                  toast.success(`Folio único generado: ${newFolio}`);
                }}
                className="text-stone-300 hover:text-white hover:bg-white/10"
                title="Generar nuevo número de folio único sin duplicados"
              >
                Generar Folio
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-stone-300 bg-white/5 px-4 py-3 rounded-xl border border-white/10">
            <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Vigencia Estándar: 30 Días Naturales</p>
              <p className="text-stone-400">Renovable mediante reportes periódicos de avance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 1: Datos del Proyecto ───────────────────────────── */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="bg-stone-50/60 border-b border-stone-100 pb-4">
          <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Datos del Proyecto
          </CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Información general del usuario final y alcance de la oportunidad
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Nombre del proyecto *</Label>
              <Input
                value={formData.nombreProyecto}
                onChange={(e) => setFormData({ ...formData, nombreProyecto: e.target.value })}
                placeholder="Nombre del proyecto"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Fecha de registro *</Label>
              <Input
                type="date"
                value={formData.fechaRegistro}
                onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Empresa del usuario final *</Label>
              <Input
                value={formData.empresaUsuarioFinal}
                onChange={(e) => setFormData({ ...formData, empresaUsuarioFinal: e.target.value })}
                placeholder="Razón social o empresa cliente"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Lugar del proyecto</Label>
              <Input
                value={formData.lugarProyecto}
                onChange={(e) => setFormData({ ...formData, lugarProyecto: e.target.value })}
                placeholder="Ciudad, estado o dirección"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Contacto del usuario final</Label>
              <Input
                value={formData.contactoUsuarioFinal}
                onChange={(e) => setFormData({ ...formData, contactoUsuarioFinal: e.target.value })}
                placeholder="Nombre del contacto principal"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">E-mail</Label>
              <Input
                type="email"
                value={formData.emailUsuarioFinal}
                onChange={(e) => setFormData({ ...formData, emailUsuarioFinal: e.target.value })}
                placeholder="contacto@empresa.com"
                className="h-10"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold text-stone-700">Breve descripción del proyecto</Label>
              <textarea
                value={formData.descripcionProyecto}
                onChange={(e) => setFormData({ ...formData, descripcionProyecto: e.target.value })}
                placeholder="Detalla el número de cámaras, sitios, requerimientos especiales..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">VMS o Integración ofertada</Label>
              <Input
                value={formData.vmsIntegracion}
                onChange={(e) => setFormData({ ...formData, vmsIntegracion: e.target.value })}
                placeholder="Ej. VIVOTEK VAST 2 / Milestone / Genetec"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Competencia</Label>
              <Input
                value={formData.competencia}
                onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                placeholder="Marcas o competidores identificados"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">¿Una sola compra o etapas?</Label>
              <Select value={formData.tipoCompra} onValueChange={(v) => setFormData({ ...formData, tipoCompra: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Una sola compra">Una sola compra</SelectItem>
                  <SelectItem value="Por etapas">Por etapas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Fecha estimada de compra</Label>
              <Input
                type="date"
                value={formData.fechaEstimadaCompra}
                onChange={(e) => setFormData({ ...formData, fechaEstimadaCompra: e.target.value })}
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sección 2 & 3: Integrador y Mayorista ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrador */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="bg-stone-50/60 border-b border-stone-100 pb-4">
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Datos del integrador
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Nombre de la empresa *</Label>
              <Input
                value={formData.nombreEmpresaIntegrador}
                onChange={(e) => setFormData({ ...formData, nombreEmpresaIntegrador: e.target.value })}
                placeholder="Nombre de la empresa integradora"
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Teléfono</Label>
                <Input
                  value={formData.telefonoIntegrador}
                  onChange={(e) => setFormData({ ...formData, telefonoIntegrador: e.target.value })}
                  placeholder="55 0000 0000"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Persona que registra *</Label>
                <Input
                  value={formData.personaRegistraIntegrador}
                  onChange={(e) => setFormData({ ...formData, personaRegistraIntegrador: e.target.value })}
                  placeholder="Nombre de quien registra"
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">E-mail *</Label>
              <Input
                type="email"
                value={formData.emailIntegrador}
                onChange={(e) => setFormData({ ...formData, emailIntegrador: e.target.value })}
                placeholder="integrador@empresa.com"
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Responsable de Ingeniería</Label>
                <Input
                  value={formData.responsableIngenieria}
                  onChange={(e) => setFormData({ ...formData, responsableIngenieria: e.target.value })}
                  placeholder="Ing. a cargo"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700"># de Certificado</Label>
                <Input
                  value={formData.numCertificado}
                  onChange={(e) => setFormData({ ...formData, numCertificado: e.target.value })}
                  placeholder="VCC-XXXXX"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mayorista */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="bg-stone-50/60 border-b border-stone-100 pb-4">
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Datos del Mayorista
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Nombre del mayorista *</Label>
              <Input
                value={formData.nombreMayorista}
                onChange={(e) => setFormData({ ...formData, nombreMayorista: e.target.value })}
                placeholder="Ej. TVC Línea Comercial"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Teléfono mayorista</Label>
              <Input
                value={formData.telefonoMayorista}
                onChange={(e) => setFormData({ ...formData, telefonoMayorista: e.target.value })}
                placeholder="Teléfono de ejecutivo"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Persona que registra en mayorista</Label>
              <Input
                value={formData.personaRegistraMayorista}
                onChange={(e) => setFormData({ ...formData, personaRegistraMayorista: e.target.value })}
                placeholder="Ejecutivo TVC / Mayorista"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-700">E-mail mayorista</Label>
              <Input
                type="email"
                value={formData.emailMayorista}
                onChange={(e) => setFormData({ ...formData, emailMayorista: e.target.value })}
                placeholder="ejecutivo@tvc.mx"
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sección 4: Detalle de Productos / Modelos ───────────────── */}
      <Card className="border-stone-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-stone-50/60 border-b border-stone-100 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Detalle de productos / modelos
            </CardTitle>
            <CardDescription className="text-xs text-stone-500 mt-0.5">
              Lista de equipos VIVOTEK solicitados con extensión de garantía opcional
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            >
              <Plus className="w-4 h-4" /> Agregar Fila
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {formData.productos.length === 0 ? (
            <div className="p-8 text-center bg-stone-50/30">
              <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-700">No hay productos registrados en la lista</p>
              <p className="text-xs text-stone-400 mb-4">Puedes importar las cámaras, NVRs y switches del proyecto o agregarlos desde el catálogo</p>
              <div className="flex justify-center gap-3">
                <Button size="sm" variant="outline" onClick={handleImportProducts} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  Importar Equipos
                </Button>
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-3.5 h-3.5" />
                  + Agregar Fila
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-stone-100/70 text-xs">
                <TableRow>
                  <TableHead className="w-12 font-semibold text-stone-700 text-center">ID</TableHead>
                  <TableHead className="w-36 font-semibold text-stone-700">Modelo</TableHead>
                  <TableHead className="w-80 font-semibold text-stone-700">Descripción</TableHead>
                  <TableHead className="w-28 font-semibold text-stone-700 text-center">Cant.</TableHead>
                  <TableHead className="w-28 font-semibold text-stone-700 text-right">P. Reg. Compra</TableHead>
                  <TableHead className="w-28 font-semibold text-stone-700 text-right">P. Proyecto</TableHead>
                  <TableHead className="w-36 font-semibold text-stone-700">Ext. Garantía</TableHead>
                  <TableHead className="w-28 font-semibold text-stone-700 text-right">P. Unitario</TableHead>
                  <TableHead className="w-32 font-semibold text-stone-700 text-right">P. Total</TableHead>
                  <TableHead className="w-24 font-semibold text-stone-700 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.productos.map((prod, idx) => (
                  <TableRow key={idx} className="hover:bg-stone-50/60 transition-colors">
                    <TableCell className="p-2 text-center font-mono font-semibold text-stone-500 text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={prod.modelo}
                        onChange={(e) => handleProductChange(idx, 'modelo', e.target.value)}
                        placeholder="MD9584-H"
                        className="h-8 text-xs font-semibold"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={prod.descripcion}
                        onChange={(e) => handleProductChange(idx, 'descripcion', e.target.value)}
                        placeholder="Camara IP domo exterior, 5 MP, Lente 3.6mm..."
                        className="h-8 text-xs text-stone-700"
                        title={prod.descripcion}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        min="1"
                        value={prod.cantidad}
                        onChange={(e) => handleProductChange(idx, 'cantidad', Number(e.target.value))}
                        className="h-8 text-xs text-center font-bold"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={prod.precioRegularCompra}
                        onChange={(e) => handleProductChange(idx, 'precioRegularCompra', Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={prod.precioProyecto}
                        onChange={(e) => handleProductChange(idx, 'precioProyecto', Number(e.target.value))}
                        className="h-8 text-xs text-right font-medium text-emerald-700"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select
                        value={prod.extensionGarantia}
                        onValueChange={(v) => handleProductChange(idx, 'extensionGarantia', v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WARRANTY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 text-right font-semibold text-stone-800 text-xs tabular-nums">
                      ${prod.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="p-2 text-right font-bold text-emerald-800 text-xs tabular-nums">
                      ${prod.precioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(idx)}
                          className="h-7 w-7 p-0 text-stone-400 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(idx)}
                          className="h-7 w-7 p-0 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Editar información"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 5: Banner de Vigencia & Referencia de Garantía ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notas importantes sobre vigencia */}
        <Card className="lg:col-span-2 border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700" />
              Notas importantes sobre la vigencia del registro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 text-xs text-stone-700 space-y-3 leading-relaxed">
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">•</span>
              <span>
                Este registro tendrá una vigencia de <strong>30 días naturales</strong>. La extensión del mismo no está ligada al tiempo definido por la fecha de compra. Si la oportunidad necesita tener una vigencia mayor al término indicado deberá de contar con seguimiento y actualizaciones por parte del Integrador dentro del término de los <strong>30 días naturales</strong> indicados.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">•</span>
              <span>
                Se solicita que se reporte el estado que la oportunidad guarda, así como que la misma aún se mantiene activa. Esto producirá una extensión de <strong>30 días naturales adicionales</strong>.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">•</span>
              <span>
                Es responsabilidad del Integrador confirmar que sus reportes de actualización sean recibidos y aplicados al registro.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">•</span>
              <span>
                VIVOTEK informará al término de los <strong>30 días</strong> el vencimiento de este registro, pero no es responsabilidad de VIVOTEK el realizar esta notificación y el que la misma no sea recibida no impedirá que el registro venza al término de los <strong>30 días naturales</strong> si la oportunidad no ha tenido algún seguimiento de parte del integrador.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-700 shrink-0">•</span>
              <span>
                Una vez pasados los <strong>30 días naturales</strong> y que el registro se encuentre vencido, la oportunidad podrá ser inscrita por el mismo integrador o por otro integrador (quien notifique de la oportunidad a VIVOTEK primero).
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Tabla de Referencia de Garantía Extendida */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="bg-stone-50/60 border-b border-stone-100 pb-3">
            <CardTitle className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Extensión de garantía
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="font-semibold text-stone-700">Extensión de garantía</TableHead>
                  <TableHead className="font-semibold text-stone-700 text-right">Porcentaje sobre costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                <TableRow>
                  <TableCell className="font-medium text-stone-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 1 año
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">5% del costo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-stone-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2 años
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">10% del costo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-stone-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3 años
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">15% del costo</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
              <p className="font-semibold mb-0.5">Tip Comercial</p>
              <p>Al seleccionar la extensión de garantía en la tabla de productos, el costo unitario y total se calculan en tiempo real.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Diálogo Agregar Producto */}
      <AddVivotekDeviceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddProduct={handleAddProductFromDialog}
      />

      {/* Modal Diálogo Editar Producto */}
      <EditVivotekDeviceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        product={editingIndex !== null ? formData.productos[editingIndex] : null}
        onSave={handleSaveEditedProduct}
      />

      {/* Modal Diálogo E-MAIL con Outlook */}
      <EmailVivotekDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        formData={formData}
      />
    </div>
  );
}
