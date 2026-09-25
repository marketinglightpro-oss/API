import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsOverview from './components/MetricsOverview';
import KanbanBoard from './components/KanbanBoard';
import EquipmentForm from './components/EquipmentForm';
import QRCodeModal from './components/QRCodeModal';
import QRScannerModal from './components/QRScannerModal';
import EquipmentDetailModal from './components/EquipmentDetailModal';
import ActivityLogView from './components/ActivityLogView';
import UserManagementView from './components/UserManagementView';
import LoginScreen from './components/LoginScreen';
import { INITIAL_EQUIPMENT, INITIAL_LOGS, KANBAN_STAGES } from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Shield, Wrench, User, Database } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('super_admin'); // 'super_admin' | 'admin' | 'technician' | 'client'
  const [activeTab, setActiveTab] = useState('reparaciones'); // 'reparaciones' | 'equipos' | 'herramientas' | 'alquileres' | 'horarios' | 'logs'

  // Equipment Data State
  const [equipmentList, setEquipmentList] = useState(() => {
    const saved = localStorage.getItem('lightpro_equipment');
    if (!saved) return INITIAL_EQUIPMENT;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return INITIAL_EQUIPMENT;
    }
  });

  // System Activity Logs State
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('lightpro_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Auto-Sync Cloud State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Team Members / Staff State (Synced dynamically with Supabase profiles)
  const [teamMembers, setTeamMembers] = useState([]);

  // Live Bell Notifications State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('lightpro_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Filter States
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers State
  const [selectedItem, setSelectedItem] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Sync profile & assign Super Admin role for Supabase Auth accounts
  const syncUserRole = async (user) => {
    if (!user) return;
    setCurrentUser(user);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile && profile.role) {
          setCurrentRole(profile.role);
        } else {
          // If user was created directly in Supabase Auth Dashboard, default role to super_admin!
          const userRole = user.user_metadata?.role || 'super_admin';
          setCurrentRole(userRole);
          await supabase.from('profiles').upsert([{
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            role: userRole,
          }]);
        }
      } catch (err) {
        console.warn('Profile sync notice:', err);
        setCurrentRole(user.user_metadata?.role || 'super_admin');
      }
    } else {
      setCurrentRole(user.user_metadata?.role || 'super_admin');
    }
  };

  // Supabase Auth State Listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        syncUserRole(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserRole(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data from Supabase Database
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: eqData, error: eqErr } = await supabase.from('equipment').select('*').order('created_at', { ascending: false });
      if (!eqErr && eqData) {
        const mapped = eqData.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          serialNumber: item.serial_number,
          ownerName: item.owner_name,
          ownerPhone: item.owner_phone,
          ownerEmail: item.owner_email,
          issue: item.issue,
          priority: item.priority,
          status: item.status,
          technicianAssigned: item.technician_assigned,
          promisedDate: item.promised_date,
          createdAt: item.created_at,
          createdBy: item.created_by || item.created_user || item.history?.[0]?.updatedBy || item.owner_name || 'Sistema',
          photoUrl: item.photo_url,
          photos: item.photos || (item.photo_url ? [item.photo_url] : []),
          notes: item.notes || [],
          history: item.history || [],
        }));
        
        setEquipmentList(mapped);
        localStorage.setItem('lightpro_equipment', JSON.stringify(mapped));
      }

      const { data: logData, error: logErr } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
      if (!logErr && logData && logData.length > 0) {
        const mappedLogs = logData.map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          user: l.user_name,
          role: l.role,
          action: l.action,
          detail: l.detail,
        }));
        setLogs(mappedLogs);
      }

      const { data: profileData, error: profErr } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!profErr && profileData && profileData.length > 0) {
        setTeamMembers(profileData);
      }
    } catch (err) {
      console.warn('Supabase fetch error, using local state:', err);
    }
  }, []);

  // Sync with Supabase Database Tables on Mount & Subscribe to Realtime WebSockets
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    fetchSupabaseData();

    // Subscribe to Realtime WebSockets for instant multi-user synchronization across tables
    const channel = supabase
      .channel('public:realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, () => {
        console.log('[Realtime] Cambio detectado en equipos. Sincronizando cuentas...');
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('[Realtime] Cambio detectado en perfiles. Sincronizando perfiles...');
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        console.log('[Realtime] Nuevo log de actividad detectado. Actualizando auditoría...');
        fetchSupabaseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSupabaseData]);

  // Automatic Background Sync to Supabase (Pulls cloud updates & syncs offline pending items)
  const syncLocalToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      setIsSyncing(true);

      // 1. Push any items created offline that explicitly require sync
      const pendingItems = equipmentList.filter((item) => item._needsSync);
      if (pendingItems.length > 0) {
        for (const item of pendingItems) {
          const fullPayload = {
            id: item.id,
            name: item.name,
            category: item.category,
            serial_number: item.serialNumber,
            owner_name: item.ownerName,
            owner_phone: item.ownerPhone || null,
            owner_email: item.ownerEmail || null,
            issue: item.issue,
            priority: item.priority,
            status: item.status,
            technician_assigned: item.technicianAssigned || null,
            promised_date: item.promisedDate || null,
            created_at: item.createdAt,
            photo_url: item.photoUrl || null,
            photos: item.photos || [],
            notes: item.notes || [],
            history: item.history || [],
          };
          const { error: insErr } = await supabase.from('equipment').insert([fullPayload]);
          if (!insErr) {
            delete item._needsSync;
          }
        }
      }

      await fetchSupabaseData();
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Error en sincronización automática:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [equipmentList, fetchSupabaseData]);

  // Execute background sync interval every 10 seconds
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const initialTimeout = setTimeout(() => {
      syncLocalToSupabase();
    }, 2000);

    const interval = setInterval(() => {
      syncLocalToSupabase();
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [syncLocalToSupabase]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('lightpro_equipment', JSON.stringify(equipmentList));
  }, [equipmentList]);

  useEffect(() => {
    localStorage.setItem('lightpro_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('lightpro_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Security Redirect: Prevent technician and client from accessing equipos tab
  useEffect(() => {
    if ((currentRole === 'technician' || currentRole === 'client') && (activeTab === 'equipos' || activeTab === 'users')) {
      setActiveTab('reparaciones');
    }
  }, [currentRole, activeTab]);

  // Sign out handler
  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  // Login Success Callback
  const handleLoginSuccess = (user, userRole) => {
    syncUserRole(user);
    if (userRole) setCurrentRole(userRole);
  };

  // Handle Stage Movement
  const handleMoveStage = async (itemId, targetStageId) => {
    const stageObj = KANBAN_STAGES.find((s) => s.id === targetStageId);
    const updatedBy = currentUser
      ? (currentUser.user_metadata?.full_name || currentUser.email)
      : 'Usuario Autorizado';

    const targetItem = equipmentList.find((i) => i.id === itemId);
    const newHistory = [
      ...(targetItem?.history || []),
      {
        stage: targetStageId,
        timestamp: new Date().toISOString(),
        updatedBy: updatedBy,
      },
    ];

    setEquipmentList((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            status: targetStageId,
            history: newHistory,
          };
        }
        return item;
      })
    );

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({
        ...prev,
        status: targetStageId,
        history: newHistory,
      }));
    }

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: updatedBy,
      role: currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Cambio de Estado',
      detail: `Equipo ${targetItem?.name} (${itemId}) avanzado a la etapa "${stageObj?.title}"`,
    };
    setLogs((prev) => [newLog, ...prev]);

    // Push notification to Bell
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title: 'Cambio de Etapa',
        detail: `Equipo ${targetItem?.name || itemId} avanzó a "${stageObj?.title}"`,
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: itemId,
      },
      ...prev,
    ]);

    // Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('equipment').update({ status: targetStageId, history: newHistory }).eq('id', itemId);
        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error updating Supabase:', err);
      }
    }
  };

  // Handle Technician Assignment
  const handleAssignTechnician = async (itemId, technicianName) => {
    const targetItem = equipmentList.find((i) => i.id === itemId);

    setEquipmentList((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, technicianAssigned: technicianName } : item))
    );

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({ ...prev, technicianAssigned: technicianName }));
    }

    const authorName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Sistema';

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Técnico Asignado',
      detail: `Equipo ${targetItem?.name || itemId} asignado a ${technicianName}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title: 'Técnico Asignado',
        detail: `Equipo ${targetItem?.name || itemId} asignado a ${technicianName}`,
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: itemId,
      },
      ...prev,
    ]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('equipment').update({ technician_assigned: technicianName }).eq('id', itemId);
        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error updating technician in Supabase:', err);
      }
    }
  };

  // Handle Promised Repair Date Setting
  const handleSetPromisedDate = async (itemId, dateStr) => {
    const targetItem = equipmentList.find((i) => i.id === itemId);

    setEquipmentList((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, promisedDate: dateStr } : item))
    );

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({ ...prev, promisedDate: dateStr }));
    }

    const authorName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Sistema';

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Promesa de Reparación',
      detail: `Fecha promesa de entrega para ${targetItem?.name || itemId}: ${dateStr}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title: 'Promesa de Reparación',
        detail: `Fecha estimada para ${targetItem?.name || itemId}: ${dateStr}`,
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: itemId,
      },
      ...prev,
    ]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('equipment').update({ promised_date: dateStr }).eq('id', itemId);
        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error updating promised date in Supabase:', err);
      }
    }
  };

  // Handle New Equipment Registration
  const handleAddEquipment = async (newRecord) => {
    const authorName = currentUser
      ? (currentUser.user_metadata?.full_name || currentUser.email)
      : newRecord.ownerName;

    const enrichedRecord = {
      ...newRecord,
      createdBy: authorName,
    };

    setEquipmentList((prev) => [enrichedRecord, ...prev]);

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Equipo Registrado',
      detail: `Nuevo equipo registrado por ${authorName}: ${newRecord.name} (${newRecord.id}) - Serie: ${newRecord.serialNumber}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowRegisterModal(false);
    setQrModalItem(enrichedRecord);

    // Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const fullPayload = {
          id: newRecord.id,
          name: newRecord.name,
          category: newRecord.category,
          serial_number: newRecord.serialNumber,
          owner_name: newRecord.ownerName,
          owner_phone: newRecord.ownerPhone || null,
          owner_email: newRecord.ownerEmail || null,
          issue: newRecord.issue,
          priority: newRecord.priority,
          status: newRecord.status,
          technician_assigned: newRecord.technicianAssigned || null,
          created_at: newRecord.createdAt,
          created_by: authorName,
          photo_url: newRecord.photoUrl || null,
          photos: newRecord.photos || [],
          notes: newRecord.notes || [],
          history: newRecord.history || [],
        };

        const { error: eqErr } = await supabase.from('equipment').insert([fullPayload]);

        if (eqErr) {
          console.error('Error al guardar equipo completo en Supabase:', eqErr);
          
          // Fallback 1: Remove base64 photos/photo_url keys completely to avoid column missing or payload size errors
          console.warn('Reintentando guardar equipo en Supabase sin llaves de imagenes...');
          const fallbackPayload1 = { ...fullPayload };
          delete fallbackPayload1.photos;
          delete fallbackPayload1.photo_url;

          const { error: retryErr1 } = await supabase.from('equipment').insert([fallbackPayload1]);

          if (retryErr1) {
            console.error('Error en reintento 1 de Supabase:', retryErr1);
            
            // Fallback 2: Basic core payload only
            const minimalPayload = {
              id: newRecord.id,
              name: newRecord.name,
              category: newRecord.category,
              serial_number: newRecord.serialNumber,
              owner_name: newRecord.ownerName,
              owner_phone: newRecord.ownerPhone || null,
              owner_email: newRecord.ownerEmail || null,
              issue: newRecord.issue,
              priority: newRecord.priority,
              status: newRecord.status,
              created_at: newRecord.createdAt,
            };

            const { error: retryErr2 } = await supabase.from('equipment').insert([minimalPayload]);
            if (retryErr2) {
              console.error('Error fatal al guardar equipo en Supabase:', retryErr2);
              alert(`Atención: El equipo (${newRecord.id}) quedó registrado en la aplicación local pero no se pudo sincronizar en la tabla "equipment" de Supabase.\n\nMotivo: ${retryErr2.message || 'Error de permisos RLS o la tabla equipment requiere actualización SQL.'}\n\nRevisa el archivo supabase_schema.sql para ejecutar las políticas SQL necesarias.`);
            }
          }
        }

        const { error: logErr } = await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);

        if (logErr) {
          console.error('Error guardando log en Supabase:', logErr);
        }
      } catch (err) {
        console.error('Error general al guardar en Supabase:', err);
      }
    }
  };

  // Handle Equipment Record Deletion (Exclusive to Super Admin & Admin)
  const handleDeleteEquipment = async (itemId) => {
    const targetItem = equipmentList.find((i) => i.id === itemId);
    if (!targetItem) return;

    if (!confirm(`¿Estás seguro de eliminar permanentemente la ficha de este equipo?\n\nEquipo: ${targetItem.name}\nID: ${itemId}`)) {
      return;
    }

    const updatedList = equipmentList.filter((i) => i.id !== itemId);
    setEquipmentList(updatedList);
    localStorage.setItem('lightpro_equipment', JSON.stringify(updatedList));

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem(null);
    }

    const authorName = currentUser
      ? (currentUser.user_metadata?.full_name || currentUser.email)
      : 'Administrador';

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : 'Administrador',
      action: 'Equipo Eliminado',
      detail: `Ficha de equipo ${targetItem.name} (${itemId}) eliminada permanentemente.`,
    };
    setLogs((prev) => [newLog, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: delErr } = await supabase.from('equipment').delete().eq('id', itemId);
        if (delErr) {
          console.error('Error eliminando equipo de Supabase:', delErr);
          alert(`Atención: No se pudo eliminar de la base de datos Supabase: ${delErr.message}`);
        } else {
          console.log(`[Supabase Delete] Equipo ${itemId} eliminado exitosamente de la nube.`);
        }
        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error enviando borrado a Supabase:', err);
      }
    }
  };

  // Handle Equipment Record Details Update (Exclusive to Super Admin & Admin)
  const handleUpdateEquipment = async (itemId, updatedFields) => {
    setEquipmentList((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updatedFields } : item))
    );

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({ ...prev, ...updatedFields }));
    }

    const authorName = currentUser
      ? (currentUser.user_metadata?.full_name || currentUser.email)
      : 'Administrador';

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : 'Administrador',
      action: 'Ficha Actualizada',
      detail: `Ficha de equipo ${updatedFields.name || itemId} fue actualizada por ${authorName}.`,
    };
    setLogs((prev) => [newLog, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload = {
          name: updatedFields.name,
          category: updatedFields.category,
          serial_number: updatedFields.serialNumber,
          owner_name: updatedFields.ownerName,
          owner_phone: updatedFields.ownerPhone || null,
          owner_email: updatedFields.ownerEmail || null,
          issue: updatedFields.issue,
          priority: updatedFields.priority,
        };

        const { error: updErr } = await supabase.from('equipment').update(dbPayload).eq('id', itemId);
        if (updErr) {
          console.error('Error actualizando equipo en Supabase:', updErr);
        }

        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error enviando actualización a Supabase:', err);
      }
    }
  };

  // Handle Technical Note Addition
  const handleAddNote = async (itemId, note) => {
    let updatedNotes = [];

    setEquipmentList((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          updatedNotes = [note, ...(item.notes || [])];
          return {
            ...item,
            notes: updatedNotes,
          };
        }
        return item;
      })
    );

    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({
        ...prev,
        notes: [note, ...(prev.notes || [])],
      }));
    }

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: note.author,
      role: note.role,
      action: 'Nota de Mantenimiento',
      detail: `Nota añadida a ${itemId}: "${note.text || 'Evidencia adjunta'}"`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title: 'Nueva Nota / Evidencia',
        detail: `${note.author} (${note.role}) agregó una observación a ${itemId}`,
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: itemId,
      },
      ...prev,
    ]);

    // Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('equipment').update({ notes: updatedNotes }).eq('id', itemId);
        await supabase.from('activity_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          role: newLog.role,
          action: newLog.action,
          detail: newLog.detail,
        }]);
      } catch (err) {
        console.error('Error updating note in Supabase:', err);
      }
    }
  };

  // Mandatory Login Gate: If not authenticated, render LoginScreen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Filter Logic
  const filteredEquipment = equipmentList.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.serialNumber.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q);
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-4 pb-24 md:py-6 transition-colors font-poppins selection:bg-black selection:text-white">
      
      {/* Top Header & Role Indicator */}
      <Header
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'register') {
            setShowRegisterModal(true);
          } else if (tab === 'scanner') {
            setShowScannerModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        notifications={notifications}
        onMarkNotificationsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onSelectNotification={(notif) => {
          if (notif.equipmentId) {
            const eq = equipmentList.find((e) => e.id === notif.equipmentId);
            if (eq) setSelectedItem(eq);
          }
        }}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onForceSync={syncLocalToSupabase}
      />

      {/* Role & Database Status Notice Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 mb-4">
        <div className="bg-black text-white px-3.5 py-2 rounded-2xl flex flex-wrap items-center justify-between text-xs shadow-md gap-2">
          <div className="flex items-center gap-2">
            {currentRole === 'super_admin' && <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            {currentRole === 'admin' && <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />}
            {currentRole === 'technician' && <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            {currentRole === 'client' && <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            <span className="font-semibold">
              Modo Activo: <span className="uppercase text-white underline font-bold">{currentRole === 'super_admin' ? 'SUPER ADMIN' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-gray-300">
              BD: {isSupabaseConfigured ? 'Supabase Conectado (Nube)' : 'Almacenamiento Local (Configura Supabase)'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics & Filter Hero Header (Shown on Reparaciones View) */}
      {(activeTab === 'reparaciones' || activeTab === 'kanban') && (
        <MetricsOverview
          equipmentList={equipmentList}
          onOpenRegister={() => setShowRegisterModal(true)}
          onOpenScanner={() => setShowScannerModal(true)}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* Main Tab Content Router */}
      {(activeTab === 'reparaciones' || activeTab === 'kanban') && (
        <KanbanBoard
          equipmentList={filteredEquipment}
          currentRole={currentRole}
          onMoveStage={handleMoveStage}
          onSelectItem={(item) => setSelectedItem(item)}
          onOpenQRModal={(item) => setQrModalItem(item)}
          onDeleteEquipment={handleDeleteEquipment}
        />
      )}

      {(activeTab === 'equipos' || activeTab === 'users') && (currentRole === 'super_admin' || currentRole === 'admin') && (
        <UserManagementView
          currentUser={currentUser}
          currentRole={currentRole}
          teamMembers={teamMembers}
          onUpdateTeamMembers={(updated) => setTeamMembers(updated)}
        />
      )}

      {activeTab === 'logs' && (
        <ActivityLogView logs={logs} />
      )}

      {(activeTab === 'herramientas' || activeTab === 'alquileres' || activeTab === 'horarios') && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 my-8 animate-fadeIn">
          <div className="liquid-card rounded-3xl p-8 sm:p-12 text-center bg-white border border-gray-200 shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-lg text-2xl font-bold">
              ✨
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Módulo de {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} en Desarrollo
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed font-medium">
              Pronto podrás gestionar todos los aspectos de {activeTab} para tu cuenta LIGHTPRO. Estamos trabajando en este módulo.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('reparaciones')}
                className="liquid-btn-primary px-6 py-2.5 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-all"
              >
                Volver a Reparaciones (Kanban)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}

      {/* Equipment Registration Modal with Camera Photo Capture */}
      {showRegisterModal && (
        <EquipmentForm
          currentRole={currentRole}
          onAddEquipment={handleAddEquipment}
          onClose={() => setShowRegisterModal(false)}
        />
      )}

      {/* Real Phone Camera QR Scanner Modal */}
      {showScannerModal && (
        <QRScannerModal
          equipmentList={equipmentList}
          onScanSuccess={(scannedItem) => {
            setShowScannerModal(false);
            setSelectedItem(scannedItem);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Printable / Downloadable QR Modal */}
      {qrModalItem && (
        <QRCodeModal
          item={qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}

      {/* Equipment Details & Note Logging Drawer */}
      {selectedItem && (
        <EquipmentDetailModal
          item={selectedItem}
          currentRole={currentRole}
          currentUser={currentUser}
          teamMembers={teamMembers}
          onUpdateStatus={handleMoveStage}
          onAssignTechnician={handleAssignTechnician}
          onSetPromisedDate={handleSetPromisedDate}
          onAddNote={handleAddNote}
          onUpdateEquipment={handleUpdateEquipment}
          onDeleteEquipment={handleDeleteEquipment}
          onOpenQRModal={(item) => {
            setSelectedItem(null);
            setQrModalItem(item);
          }}
          onClose={() => setSelectedItem(null)}
        />
      )}

    </div>
  );
}
