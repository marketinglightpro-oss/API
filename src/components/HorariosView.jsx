import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  Camera,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  Search,
  X,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  MapPin,
  Navigation,
  ExternalLink,
  Edit3,
  Loader2,
  RefreshCw
} from 'lucide-react';
import LiveCameraModal from './LiveCameraModal';
import {
  calculateAttendanceMetrics,
  formatMinutes,
  formatCOP,
  DEFAULT_SCHEDULES,
  DEFAULT_RATES,
  DEFAULT_SEDE_CONFIG,
  resolveLocationText,
  calculateDistanceMeters,
} from '../utils/attendanceCalculations';
import { supabase, isSupabaseConfigured, uploadImageToSupabaseStorage } from '../supabaseClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function HorariosView({ currentUser, currentRole, teamMembers = [] }) {
  const isAdmin = currentRole === 'super_admin' || currentRole === 'admin';

  // Subtab navigation: 'personal' | 'admin' | 'config'
  const [activeSubTab, setActiveSubTab] = useState(isAdmin ? 'admin' : 'personal');

  // Attendance Records State - Clean without hardcoded mock records
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('lightpro_attendance_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Discard any old mock test records that start with 'rec-00'
        return parsed.filter(r => !r.id?.startsWith('rec-00'));
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Schedules and Rates Configurations State
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem('lightpro_schedules_config');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULES;
  });

  const [rates, setRates] = useState(() => {
    const saved = localStorage.getItem('lightpro_rates_config');
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });

  // Sede Coordinates & Geofence Radius Configuration
  const [sedeConfig, setSedeConfig] = useState(() => {
    const saved = localStorage.getItem('lightpro_sede_config');
    return saved ? JSON.parse(saved) : DEFAULT_SEDE_CONFIG;
  });

  // Modals & Camera State
  const [cameraModalConfig, setCameraModalConfig] = useState({ isOpen: false, mode: 'in' });
  const [photoPreviewModal, setPhotoPreviewModal] = useState({ isOpen: false, url: '', title: '' });
  const [adjustmentModal, setAdjustmentModal] = useState({ isOpen: false, record: null, reason: '', inTime: '', outTime: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter States for Admin Dashboard
  const [filterUser, setFilterUser] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all'); // 'today' | 'week' | 'month' | 'all'
  const [filterReviewStatus, setFilterReviewStatus] = useState('all'); // 'all' | 'pending_review' | 'with_overtime' | 'open'
  const [searchTerm, setSearchTerm] = useState('');

  // Shift Timer for personal view
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('lightpro_attendance_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('lightpro_schedules_config', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('lightpro_rates_config', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('lightpro_sede_config', JSON.stringify(sedeConfig));
  }, [sedeConfig]);

  // Fetch latest attendance records from Supabase
  const fetchSupabaseAttendance = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncing(true);
    try {
      const { data: dbRecords, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (!error && dbRecords) {
        setRecords(dbRecords);
      } else if (error) {
        console.warn('Error al consultar attendance_records:', error);
      }

      const { data: dbSchedules } = await supabase.from('schedules_config').select('*');
      if (dbSchedules && dbSchedules.length > 0) {
        const map = {};
        dbSchedules.forEach(s => {
          map[s.day_of_week] = {
            dayOfWeek: s.day_of_week,
            dayName: s.day_name,
            isWorkday: s.is_workday,
            startTime: s.start_time?.substring(0, 5) || '08:00',
            endTime: s.end_time?.substring(0, 5) || '18:00',
            referenceHours: Number(s.reference_hours) || 9.0,
            lunchMinutes: s.lunch_break_minutes || 60,
            minHoursForLunch: Number(s.min_hours_for_lunch) || 5.0,
          };
        });
        setSchedules(map);
      }

      const { data: dbRates } = await supabase.from('overtime_rates_config').select('*');
      if (dbRates && dbRates.length > 0) {
        const map = {};
        dbRates.forEach(r => {
          map[r.rate_code] = {
            code: r.rate_code,
            name: r.description,
            rate: Number(r.hourly_rate),
            startTime: r.start_time?.substring(0, 5) || '06:00',
            endTime: r.end_time?.substring(0, 5) || '19:00',
          };
        });
        setRates(map);
      }
    } catch (err) {
      console.warn('Nota de sincronización Supabase Horarios:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync on Mount
  useEffect(() => {
    fetchSupabaseAttendance();
  }, []);

  // Realtime WebSocket Subscription for Live Cross-Device Sync (PC <-> Celular)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('attendance_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRecords(prev => {
              if (prev.some(r => r.id === payload.new.id)) {
                return prev.map(r => r.id === payload.new.id ? payload.new : r);
              }
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setRecords(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          } else if (payload.eventType === 'DELETE') {
            setRecords(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Match records belonging to current user by user_id or email
  const isRecordOfUser = (r) => {
    if (!currentUser) return false;
    const matchId = currentUser.id && r.user_id === currentUser.id;
    const matchEmail = currentUser.email && r.user_email && r.user_email.toLowerCase() === currentUser.email.toLowerCase();
    return Boolean(matchId || matchEmail);
  };

  // Find active personal record (open shift for current user)
  const activePersonalRecord = useMemo(() => {
    return records.find(r => isRecordOfUser(r) && r.status === 'open');
  }, [records, currentUser]);

  // Live timer for active shift
  useEffect(() => {
    if (!activePersonalRecord?.check_in_time) {
      setElapsedSeconds(0);
      return;
    }

    const inTime = new Date(activePersonalRecord.check_in_time).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - inTime) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePersonalRecord]);

  // Format timer
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // User's own records (filtered strictly for privacy)
  const myRecords = useMemo(() => {
    return records.filter(r => isRecordOfUser(r));
  }, [records, currentUser]);

  // Compute personal balance metrics
  const myMetrics = useMemo(() => {
    let totalMinutesWorked = 0;
    let netBalanceMinutes = 0;
    let totalExtraMinutes = 0;
    let totalExtraMoney = 0;
    let todayMinutesWorked = 0;

    const todayStr = new Date().toISOString().substring(0, 10);

    myRecords.forEach(r => {
      if (r.status === 'completed' || r.status === 'adjusted') {
        totalMinutesWorked += (r.effective_minutes || 0);
        netBalanceMinutes += (r.balance_minutes || 0);
        totalExtraMinutes += (
          (r.extra_daytime_minutes || 0) +
          (r.extra_nighttime_minutes || 0) +
          (r.extra_sunday_holiday_day_minutes || 0) +
          (r.extra_sunday_holiday_night_minutes || 0)
        );
        totalExtraMoney += (r.extra_money_amount || 0);

        if (r.work_date === todayStr) {
          todayMinutesWorked += (r.effective_minutes || 0);
        }
      }
    });

    return {
      totalMinutesWorked,
      netBalanceMinutes,
      totalExtraMinutes,
      totalExtraMoney,
      todayMinutesWorked,
    };
  }, [myRecords]);

  // Geolocation Helpers
  const getCurrentDeviceLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('GPS location request warning:', err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    });
  };

  const handleSetCurrentLocationAsSede = async () => {
    const coords = await getCurrentDeviceLocation();
    if (!coords) {
      alert('No se pudo obtener la ubicación GPS actual. Verifica que los permisos de ubicación estén habilitados en tu navegador.');
      return;
    }
    setSedeConfig(prev => ({
      ...prev,
      latitude: parseFloat(coords.lat.toFixed(6)),
      longitude: parseFloat(coords.lng.toFixed(6)),
    }));
    alert(`Ubicación de la sede fijada exitosamente a:\nLatitud: ${coords.lat.toFixed(6)}\nLongitud: ${coords.lng.toFixed(6)}\nRadio: ${sedeConfig.radiusMeters || 200} metros`);
  };

  // Photo & GPS Registration Handler
  const handlePhotoCaptured = async (photoBase64) => {
    const mode = cameraModalConfig.mode; // 'in' or 'out'
    const nowIso = new Date().toISOString();
    setIsRegistering(true);

    try {
      // 0. Ensure we have the valid Supabase Auth User ID (UUID)
      let resolvedUserId = currentUser?.id;
      let resolvedEmail = currentUser?.email || '';
      let resolvedName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Colaborador';

      if (!resolvedUserId && isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            resolvedUserId = authData.user.id;
            resolvedEmail = authData.user.email || resolvedEmail;
            resolvedName = authData.user.user_metadata?.full_name || resolvedEmail.split('@')[0] || resolvedName;
          }
        } catch (authErr) {
          console.warn('Error resolviendo usuario auth:', authErr);
        }
      }

      if (!resolvedUserId) {
        alert('No se detectó una sesión activa en el sistema. Por favor recarga la página o inicia sesión nuevamente.');
        setIsRegistering(false);
        return;
      }

      // 1. Get GPS coordinates & location string (200m rule vs. street address)
      const coords = await getCurrentDeviceLocation();
      const locationText = await resolveLocationText(coords, sedeConfig);

      // 2. Upload compressed photo to Supabase Storage (with base64 fallback)
      let remotePhotoUrl = photoBase64;
      try {
        const uploaded = await uploadImageToSupabaseStorage(photoBase64, `attendance-${mode}`);
        if (uploaded) remotePhotoUrl = uploaded;
      } catch (e) {
        console.warn('Storage upload fallback to base64:', e);
      }

      if (mode === 'in') {
        // Check In (Generate standard UUID v4 accepted by PostgreSQL UUID column)
        const newRecId = generateUUID();
        const newRec = {
          id: newRecId,
          user_id: resolvedUserId,
          user_name: resolvedName,
          user_email: resolvedEmail,
          work_date: nowIso.substring(0, 10),
          check_in_time: nowIso,
          check_in_photo_url: remotePhotoUrl,
          check_in_location: locationText,
          check_in_lat: coords?.lat || null,
          check_in_lng: coords?.lng || null,
          check_out_time: null,
          check_out_photo_url: null,
          check_out_location: null,
          check_out_lat: null,
          check_out_lng: null,
          status: 'open',
          gross_minutes: 0,
          lunch_break_minutes: 0,
          effective_minutes: 0,
          reference_minutes: 540,
          balance_minutes: 0,
          compensated_minutes: 0,
          extra_daytime_minutes: 0,
          extra_nighttime_minutes: 0,
          extra_sunday_holiday_day_minutes: 0,
          extra_sunday_holiday_night_minutes: 0,
          extra_money_amount: 0,
          review_status: 'normal',
          review_notes: '',
          created_at: nowIso,
        };

        setRecords(prev => [newRec, ...prev]);

        if (isSupabaseConfigured && supabase) {
          const { error: insertErr } = await supabase.from('attendance_records').insert([newRec]);
          if (insertErr) {
            console.error('Error insertando registro en Supabase:', insertErr);
            alert(`Atención: El registro se guardó temporalmente en memoria pero falló la sincronización con la base de datos de Supabase:\n\n${insertErr.message}`);
          } else {
            console.log('✅ Marcación de entrada sincronizada exitosamente en Supabase:', newRecId);
          }
        }
      } else if (mode === 'out' && activePersonalRecord) {
        // Check Out
        const priorDeficitMinutes = myRecords
          .filter(r => r.id !== activePersonalRecord.id && (r.balance_minutes || 0) < 0)
          .reduce((sum, r) => sum + Math.abs(r.balance_minutes), 0);

        const calculated = calculateAttendanceMetrics({
          checkInTime: activePersonalRecord.check_in_time,
          checkOutTime: nowIso,
          schedules,
          rates,
          priorDeficitMinutes,
        });

        const updatedRecord = {
          ...activePersonalRecord,
          check_out_time: nowIso,
          check_out_photo_url: remotePhotoUrl,
          check_out_location: locationText,
          check_out_lat: coords?.lat || null,
          check_out_lng: coords?.lng || null,
          status: 'completed',
          gross_minutes: calculated.grossMinutes,
          lunch_break_minutes: calculated.lunchBreakMinutes,
          effective_minutes: calculated.effectiveMinutes,
          reference_minutes: calculated.referenceMinutes,
          balance_minutes: calculated.balanceMinutes,
          compensated_minutes: calculated.compensatedMinutes,
          extra_daytime_minutes: calculated.extraDaytimeMinutes,
          extra_nighttime_minutes: calculated.extraNighttimeMinutes,
          extra_sunday_holiday_day_minutes: calculated.extraSundayHolidayDayMinutes,
          extra_sunday_holiday_night_minutes: calculated.extraSundayHolidayNightMinutes,
          extra_money_amount: calculated.extraMoneyAmount,
          review_status: calculated.reviewStatus,
          review_notes: calculated.hasOddMinutes
            ? 'Minutos impares fuera de intervalos :00 / :30. Pendiente de validación.'
            : '',
          updated_at: nowIso,
        };

        setRecords(prev => prev.map(r => r.id === activePersonalRecord.id ? updatedRecord : r));

        if (isSupabaseConfigured && supabase) {
          const { error: updErr } = await supabase
            .from('attendance_records')
            .update(updatedRecord)
            .eq('id', activePersonalRecord.id);
          if (updErr) {
            console.error('Error actualizando salida en Supabase:', updErr);
            alert(`Atención: La salida se guardó temporalmente pero falló la sincronización con Supabase:\n\n${updErr.message}`);
          } else {
            console.log('✅ Marcación de salida sincronizada exitosamente en Supabase:', activePersonalRecord.id);
          }
        }
      }
    } catch (err) {
      console.error('Error al registrar:', err);
      alert('Error en el registro: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsRegistering(false);
    }
  };

  // Admin: Approve review record
  const handleApproveRecord = async (recordId) => {
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          review_status: 'approved',
          review_notes: (r.review_notes ? r.review_notes + ' | ' : '') + 'Aprobado formalmente por Administración.',
        };
      }
      return r;
    }));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('attendance_records')
          .update({
            review_status: 'approved',
            review_notes: 'Aprobado formalmente por Administración.',
          })
          .eq('id', recordId);
      } catch (err) {
        console.warn('Supabase approve notice:', err);
      }
    }
  };

  // Admin: Save Manual Adjustment
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    const { record, inTime, outTime, reason } = adjustmentModal;
    if (!record || !reason.trim()) {
      alert('La justificación o motivo del ajuste es obligatoria.');
      return;
    }

    const calculated = calculateAttendanceMetrics({
      checkInTime: inTime,
      checkOutTime: outTime,
      schedules,
      rates,
    });

    const updated = {
      ...record,
      check_in_time: inTime,
      check_out_time: outTime,
      status: 'adjusted',
      gross_minutes: calculated.grossMinutes,
      lunch_break_minutes: calculated.lunchBreakMinutes,
      effective_minutes: calculated.effectiveMinutes,
      reference_minutes: calculated.referenceMinutes,
      balance_minutes: calculated.balanceMinutes,
      extra_daytime_minutes: calculated.extraDaytimeMinutes,
      extra_nighttime_minutes: calculated.extraNighttimeMinutes,
      extra_money_amount: calculated.extraMoneyAmount,
      review_status: 'approved',
      review_notes: `Ajuste manual aplicado: "${reason}".`,
      updated_at: new Date().toISOString(),
    };

    setRecords(prev => prev.map(r => r.id === record.id ? updated : r));
    setAdjustmentModal({ isOpen: false, record: null, reason: '', inTime: '', outTime: '' });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('attendance_records').update(updated).eq('id', record.id);
        await supabase.from('attendance_corrections_log').insert([{
          record_id: record.id,
          adjusted_by_id: currentUser?.id,
          adjusted_by_name: currentUser?.user_metadata?.full_name || currentUser?.email || 'Administrador',
          field_name: 'hours_adjustment',
          old_value: `In: ${record.check_in_time} | Out: ${record.check_out_time}`,
          new_value: `In: ${inTime} | Out: ${outTime}`,
          reason: reason,
        }]);
      } catch (err) {
        console.warn('Supabase adjustment log notice:', err);
      }
    }
  };

  // Admin Filtered Records
  const adminFilteredRecords = useMemo(() => {
    return records.filter(r => {
      // User filter
      if (filterUser !== 'all' && r.user_id !== filterUser) return false;

      // Status filter
      if (filterReviewStatus === 'pending_review' && r.review_status !== 'pending_review') return false;
      if (filterReviewStatus === 'with_overtime' && ((r.extra_daytime_minutes || 0) + (r.extra_nighttime_minutes || 0) <= 0)) return false;
      if (filterReviewStatus === 'open' && r.status !== 'open') return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = r.user_name?.toLowerCase().includes(term);
        const matchesEmail = r.user_email?.toLowerCase().includes(term);
        const matchesDate = r.work_date?.includes(term);
        if (!matchesName && !matchesEmail && !matchesDate) return false;
      }

      // Date range filter
      if (filterDateRange !== 'all') {
        const recDate = new Date(r.work_date || r.check_in_time);
        const now = new Date();
        if (filterDateRange === 'today') {
          if (recDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDateRange === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
          if (recDate < sevenDaysAgo) return false;
        } else if (filterDateRange === 'month') {
          if (recDate.getMonth() !== now.getMonth() || recDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [records, filterUser, filterReviewStatus, searchTerm, filterDateRange]);

  // Admin Global KPIs
  const adminKPIs = useMemo(() => {
    let activeNowCount = 0;
    let totalEffectiveMinutes = 0;
    let totalExtraMinutes = 0;
    let totalExtraCost = 0;
    let pendingReviewCount = 0;

    records.forEach(r => {
      if (r.status === 'open') activeNowCount++;
      if (r.review_status === 'pending_review') pendingReviewCount++;

      if (r.status === 'completed' || r.status === 'adjusted') {
        totalEffectiveMinutes += (r.effective_minutes || 0);
        totalExtraMinutes += (
          (r.extra_daytime_minutes || 0) +
          (r.extra_nighttime_minutes || 0) +
          (r.extra_sunday_holiday_day_minutes || 0) +
          (r.extra_sunday_holiday_night_minutes || 0)
        );
        totalExtraCost += (r.extra_money_amount || 0);
      }
    });

    return {
      activeNowCount,
      totalEffectiveMinutes,
      totalExtraMinutes,
      totalExtraCost,
      pendingReviewCount,
    };
  }, [records]);

  // Export CSV Handler
  const exportToCSV = () => {
    const headers = [
      'ID Registro',
      'Colaborador',
      'Email',
      'Fecha',
      'Hora Entrada',
      'Ubicación Entrada',
      'Hora Salida',
      'Ubicación Salida',
      'Minutos Brutos',
      'Almuerzo (Min)',
      'Horas Efectivas',
      'Horas Referencia',
      'Saldo Balance (Min)',
      'Horas Extras Diurnas (Min)',
      'Horas Extras Nocturnas (Min)',
      'Monto Horas Extras (COP)',
      'Estado Revisión',
      'Notas',
    ];

    const rows = adminFilteredRecords.map(r => [
      r.id,
      `"${r.user_name || ''}"`,
      r.user_email || '',
      r.work_date || '',
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '',
      `"${r.check_in_location || 'Sede Light Pro'}"`,
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '',
      `"${r.check_out_location || '-'}"`,
      r.gross_minutes || 0,
      r.lunch_break_minutes || 0,
      (Number(r.effective_minutes || 0) / 60).toFixed(2),
      (Number(r.reference_minutes || 0) / 60).toFixed(2),
      r.balance_minutes || 0,
      r.extra_daytime_minutes || 0,
      r.extra_nighttime_minutes || 0,
      r.extra_money_amount || 0,
      r.review_status || 'normal',
      `"${r.review_notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_horarios_lightpro_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 my-6 space-y-6 animate-fadeIn pb-16">
      {/* Module Title & Subtab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-black text-white shadow-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Control de Horarios y Asistencia
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Gestión fotográfica, geolocalización GPS, cálculo de extras y liquidación Light Pro
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          <button
            onClick={fetchSupabaseAttendance}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar asistencias con la base de datos de Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : 'text-gray-500'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>

          {/* Tab Controls for Administrators */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-2xl border border-gray-200">
              <button
                onClick={() => setActiveSubTab('personal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'personal'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mi Marcación</span>
              </button>

              <button
                onClick={() => setActiveSubTab('admin')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'admin'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Panel Administrativo</span>
                {adminKPIs.pendingReviewCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                    {adminKPIs.pendingReviewCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSubTab('config')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'config'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configuración</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISTA PERSONAL DEL COLABORADOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'personal' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Active Shift Card & Clock In/Out Action */}
          <div className="liquid-card rounded-3xl p-6 sm:p-8 bg-white border border-gray-200/80 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                    activePersonalRecord
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activePersonalRecord ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {activePersonalRecord ? 'Turno en Curso' : 'Sin Turno Abierto'}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  Hola, {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Colaborador'}
                </h2>

                <p className="text-xs sm:text-sm text-gray-500 max-w-lg leading-relaxed">
                  {activePersonalRecord
                    ? `Registraste tu entrada hoy a las ${new Date(activePersonalRecord.check_in_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} con foto en ${activePersonalRecord.check_in_location || 'Sede Light Pro'}.`
                    : 'Para iniciar tu jornada laboral, pulsa el botón para tomar tu fotografía y registrar tu asistencia con GPS.'}
                </p>

                {activePersonalRecord && (
                  <div className="pt-2 flex items-center justify-center md:justify-start gap-2">
                    <span className="text-xs text-gray-400 font-semibold">Tiempo transcurrido:</span>
                    <span className="font-mono text-lg font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {formatTimer(elapsedSeconds)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {activePersonalRecord ? (
                  <button
                    onClick={() => setCameraModalConfig({ isOpen: true, mode: 'out' })}
                    disabled={isRegistering}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-sm shadow-xl hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5 text-white" />
                    <span>Registrar Salida (Foto y GPS)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCameraModalConfig({ isOpen: true, mode: 'in' })}
                    disabled={isRegistering}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-sm shadow-xl hover:shadow-black/25 transition-all flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5 text-amber-400" />
                    <span>Registrar Entrada (Foto y GPS)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Hoy Trabajado
              </span>
              <div className="text-xl sm:text-2xl font-black text-gray-900">
                {formatMinutes(myMetrics.todayMinutesWorked)}
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                Ref. jornada: 9h ordinarias
              </span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Saldo Acumulado
              </span>
              <div className={`text-xl sm:text-2xl font-black flex items-center gap-1 ${
                myMetrics.netBalanceMinutes > 0
                  ? 'text-emerald-600'
                  : myMetrics.netBalanceMinutes < 0
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}>
                {myMetrics.netBalanceMinutes > 0 && '+'}
                {formatMinutes(myMetrics.netBalanceMinutes)}
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                {myMetrics.netBalanceMinutes >= 0 ? 'Sin déficit pendiente' : 'Horas pendientes por compensar'}
              </span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Horas Extras
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-600">
                {formatMinutes(myMetrics.totalExtraMinutes)}
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                Tiempo adicional liquidable
              </span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Total Extras COP
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {formatCOP(myMetrics.totalExtraMoney)}
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                Monto liquidado acumulado
              </span>
            </div>
          </div>

          {/* Personal History Table */}
          <div className="liquid-card rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
                  Mi Historial de Registros
                </h3>
                <p className="text-xs text-gray-400">
                  Tus marcaciones personales certificadas con fotos, ubicación GPS y cálculos
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Entrada (Foto / GPS)</th>
                    <th className="py-3 px-4">Salida (Foto / GPS)</th>
                    <th className="py-3 px-4">Permanencia</th>
                    <th className="py-3 px-4">Almuerzo</th>
                    <th className="py-3 px-4">Efectivo</th>
                    <th className="py-3 px-4">Saldo</th>
                    <th className="py-3 px-4">Extras (D/N)</th>
                    <th className="py-3 px-4 text-right">Valor COP</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myRecords.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-gray-400 text-xs">
                        Aún no tienes registros de asistencia. Pulsa &quot;Registrar Entrada&quot; para iniciar tu primera jornada.
                      </td>
                    </tr>
                  ) : (
                    myRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                          {r.work_date}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.check_in_photo_url && (
                              <button
                                onClick={() => setPhotoPreviewModal({ isOpen: true, url: r.check_in_photo_url, title: `Entrada: ${r.work_date}` })}
                                className="w-7 h-7 rounded-lg overflow-hidden border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                              >
                                <img src={r.check_in_photo_url} alt="Entrada" className="w-full h-full object-cover" />
                              </button>
                            )}
                            <div>
                              <span className="font-mono text-gray-700 font-bold block">
                                {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                              {r.check_in_location === 'Sede Light Pro' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  Sede
                                </span>
                              ) : r.check_in_location ? (
                                <a
                                  href={r.check_in_lat ? `https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}` : undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline max-w-[130px] truncate"
                                  title={r.check_in_location}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{r.check_in_location}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.check_out_photo_url ? (
                              <button
                                onClick={() => setPhotoPreviewModal({ isOpen: true, url: r.check_out_photo_url, title: `Salida: ${r.work_date}` })}
                                className="w-7 h-7 rounded-lg overflow-hidden border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                              >
                                <img src={r.check_out_photo_url} alt="Salida" className="w-full h-full object-cover" />
                              </button>
                            ) : null}
                            <div>
                              <span className="font-mono text-gray-700 font-bold block">
                                {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : (
                                  <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">En curso</span>
                                )}
                              </span>
                              {r.check_out_location === 'Sede Light Pro' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  Sede
                                </span>
                              ) : r.check_out_location ? (
                                <a
                                  href={r.check_out_lat ? `https://www.google.com/maps?q=${r.check_out_lat},${r.check_out_lng}` : undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline max-w-[130px] truncate"
                                  title={r.check_out_location}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{r.check_out_location}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 font-mono whitespace-nowrap">
                          {r.gross_minutes ? formatMinutes(r.gross_minutes) : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono whitespace-nowrap">
                          {r.lunch_break_minutes ? `${r.lunch_break_minutes}m` : '0m'}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900 font-mono whitespace-nowrap">
                          {r.effective_minutes ? formatMinutes(r.effective_minutes) : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                          {r.balance_minutes > 0 ? (
                            <span className="text-emerald-600">+{formatMinutes(r.balance_minutes)}</span>
                          ) : r.balance_minutes < 0 ? (
                            <span className="text-red-600">{formatMinutes(r.balance_minutes)}</span>
                          ) : (
                            <span className="text-gray-400">0h</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                          {(r.extra_daytime_minutes > 0 || r.extra_nighttime_minutes > 0) ? (
                            <span className="text-amber-700 font-bold font-mono">
                              D: {formatMinutes(r.extra_daytime_minutes)} | N: {formatMinutes(r.extra_nighttime_minutes)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 whitespace-nowrap">
                          {r.extra_money_amount > 0 ? formatCOP(r.extra_money_amount) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.review_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.review_status === 'pending_review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {r.review_status === 'approved' ? 'Aprobado' : r.review_status === 'pending_review' ? 'Revisión' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DASHBOARD ADMINISTRATIVO */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'admin' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Global KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                En Turno Ahora
              </span>
              <div className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                {adminKPIs.activeNowCount}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Colaboradores activos</span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Horas Efectivas
              </span>
              <div className="text-2xl font-black text-gray-900">
                {formatMinutes(adminKPIs.totalEffectiveMinutes)}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Trabajadas en total</span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Horas Extras
              </span>
              <div className="text-2xl font-black text-amber-600">
                {formatMinutes(adminKPIs.totalExtraMinutes)}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Diurnas y nocturnas</span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Costo Total Extras
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {formatCOP(adminKPIs.totalExtraCost)}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Liquidación proyectada</span>
            </div>

            <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Por Revisar
              </span>
              <div className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                {adminKPIs.pendingReviewCount}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Excepciones de intervalo</span>
            </div>
          </div>

          {/* Filter Bar & Export Actions */}
          <div className="liquid-card rounded-2xl p-4 bg-white border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar colaborador o fecha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black"
                />
              </div>

              {/* User Selector */}
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
              >
                <option value="all">Todos los Colaboradores</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>

              {/* Date Range Selector */}
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
              >
                <option value="all">Todo el Historial</option>
                <option value="today">Solo Hoy</option>
                <option value="week">Últimos 7 Días</option>
                <option value="month">Este Mes</option>
              </select>

              {/* Status Selector */}
              <select
                value={filterReviewStatus}
                onChange={(e) => setFilterReviewStatus(e.target.value)}
                className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="pending_review">⚠️ Solo Pendientes de Revisión</option>
                <option value="with_overtime">⚡ Solo con Horas Extras</option>
                <option value="open">🟢 Solo Turnos Abiertos</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar CSV Nómina</span>
            </button>
          </div>

          {/* Full Administrative Records Table */}
          <div className="liquid-card rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                  Registros de Asistencia y Liquidaciones ({adminFilteredRecords.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Inspección completa, fotos de evidencia, ubicación GPS y aprobación de horas extras
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Entrada (Foto / GPS)</th>
                    <th className="py-3 px-4">Salida (Foto / GPS)</th>
                    <th className="py-3 px-4">Efectivo</th>
                    <th className="py-3 px-4">Saldo</th>
                    <th className="py-3 px-4">Extras Diurna</th>
                    <th className="py-3 px-4">Extras Nocturna</th>
                    <th className="py-3 px-4 text-right">Monto COP</th>
                    <th className="py-3 px-4 text-center">Revisión</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminFilteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-gray-400 text-xs">
                        No se encontraron registros de asistencia con los filtros seleccionados. Las marcaciones de los colaboradores aparecerán aquí automáticamente.
                      </td>
                    </tr>
                  ) : (
                    adminFilteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{r.user_name || 'Colaborador'}</div>
                          <div className="text-[10px] text-gray-400">{r.user_email || ''}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-gray-700 whitespace-nowrap">
                          {r.work_date}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.check_in_photo_url && (
                              <button
                                onClick={() => setPhotoPreviewModal({ isOpen: true, url: r.check_in_photo_url, title: `Entrada: ${r.user_name} (${r.work_date})` })}
                                className="w-7 h-7 rounded-lg overflow-hidden border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                              >
                                <img src={r.check_in_photo_url} alt="Entrada" className="w-full h-full object-cover" />
                              </button>
                            )}
                            <div>
                              <span className="font-mono text-gray-700 font-bold block">
                                {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                              {r.check_in_location === 'Sede Light Pro' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  Sede
                                </span>
                              ) : r.check_in_location ? (
                                <a
                                  href={r.check_in_lat ? `https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}` : undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline max-w-[130px] truncate"
                                  title={r.check_in_location}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{r.check_in_location}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.check_out_photo_url ? (
                              <button
                                onClick={() => setPhotoPreviewModal({ isOpen: true, url: r.check_out_photo_url, title: `Salida: ${r.user_name} (${r.work_date})` })}
                                className="w-7 h-7 rounded-lg overflow-hidden border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                              >
                                <img src={r.check_out_photo_url} alt="Salida" className="w-full h-full object-cover" />
                              </button>
                            ) : null}
                            <div>
                              <span className="font-mono text-gray-700 font-bold block">
                                {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : (
                                  <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">En curso</span>
                                )}
                              </span>
                              {r.check_out_location === 'Sede Light Pro' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                  Sede
                                </span>
                              ) : r.check_out_location ? (
                                <a
                                  href={r.check_out_lat ? `https://www.google.com/maps?q=${r.check_out_lat},${r.check_out_lng}` : undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline max-w-[130px] truncate"
                                  title={r.check_out_location}
                                >
                                  <MapPin className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{r.check_out_location}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {r.effective_minutes ? formatMinutes(r.effective_minutes) : '-'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                          {r.balance_minutes > 0 ? (
                            <span className="text-emerald-600">+{formatMinutes(r.balance_minutes)}</span>
                          ) : r.balance_minutes < 0 ? (
                            <span className="text-red-600">{formatMinutes(r.balance_minutes)}</span>
                          ) : (
                            <span className="text-gray-400">0h</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                          {r.extra_daytime_minutes > 0 ? formatMinutes(r.extra_daytime_minutes) : '-'}
                        </td>

                        <td className="py-3 px-4 font-mono text-amber-700 font-bold whitespace-nowrap">
                          {r.extra_nighttime_minutes > 0 ? formatMinutes(r.extra_nighttime_minutes) : '-'}
                        </td>

                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 whitespace-nowrap">
                          {r.extra_money_amount > 0 ? formatCOP(r.extra_money_amount) : '$0'}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            r.review_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.review_status === 'pending_review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {r.review_status === 'approved' ? 'Aprobado' : r.review_status === 'pending_review' ? '⚠️ Revisión' : 'Normal'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {r.review_status === 'pending_review' && (
                              <button
                                onClick={() => handleApproveRecord(r.id)}
                                title="Aprobar registro formalmente"
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 transition-all"
                              >
                                Aprobar
                              </button>
                            )}

                            <button
                              onClick={() => setAdjustmentModal({
                                isOpen: true,
                                record: r,
                                inTime: r.check_in_time ? r.check_in_time.substring(0, 16) : '',
                                outTime: r.check_out_time ? r.check_out_time.substring(0, 16) : '',
                                reason: '',
                              })}
                              title="Ajuste manual auditado"
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISTA DE CONFIGURACIÓN DE HORARIOS Y TARIFAS */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'config' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Reference Workday Schedule Config */}
          <div className="liquid-card rounded-3xl p-6 bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-black" />
                  Horarios de Referencia Semanal
                </h3>
                <p className="text-xs text-gray-400">
                  Configuración de inicio, fin y horas de referencia ordinarias por día
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(schedules).map((key) => {
                const s = schedules[key];
                return (
                  <div key={key} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{s.dayName}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.isWorkday}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setSchedules(prev => ({
                              ...prev,
                              [key]: { ...prev[key], isWorkday: val }
                            }));
                          }}
                          className="rounded text-black focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-gray-600 font-medium">Jornada ordinaria</span>
                      </label>
                    </div>

                    {s.isWorkday ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">Entrada ref.</label>
                          <input
                            type="time"
                            value={s.startTime || '08:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSchedules(prev => ({
                                ...prev,
                                [key]: { ...prev[key], startTime: val }
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">Salida ref.</label>
                          <input
                            type="time"
                            value={s.endTime || '18:00'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSchedules(prev => ({
                                ...prev,
                                [key]: { ...prev[key], endTime: val }
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between pt-1 text-[11px] text-gray-500">
                          <span>Horas referencia: <strong>{s.referenceHours}h</strong></span>
                          <span>Almuerzo: <strong>{s.lunchMinutes}m</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-medium text-center">
                        Día no laboral ordinario. Todo tiempo cuenta como hora extra / festivo.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overtime Rates Config */}
          <div className="liquid-card rounded-3xl p-6 bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Tarifas Oficiales de Horas Extras (Light Pro)
                </h3>
                <p className="text-xs text-gray-400">
                  Valores económicos por hora configurables para liquidaciones
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(rates).map((key) => {
                const r = rates[key];
                return (
                  <div key={key} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/70 space-y-2">
                    <span className="font-bold text-xs text-gray-900 block">{r.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-semibold">$</span>
                      <input
                        type="number"
                        value={r.rate}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRates(prev => ({
                            ...prev,
                            [key]: { ...prev[key], rate: val }
                          }));
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-mono text-sm font-black text-gray-900"
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1">
                      <span>Franja: {r.startTime} a {r.endTime}</span>
                      <span>{formatCOP(r.rate)} / hora</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sede Geographic Location & Radius Geofence Config */}
          <div className="liquid-card rounded-3xl p-6 bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Ubicación Geográfica de la Sede y Geocerca
                </h3>
                <p className="text-xs text-gray-400">
                  Si el colaborador marca dentro de los {sedeConfig.radiusMeters || 200}m, se guarda como &quot;Sede Light Pro&quot;. Fuera de este rango, se guarda la dirección de la calle sin costo alguno.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSetCurrentLocationAsSede}
                className="px-3.5 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span>Fijar mi ubicación actual como Sede</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Nombre de la Sede</label>
                <input
                  type="text"
                  value={sedeConfig.name}
                  onChange={(e) => setSedeConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-semibold text-xs text-gray-900"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Coordenadas (Lat, Lng)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitud"
                    value={sedeConfig.latitude}
                    onChange={(e) => setSedeConfig(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl font-mono text-xs text-gray-900"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitud"
                    value={sedeConfig.longitude}
                    onChange={(e) => setSedeConfig(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-xl font-mono text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Radio de Cobertura (Metros)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sedeConfig.radiusMeters}
                    onChange={(e) => setSedeConfig(prev => ({ ...prev, radiusMeters: parseInt(e.target.value, 10) || 200 }))}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-mono font-bold text-xs text-gray-900"
                  />
                  <span className="text-xs text-gray-500 font-semibold">mts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Live Camera Modal */}
      <LiveCameraModal
        isOpen={cameraModalConfig.isOpen}
        onClose={() => setCameraModalConfig({ isOpen: false, mode: 'in' })}
        onCapture={handlePhotoCaptured}
        title={cameraModalConfig.mode === 'in' ? 'Registrar Entrada' : 'Registrar Salida'}
        subtitle={cameraModalConfig.mode === 'in' ? 'Tómate una foto en vivo para certificar tu hora de inicio' : 'Tómate una foto en vivo para certificar el fin de tu jornada'}
      />

      {/* 2. Photo Preview Modal */}
      {photoPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900">{photoPreviewModal.title}</h4>
              <button onClick={() => setPhotoPreviewModal({ isOpen: false, url: '', title: '' })} className="p-1 text-gray-400 hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center">
              <img src={photoPreviewModal.url} alt="Evidencia" className="w-full max-h-80 object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Manual Adjustment Modal */}
      {adjustmentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Ajuste Manual Auditado
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Corrección de horarios para {adjustmentModal.record?.user_name}
                </p>
              </div>
              <button
                onClick={() => setAdjustmentModal({ isOpen: false, record: null, reason: '', inTime: '', outTime: '' })}
                className="p-1.5 text-gray-400 hover:text-black rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Hora de Entrada (ISO)</label>
                <input
                  type="datetime-local"
                  required
                  value={adjustmentModal.inTime}
                  onChange={(e) => setAdjustmentModal(prev => ({ ...prev, inTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Hora de Salida (ISO)</label>
                <input
                  type="datetime-local"
                  required
                  value={adjustmentModal.outTime}
                  onChange={(e) => setAdjustmentModal(prev => ({ ...prev, outTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>Motivo / Justificación Formal</span>
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Ej. Colaborador olvidó marcar salida por atención de evento urgente en sede."
                  value={adjustmentModal.reason}
                  onChange={(e) => setAdjustmentModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                Este ajuste quedará registrado en la tabla de auditoría con tu nombre de usuario y el motivo ingresado.
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentModal({ isOpen: false, record: null, reason: '', inTime: '', outTime: '' })}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 shadow-md"
                >
                  Guardar y Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
