/**
 * attendanceCalculations.js
 * Motor central de cálculo de horarios, jornadas, horas extras y balances para Light Pro.
 * Diseñado como funciones puras y deterministas para fácil testeo y auditoría.
 */

export const DEFAULT_SCHEDULES = {
  1: { dayOfWeek: 1, dayName: 'Lunes', isWorkday: true, startTime: '08:00', endTime: '18:00', referenceHours: 9.0, lunchMinutes: 60, minHoursForLunch: 5.0 },
  2: { dayOfWeek: 2, dayName: 'Martes', isWorkday: true, startTime: '08:00', endTime: '18:00', referenceHours: 9.0, lunchMinutes: 60, minHoursForLunch: 5.0 },
  3: { dayOfWeek: 3, dayName: 'Miércoles', isWorkday: true, startTime: '09:00', endTime: '18:00', referenceHours: 9.0, lunchMinutes: 60, minHoursForLunch: 5.0 },
  4: { dayOfWeek: 4, dayName: 'Jueves', isWorkday: true, startTime: '09:00', endTime: '18:00', referenceHours: 9.0, lunchMinutes: 60, minHoursForLunch: 5.0 },
  5: { dayOfWeek: 5, dayName: 'Viernes', isWorkday: true, startTime: '09:00', endTime: '18:00', referenceHours: 9.0, lunchMinutes: 60, minHoursForLunch: 5.0 },
  6: { dayOfWeek: 6, dayName: 'Sábado', isWorkday: false, startTime: null, endTime: null, referenceHours: 0.0, lunchMinutes: 0, minHoursForLunch: 0 },
  0: { dayOfWeek: 0, dayName: 'Domingo', isWorkday: false, startTime: null, endTime: null, referenceHours: 0.0, lunchMinutes: 0, minHoursForLunch: 0 },
};

export const DEFAULT_RATES = {
  daytime_ot_weekday: { code: 'daytime_ot_weekday', name: 'Hora Extra Diurna (L-V)', rate: 8088.0, startTime: '06:00', endTime: '19:00' },
  nighttime_ot_weekday: { code: 'nighttime_ot_weekday', name: 'Hora Extra Nocturna (L-V)', rate: 11323.0, startTime: '19:00', endTime: '06:00' },
  daytime_ot_saturday: { code: 'daytime_ot_saturday', name: 'Hora Extra Diurna Sábado', rate: 8088.0, startTime: '06:00', endTime: '19:00' },
  nighttime_ot_saturday: { code: 'nighttime_ot_saturday', name: 'Hora Extra Nocturna Sábado', rate: 11323.0, startTime: '19:00', endTime: '06:00' },
  daytime_ot_sunday_holiday: { code: 'daytime_ot_sunday_holiday', name: 'Hora Extra Diurna Festivo', rate: 11647.0, startTime: '06:00', endTime: '19:00' },
  nighttime_ot_sunday_holiday: { code: 'nighttime_ot_sunday_holiday', name: 'Hora Extra Nocturna Festivo', rate: 13911.0, startTime: '19:00', endTime: '06:00' },
};

export const COLOMBIAN_HOLIDAYS_SET = new Set([
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
  '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
  '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
  '2026-11-16', '2026-12-08', '2026-12-25',
]);

/**
 * Verifica si una fecha dada en formato YYYY-MM-DD o Date es festivo en Colombia.
 */
