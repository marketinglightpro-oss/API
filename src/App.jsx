import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'register' | 'scanner' | 'logs' | 'users'

  // Equipment Data State
  const [equipmentList, setEquipmentList] = useState(() => {
    const saved = localStorage.getItem('lightpro_equipment');
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  // System Activity Logs State
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('lightpro_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Team Members / Staff State
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', full_name: 'Carlos Mendoza', role: 'technician', email: 'carlos@lightpro.com' },
    { id: '2', full_name: 'Andrés Silva', role: 'admin', email: 'andres@lightpro.com' },
    { id: '3', full_name: 'Stivens', role: 'super_admin', email: 'light.pro01@hotmail.com' },
    { id: '4', full_name: 'Mariana Gómez', role: 'technician', email: 'mariana@lightpro.com' },
  ]);

  // Live Bell Notifications State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('lightpro_notifications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'N-1',
        title: 'Equipo Asignado',
        detail: 'Cabina JBL (EQ-3958) fue asignada a Carlos Mendoza (Técnico)',
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: 'EQ-3958',
      },
      {
        id: 'N-2',
        title: 'Promesa de Reparación',
        detail: 'Cabina JBL (EQ-3958) tiene fecha estimada de entrega para el 26/09/2026',
        timestamp: new Date().toISOString(),
        read: false,
        equipmentId: 'EQ-3958',
      }
    ];
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

  // Sync with Supabase Database Tables on Mount
  useEffect(() => {
    const fetchSupabaseData = async () => {
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
            photoUrl: item.photo_url,
            photos: item.photos || (item.photo_url ? [item.photo_url] : []),
            notes: item.notes || [],
            history: item.history || [],
          }));
          
          // Merge with local items that haven't synced yet
          setEquipmentList((prev) => {
            const combined = [...mapped];
            prev.forEach((localItem) => {
              if (!combined.some((remoteItem) => remoteItem.id === localItem.id)) {
                combined.push(localItem);
              }
            });
            return combined;
          });
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
    };

    fetchSupabaseData();
  }, []);

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

    setEquipmentList((prev) => [newRecord, ...prev]);

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: authorName,
      role: currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Equipo Registrado',
      detail: `Nuevo equipo registrado: ${newRecord.name} (${newRecord.id}) - Serie: ${newRecord.serialNumber}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowRegisterModal(false);
    setQrModalItem(newRecord);

    // Persist to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: eqErr } = await supabase.from('equipment').insert([{
          id: newRecord.id,
          name: newRecord.name,
          category: newRecord.category,
          serial_number: newRecord.serialNumber,
          owner_name: newRecord.ownerName,
          owner_phone: newRecord.ownerPhone,
          owner_email: newRecord.ownerEmail,
          issue: newRecord.issue,
          priority: newRecord.priority,
          status: newRecord.status,
          technician_assigned: newRecord.technicianAssigned,
          created_at: newRecord.createdAt,
          photo_url: newRecord.photoUrl,
          photos: newRecord.photos || [],
          notes: newRecord.notes,
          history: newRecord.history,
        }]);

        if (eqErr) {
          console.error('Error guardando equipo en Supabase:', eqErr);
          // If insert error is related to image payload, attempt insert without photo_url/photos
          console.warn('Reintentando guardar equipo en Supabase sin imagen...');
          await supabase.from('equipment').insert([{
            id: newRecord.id,
            name: newRecord.name,
            category: newRecord.category,
            serial_number: newRecord.serialNumber,
            owner_name: newRecord.ownerName,
            owner_phone: newRecord.ownerPhone,
            owner_email: newRecord.ownerEmail,
            issue: newRecord.issue,
            priority: newRecord.priority,
            status: newRecord.status,
            technician_assigned: newRecord.technicianAssigned,
            created_at: newRecord.createdAt,
            photo_url: null,
            photos: [],
            notes: newRecord.notes,
            history: newRecord.history,
          }]);
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
    <div className="min-h-screen py-4 sm:py-6 transition-colors font-poppins selection:bg-black selection:text-white">
      
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

      {/* Metrics & Filter Hero Header */}
      <MetricsOverview
        equipmentList={equipmentList}
        onOpenRegister={() => setShowRegisterModal(true)}
        onOpenScanner={() => setShowScannerModal(true)}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Tab Content */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          equipmentList={filteredEquipment}
          currentRole={currentRole}
          onMoveStage={handleMoveStage}
          onSelectItem={(item) => setSelectedItem(item)}
          onOpenQRModal={(item) => setQrModalItem(item)}
        />
      )}

      {activeTab === 'logs' && (
        <ActivityLogView logs={logs} />
      )}

      {activeTab === 'users' && (
        <UserManagementView currentUser={currentUser} />
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
