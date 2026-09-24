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

export const INITIAL_EQUIPMENT = [
  {
    id: 'EQ-8092',
    name: 'Meyer Sound LEOPARD Linear Line Array',
    category: 'Audio',
    serialNumber: 'MS-LEO-99481',
    ownerName: 'Producciones Eventos Global S.A.',
    ownerPhone: '+57 310 456 7890',
    ownerEmail: 'contacto@eventosglobal.co',
    issue: 'Bajo rendimiento en bajas frecuencias y posible daño en cono de graves tras concierto al aire libre.',
    priority: 'Urgente',
    status: 'in_repair',
    createdAt: '2026-09-18T10:30:00Z',
    technicianAssigned: 'Carlos Mendoza',
    notes: [
      { id: 1, author: 'Carlos Mendoza', role: 'Técnico', text: 'Se realizó desarme inicial. Cono de woofer derecho presenta fisura en la suspensión.', date: '2026-09-19T14:20:00Z' },
      { id: 2, author: 'Sistema Admin', role: 'Sistema', text: 'Cambiado de Diagnóstico a En Reparación.', date: '2026-09-19T14:21:00Z' }
    ],
    history: [
      { stage: 'received', timestamp: '2026-09-18T10:30:00Z', updatedBy: 'Recepción' },
      { stage: 'diagnostic', timestamp: '2026-09-19T09:00:00Z', updatedBy: 'Carlos Mendoza' },
      { stage: 'in_repair', timestamp: '2026-09-19T14:21:00Z', updatedBy: 'Carlos Mendoza' }
    ]
  },
  {
    id: 'EQ-7412',
    name: 'Claypaky Sharpy Plus Moving Head',
    category: 'Iluminación',
    serialNumber: 'CP-SHP-33102',
    ownerName: 'Lighting Crew Festival Hub',
    ownerPhone: '+57 315 888 2211',
    ownerEmail: 'soporte@lightingcrew.com',
    issue: 'Error DMX de recalibración pan/tilt. Ruidos anormales al girar a alta velocidad.',
    priority: 'Media',
    status: 'diagnostic',
    createdAt: '2026-09-20T11:15:00Z',
    technicianAssigned: 'David Ruiz',
    notes: [
      { id: 1, author: 'David Ruiz', role: 'Técnico', text: 'Limpieza de sensores ópticos y lubricación de poleas requerida.', date: '2026-09-21T08:45:00Z' }
    ],
    history: [
      { stage: 'received', timestamp: '2026-09-20T11:15:00Z', updatedBy: 'Recepción' },
      { stage: 'diagnostic', timestamp: '2026-09-21T08:45:00Z', updatedBy: 'David Ruiz' }
    ]
  },
  {
    id: 'EQ-9104',
    name: 'ROE Visual Black Pearl BP2V2 LED Panel',
    category: 'Video',
    serialNumber: 'ROE-BP2-00412',
    ownerName: 'Visual Stage Masters',
    ownerPhone: '+57 300 123 4455',
    ownerEmail: 'logistica@stage-masters.io',
    issue: 'Módulo de esquina derecha presenta píxeles muertos (RGB en verde permanente).',
    priority: 'Urgente',
    status: 'received',
    createdAt: '2026-09-21T16:00:00Z',
    technicianAssigned: 'Carlos Mendoza',
    notes: [],
    history: [
      { stage: 'received', timestamp: '2026-09-21T16:00:00Z', updatedBy: 'Recepción' }
    ]
  },
  {
    id: 'EQ-3351',
    name: 'CM Lodestar 1-Ton Electric Chain Hoist',
    category: 'Rigging',
    serialNumber: 'CM-LDS-55419',
    ownerName: 'Rigging Solutions LATAM',
    ownerPhone: '+57 320 777 9900',
    ownerEmail: 'mantenimiento@riggingsolutions.com',
    issue: 'Mantenimiento preventivo de 500 horas. Inspección de freno electromagnético y cadena.',
    priority: 'Baja',
    status: 'quality_control',
    createdAt: '2026-09-15T08:00:00Z',
    technicianAssigned: 'Andrés Gómez',
    notes: [
      { id: 1, author: 'Andrés Gómez', role: 'Técnico', text: 'Prueba de carga al 125% completada satisfactoriamente sin deslizamiento.', date: '2026-09-21T15:10:00Z' }
    ],
    history: [
      { stage: 'received', timestamp: '2026-09-15T08:00:00Z', updatedBy: 'Recepción' },
      { stage: 'diagnostic', timestamp: '2026-09-16T10:00:00Z', updatedBy: 'Andrés Gómez' },
      { stage: 'in_repair', timestamp: '2026-09-17T11:00:00Z', updatedBy: 'Andrés Gómez' },
      { stage: 'quality_control', timestamp: '2026-09-21T15:10:00Z', updatedBy: 'Andrés Gómez' }
    ]
  },
  {
    id: 'EQ-6020',
    name: 'Powersoft X8 Heavy Duty Power Amplifier',
    category: 'Energía',
    serialNumber: 'PS-X8-88190',
    ownerName: 'AudioPro Rental & Concerts',
    ownerPhone: '+57 311 999 3344',
    ownerEmail: 'rentals@audiopro.co',
    issue: 'Protección térmica activada a mitad del show. Ventilador secundario bloqueado.',
    priority: 'Media',
    status: 'ready',
    createdAt: '2026-09-12T09:30:00Z',
    technicianAssigned: 'Carlos Mendoza',
    notes: [
      { id: 1, author: 'Carlos Mendoza', role: 'Técnico', text: 'Reemplazado cooler sin escobillas y pasta térmica de transistores de salida.', date: '2026-09-18T16:30:00Z' }
    ],
    history: [
      { stage: 'received', timestamp: '2026-09-12T09:30:00Z', updatedBy: 'Recepción' },
      { stage: 'diagnostic', timestamp: '2026-09-13T10:00:00Z', updatedBy: 'Carlos Mendoza' },
      { stage: 'in_repair', timestamp: '2026-09-14T14:00:00Z', updatedBy: 'Carlos Mendoza' },
      { stage: 'quality_control', timestamp: '2026-09-17T09:00:00Z', updatedBy: 'Carlos Mendoza' },
      { stage: 'ready', timestamp: '2026-09-18T16:30:00Z', updatedBy: 'Carlos Mendoza' }
    ]
  },
  {
    id: 'EQ-1044',
    name: 'MA Lighting grandMA3 Light Console',
    category: 'Iluminación',
    serialNumber: 'MA3-LGT-77112',
    ownerName: 'ShowTech Productions',
    ownerPhone: '+57 314 555 1212',
    ownerEmail: 'info@showtech.com',
    issue: 'Fader motorizado #4 descalibrado y pantalla táctil derecha no responde al touch.',
    priority: 'Urgente',
    status: 'received',
    createdAt: '2026-09-22T08:00:00Z',
    technicianAssigned: 'David Ruiz',
    notes: [],
    history: [
      { stage: 'received', timestamp: '2026-09-22T08:00:00Z', updatedBy: 'Recepción' }
    ]
  }
];

export const INITIAL_LOGS = [
  { id: 'LOG-101', timestamp: '2026-09-22T08:00:00Z', user: 'Usuario Administrador', role: 'Administrador', action: 'Equipo Registrado', detail: 'Se ingresó el equipo MA Lighting grandMA3 Light Console (EQ-1044)' },
  { id: 'LOG-102', timestamp: '2026-09-21T16:00:00Z', user: 'Cliente Visual Stage', role: 'Cliente', action: 'Equipo Registrado', detail: 'Ingresó ROE Visual Black Pearl BP2V2 LED Panel (EQ-9104)' },
  { id: 'LOG-103', timestamp: '2026-09-21T15:10:00Z', user: 'Andrés Gómez', role: 'Técnico', action: 'Cambio de Estado', detail: 'CM Lodestar 1-Ton Electric Chain Hoist movido a Pruebas de Calidad' },
  { id: 'LOG-104', timestamp: '2026-09-19T14:21:00Z', user: 'Carlos Mendoza', role: 'Técnico', action: 'Cambio de Estado', detail: 'Meyer Sound LEOPARD (EQ-8092) movido a En Reparación' },
];
