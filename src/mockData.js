export const KANBAN_STAGES = [
  { id: 'received', title: 'Recibido / Ingresado', step: 1, color: 'bg-blue-500', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'diagnostic', title: 'Diagnóstico', step: 2, color: 'bg-purple-500', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'in_repair', title: 'En Reparación', step: 3, color: 'bg-amber-500', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'quality_control', title: 'Pruebas de Calidad', step: 4, color: 'bg-indigo-500', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'ready', title: 'Listo / Entregado', step: 5, color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const CATEGORIES = [
  'Audio',
  'Iluminación',
  'Rigging',
  'Video',
  'Energía',
];

export const INSPECTION_ITEMS = [
  'Carcasa/estructura',
  'Lentes/óptica',
  'LED/fuente de luz',
  'Movimiento/motores',
  'Ventiladores/Refrigeración',
  'Display/Controles',
  'Conectores/puertos de DMX',
  'Alimentación eléctrica',
  'Tornilleria/Soportes',
  'Cable de poder/señal',
];

export const ASSET_STATUSES = [
  'Disponible para renta',
  'Disponible para venta de segunda',
  'Disponible para renta y venta',
  'En mantenimiento',
  'En reparación',
  'Fuera de servicio',
  'Pendiente de baja',
];

export const DEFAULT_INSPECTION_CHECKLIST = {
  'Carcasa/estructura': 'Bueno',
  'Lentes/óptica': 'Bueno',
  'LED/fuente de luz': 'Bueno',
  'Movimiento/motores': 'Bueno',
  'Ventiladores/Refrigeración': 'Bueno',
  'Display/Controles': 'Bueno',
  'Conectores/puertos de DMX': 'Bueno',
  'Alimentación eléctrica': 'Bueno',
  'Tornilleria/Soportes': 'Bueno',
  'Cable de poder/señal': 'Bueno',
};

export const parseInspectionChecklist = (rawChecklist) => {
  if (!rawChecklist) return { ...DEFAULT_INSPECTION_CHECKLIST };
  let parsed = rawChecklist;
  if (typeof rawChecklist === 'string') {
    try {
      parsed = JSON.parse(rawChecklist);
    } catch (e) {
      return { ...DEFAULT_INSPECTION_CHECKLIST };
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return { ...DEFAULT_INSPECTION_CHECKLIST, ...parsed };
  }
  return { ...DEFAULT_INSPECTION_CHECKLIST };
};

export const INITIAL_EQUIPMENT = [];

export const INITIAL_LOGS = [];


