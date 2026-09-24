import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsOverview from './components/MetricsOverview';
import KanbanBoard from './components/KanbanBoard';
import EquipmentForm from './components/EquipmentForm';
import QRCodeModal from './components/QRCodeModal';
import QRScannerModal from './components/QRScannerModal';
import EquipmentDetailModal from './components/EquipmentDetailModal';
import ActivityLogView from './components/ActivityLogView';
import { INITIAL_EQUIPMENT, INITIAL_LOGS, KANBAN_STAGES } from './mockData';
import { Shield, Wrench, User } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('admin'); // 'admin' | 'technician' | 'client'
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'register' | 'scanner' | 'logs'
  
  // Equipment Data State with localStorage persistence
  const [equipmentList, setEquipmentList] = useState(() => {
    const saved = localStorage.getItem('lightpro_equipment');
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  // System Activity Logs State with localStorage persistence
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('lightpro_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Filter States
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers State
  const [selectedItem, setSelectedItem] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('lightpro_equipment', JSON.stringify(equipmentList));
  }, [equipmentList]);

  useEffect(() => {
    localStorage.setItem('lightpro_logs', JSON.stringify(logs));
  }, [logs]);

  // Handle Stage Movement
  const handleMoveStage = (itemId, targetStageId) => {
    const stageObj = KANBAN_STAGES.find((s) => s.id === targetStageId);
    const updatedBy = currentRole === 'admin' ? 'Usuario Administrador' : currentRole === 'technician' ? 'Técnico Encargado' : 'Cliente';

    setEquipmentList((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newHistory = [
            ...(item.history || []),
            {
              stage: targetStageId,
              timestamp: new Date().toISOString(),
              updatedBy: updatedBy,
            },
          ];
          return {
            ...item,
            status: targetStageId,
            history: newHistory,
          };
        }
        return item;
      })
    );

    // Update active selected item if opened in modal
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem((prev) => ({
        ...prev,
        status: targetStageId,
        history: [
          ...(prev.history || []),
          { stage: targetStageId, timestamp: new Date().toISOString(), updatedBy: updatedBy },
        ],
      }));
    }

    // Add Audit Log Entry
    const targetItem = equipmentList.find((i) => i.id === itemId);
    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: updatedBy,
      role: currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Cambio de Estado',
      detail: `Equipo ${targetItem?.name} (${itemId}) avanzado a la etapa "${stageObj?.title}"`,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Handle New Equipment Registration
  const handleAddEquipment = (newRecord) => {
    setEquipmentList((prev) => [newRecord, ...prev]);

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentRole === 'admin' ? 'Usuario Administrador' : currentRole === 'technician' ? 'Técnico Encargado' : newRecord.ownerName,
      role: currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente',
      action: 'Equipo Registrado',
      detail: `Nuevo equipo registrado: ${newRecord.name} (${newRecord.id}) - Serie: ${newRecord.serialNumber}`,
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowRegisterModal(false);
    setQrModalItem(newRecord); // Instantly open QR Modal for newly registered item
  };

  // Handle Technical Note Addition
  const handleAddNote = (itemId, note) => {
    setEquipmentList((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            notes: [note, ...(item.notes || [])],
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
      detail: `Nota añadida a ${itemId}: "${note.text}"`,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

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
    <div className="min-h-screen py-6 transition-colors">
      
      {/* Top Header & Role Switcher */}
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
      />

      {/* Role Notice Banner */}
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <div className="bg-black text-white px-4 py-2 rounded-2xl flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            {currentRole === 'admin' && <Shield className="w-4 h-4 text-emerald-400" />}
            {currentRole === 'technician' && <Wrench className="w-4 h-4 text-amber-400" />}
            {currentRole === 'client' && <User className="w-4 h-4 text-blue-400" />}
            <span className="font-semibold">
              Modo Activo: <span className="uppercase text-white underline font-bold">{currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente'}</span>
            </span>
            <span className="hidden md:inline text-gray-400">
              ({currentRole === 'admin' ? 'Acceso total de edición y configuración' : currentRole === 'technician' ? 'Puede actualizar estado Kanban, añadir notas y escanear QR' : 'Registrar equipos y consultar estado de reparación'})
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">LIGHTPRO SPA v1.0</span>
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

      {/* Modals */}

      {/* Equipment Registration Modal */}
      {showRegisterModal && (
        <EquipmentForm
          currentRole={currentRole}
          onAddEquipment={handleAddEquipment}
          onClose={() => setShowRegisterModal(false)}
        />
      )}

      {/* QR Code Scanner Viewfinder Modal */}
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
          onUpdateStatus={handleMoveStage}
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