export function isHoliday(dateObjOrString, customHolidays) {
  let dateStr = '';
  if (typeof dateObjOrString === 'string') {
    dateStr = dateObjOrString.substring(0, 10);
  } else if (dateObjOrString instanceof Date) {
    const y = dateObjOrString.getFullYear();
    const m = String(dateObjOrString.getMonth() + 1).padStart(2, '0');
    const d = String(dateObjOrString.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }
  if (customHolidays && customHolidays.has) {
    return customHolidays.has(dateStr);
  }
  return COLOMBIAN_HOLIDAYS_SET.has(dateStr);
}

/**
 * Verifica si los minutos de una fecha u hora caen exactamente en intervalos de 30 minutos (:00 o :30).
 */
export function isIntervalValid(dateObj) {
  if (!dateObj) return true;
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const m = d.getMinutes();
  return m === 0 || m === 30;
}

/**
 * Formatea minutos a string legible "Xh Ym" o "X.Xh"
 */
export function formatMinutes(minutes, style = 'detailed') {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0h';
  const isNegative = minutes < 0;
  const absMin = Math.abs(Math.round(minutes));
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;

  if (style === 'decimal') {
    const dec = (absMin / 60).toFixed(1);
    return `${isNegative ? '-' : ''}${dec}h`;
  }

  if (m === 0) return `${isNegative ? '-' : ''}${h}h`;
  return `${isNegative ? '-' : ''}${h}h ${m}m`;
}

/**
 * Formato de moneda colombiana COP
 */
export function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Divide un lapso de tiempo (en minutos) entre el corte de franja diurna (06:00 - 19:00) y nocturna (19:00 - 06:00).
 * Retorna { dayMinutes, nightMinutes }.
 */
export function splitDayNightMinutes(startInstant, endInstant) {
  let dayMinutes = 0;
  let nightMinutes = 0;

  let current = new Date(startInstant);
  const end = new Date(endInstant);

  // Iterar minuto a minuto o en bloques para máxima precisión
  while (current < end) {
    const hours = current.getHours();
    // Diurno: 06:00 a 18:59 (hasta las 7:00 p.m.)
    // Nocturno: 19:00 a 05:59 (de 7:00 p.m. a 6:00 a.m.)
    if (hours >= 6 && hours < 19) {
      dayMinutes++;
    } else {
      nightMinutes++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }

  return { dayMinutes, nightMinutes };
}

/**
 * Motor de Cálculo Principal por Registro
 */
export function calculateAttendanceMetrics({
  checkInTime,
  checkOutTime,
  schedules = DEFAULT_SCHEDULES,
  rates = DEFAULT_RATES,
  customHolidays = COLOMBIAN_HOLIDAYS_SET,
  priorDeficitMinutes = 0,
}) {
  if (!checkInTime) {
    return {
      status: 'pending',
      grossMinutes: 0,
      lunchBreakMinutes: 0,
      effectiveMinutes: 0,
      referenceMinutes: 0,
      balanceMinutes: 0,
      compensatedMinutes: 0,
      extraDaytimeMinutes: 0,
      extraNighttimeMinutes: 0,
      extraSundayHolidayDayMinutes: 0,
      extraSundayHolidayNightMinutes: 0,
      totalExtraMinutes: 0,
      extraMoneyAmount: 0,
      hasOddMinutes: false,
      reviewStatus: 'normal',
    };
  }

  const inDate = new Date(checkInTime);
  const outDate = checkOutTime ? new Date(checkOutTime) : null;

  // 1. Detección de minutos fuera de la regla :00 y :30
  const inOdd = !isIntervalValid(inDate);
  const outOdd = outDate ? !isIntervalValid(outDate) : false;
  const hasOddMinutes = inOdd || outOdd;
  let reviewStatus = hasOddMinutes ? 'pending_review' : 'normal';

  if (!outDate) {
    return {
      status: 'open',
      grossMinutes: 0,
      lunchBreakMinutes: 0,
      effectiveMinutes: 0,
      referenceMinutes: 540,
      balanceMinutes: 0,
      compensatedMinutes: 0,
      extraDaytimeMinutes: 0,
      extraNighttimeMinutes: 0,
      extraSundayHolidayDayMinutes: 0,
      extraSundayHolidayNightMinutes: 0,
      totalExtraMinutes: 0,
      extraMoneyAmount: 0,
      hasOddMinutes,
      reviewStatus,
    };
  }

  // 2. Cálculo de permanencia bruta
  const grossDiffMs = Math.max(0, outDate.getTime() - inDate.getTime());
  const grossMinutes = Math.floor(grossDiffMs / (1000 * 60));

  // 3. Obtener configuración del día
  const dayOfWeek = inDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const isDateHoliday = isHoliday(inDate, customHolidays);
  const dayConfig = schedules[dayOfWeek] || DEFAULT_SCHEDULES[dayOfWeek];

  // Regla de jornada ordinaria de referencia
  const referenceMinutes = dayConfig.isWorkday && !isDateHoliday
    ? Math.round((dayConfig.referenceHours || 9.0) * 60)
    : 0;

  // 4. Regla de Almuerzo acordada:
  // "Descuento automático de 1 hora de almuerzo no laborada si la permanencia supera las 5 horas (300 minutos)"
  let lunchBreakMinutes = 0;
  if (dayConfig.isWorkday && !isDateHoliday) {
    if (grossMinutes >= 300) {
      lunchBreakMinutes = dayConfig.lunchMinutes || 60;
    }
  }

  const effectiveMinutes = Math.max(0, grossMinutes - lunchBreakMinutes);
  const balanceMinutes = effectiveMinutes - referenceMinutes;

  // 5. Cálculo de Horas Extras y Fraccionamiento Diurno / Nocturno
  let extraDaytimeMinutes = 0;
  let extraNighttimeMinutes = 0;
  let extraSundayHolidayDayMinutes = 0;
  let extraSundayHolidayNightMinutes = 0;

  if (isDateHoliday || dayOfWeek === 0) {
    // Domingo o Festivo: Todo el tiempo efectivo es extra dominical/festiva
    const { dayMinutes, nightMinutes } = splitDayNightMinutes(inDate, outDate);
    // Proporcional al tiempo efectivo si hubo descuento
    const ratio = grossMinutes > 0 ? effectiveMinutes / grossMinutes : 1;
    extraSundayHolidayDayMinutes = Math.round(dayMinutes * ratio);
    extraSundayHolidayNightMinutes = Math.round(nightMinutes * ratio);
  } else if (dayOfWeek === 6) {
    // Sábado: Todo el tiempo efectivo es extra de sábado (no hay jornada ordinaria fija)
    const { dayMinutes, nightMinutes } = splitDayNightMinutes(inDate, outDate);
    const ratio = grossMinutes > 0 ? effectiveMinutes / grossMinutes : 1;
    extraDaytimeMinutes = Math.round(dayMinutes * ratio);
    extraNighttimeMinutes = Math.round(nightMinutes * ratio);
  } else {
    // Lunes a Viernes: Si excede los referenceMinutes (ej. 540 min = 9h)
    if (balanceMinutes > 0) {
      // El exceso de tiempo ocurrió hacia el final de la jornada
      // Calculamos la franja de los minutos finales que corresponden a las extras
      const extraStart = new Date(inDate.getTime() + (referenceMinutes + lunchBreakMinutes) * 60 * 1000);
      if (extraStart < outDate) {
        const { dayMinutes, nightMinutes } = splitDayNightMinutes(extraStart, outDate);
        extraDaytimeMinutes = dayMinutes;
        extraNighttimeMinutes = nightMinutes;
      } else {
        extraDaytimeMinutes = balanceMinutes;
      }
    }
  }

  const totalExtraMinutes = extraDaytimeMinutes + extraNighttimeMinutes + extraSundayHolidayDayMinutes + extraSundayHolidayNightMinutes;

  // 6. Regla de Compensación Automática de Déficit Previo Acordada:
  // "Las horas extras primero saldan las horas negativas pendientes y solo el excedente genera pago económico"
  let compensatedMinutes = 0;
  let payableExtraDayMinutes = extraDaytimeMinutes;
  let payableExtraNightMinutes = extraNighttimeMinutes;
  let payableSundayDayMinutes = extraSundayHolidayDayMinutes;
  let payableSundayNightMinutes = extraSundayHolidayNightMinutes;

  if (priorDeficitMinutes > 0 && totalExtraMinutes > 0) {
    // Déficit acumulado a cubrir
    let deficitToClear = priorDeficitMinutes;

    // Se descuenta primero de extras diurnas (menor valor)
    if (payableExtraDayMinutes > 0) {
      const take = Math.min(payableExtraDayMinutes, deficitToClear);
      compensatedMinutes += take;
      payableExtraDayMinutes -= take;
      deficitToClear -= take;
    }

    if (deficitToClear > 0 && payableSundayDayMinutes > 0) {
      const take = Math.min(payableSundayDayMinutes, deficitToClear);
      compensatedMinutes += take;
      payableSundayDayMinutes -= take;
      deficitToClear -= take;
    }

    if (deficitToClear > 0 && payableExtraNightMinutes > 0) {
      const take = Math.min(payableExtraNightMinutes, deficitToClear);
      compensatedMinutes += take;
      payableExtraNightMinutes -= take;
      deficitToClear -= take;
    }

    if (deficitToClear > 0 && payableSundayNightMinutes > 0) {
      const take = Math.min(payableSundayNightMinutes, deficitToClear);
      compensatedMinutes += take;
      payableSundayNightMinutes -= take;
      deficitToClear -= take;
    }
  }

  // 7. Liquidación Económica con Tarifas Vigentes
  const rateWeekdayDay = rates.daytime_ot_weekday?.rate || 8088.0;
  const rateWeekdayNight = rates.nighttime_ot_weekday?.rate || 11323.0;
  const rateSaturdayDay = rates.daytime_ot_saturday?.rate || 8088.0;
  const rateSaturdayNight = rates.nighttime_ot_saturday?.rate || 11323.0;
  const rateSundayDay = rates.daytime_ot_sunday_holiday?.rate || 11647.0;
  const rateSundayNight = rates.nighttime_ot_sunday_holiday?.rate || 13911.0;

  let extraMoneyAmount = 0;
  if (isDateHoliday || dayOfWeek === 0) {
    extraMoneyAmount += (payableSundayDayMinutes / 60) * rateSundayDay;
    extraMoneyAmount += (payableSundayNightMinutes / 60) * rateSundayNight;
  } else if (dayOfWeek === 6) {
    extraMoneyAmount += (payableExtraDayMinutes / 60) * rateSaturdayDay;
    extraMoneyAmount += (payableExtraNightMinutes / 60) * rateSaturdayNight;
  } else {
    extraMoneyAmount += (payableExtraDayMinutes / 60) * rateWeekdayDay;
    extraMoneyAmount += (payableExtraNightMinutes / 60) * rateWeekdayNight;
  }

  return {
    status: 'completed',
    grossMinutes,
    lunchBreakMinutes,
    effectiveMinutes,
    referenceMinutes,
    balanceMinutes,
    compensatedMinutes,
    extraDaytimeMinutes,
    extraNighttimeMinutes,
    extraSundayHolidayDayMinutes,
    extraSundayHolidayNightMinutes,
    totalExtraMinutes,
    payableExtraDayMinutes,
    payableExtraNightMinutes,
    payableSundayDayMinutes,
    payableSundayNightMinutes,
    extraMoneyAmount: Math.round(extraMoneyAmount),
    hasOddMinutes,
    reviewStatus,
  };
}

export const DEFAULT_SEDE_CONFIG = {
  name: 'Sede Light Pro',
  latitude: 4.6760, // Bogotá default reference
  longitude: -74.0480,
  radiusMeters: 200, // 200 metros
};

/**
 * Calcula la distancia exacta en metros entre dos coordenadas geográficas (Fórmula de Haversine).
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return Infinity;
  }
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Determina el texto de ubicación: "Sede Light Pro" si está dentro del radio de 200m,
 * o la dirección obtenida mediante geocodificación inversa gratuita.
 */
export async function resolveLocationText(coords, sedeConfig = DEFAULT_SEDE_CONFIG) {
  if (!coords || coords.lat === undefined || coords.lng === undefined) {
    return 'Ubicación no disponible';
  }

  const { lat, lng } = coords;
  const dist = calculateDistanceMeters(lat, lng, sedeConfig.latitude, sedeConfig.longitude);

  if (dist <= (sedeConfig.radiusMeters || 200)) {
    return 'Sede Light Pro';
  }

  // Si está a más de 200m, intentamos geocodificación inversa gratuita con OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'es' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.suburb || '';
        const houseNumber = addr.house_number ? ` #${addr.house_number}` : '';
        const neighbourhood = addr.neighbourhood || addr.suburb || '';
        const city = addr.city || addr.town || addr.municipality || '';

        const parts = [
          road ? `${road}${houseNumber}` : '',
          neighbourhood && neighbourhood !== road ? neighbourhood : '',
          city,
        ].filter(Boolean);

        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(',').trim();
        }
      }
    }
  } catch (e) {
    console.warn('Geocodificación inversa fallback a coordenadas:', e);
  }

  return `Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

