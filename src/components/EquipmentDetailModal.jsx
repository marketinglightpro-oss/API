import React, { useState } from 'react';
import { KANBAN_STAGES } from '../mockData';
import { X, User, Phone, Mail, Wrench, Plus, QrCode, CheckCircle2 } from 'lucide-react';

export default function EquipmentDetailModal({ item, currentRole, onUpdateStatus, onAddNote, onOpenQRModal, onClose }) {
  const [newNoteText, setNewNoteText] = useState('');

  const currentStage = KANBAN_STAGES.find((s) => s.id === item.status) || KANBAN_STAGES[0];

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const authorName = currentRole === 'admin' ? 'Usuario Administrador' : currentRole === 'technician' ? 'Técnico Encargado' : item.ownerName;
    const authorRole = currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente';

    onAddNote(item.id, {
      id: Date.now(),
      author: authorName,
      role: authorRole,
      text: newNoteText.trim(),
      date: new Date().toISOString(),
    });

    setNewNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="liquid-card bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-4 sm:p-8 border-t sm:border border-white/80 shadow-2xl overflow-y-auto max-h-[92vh] relative">
        
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 mb-4 border-b border-gray-200/80">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold bg-black text-white px-2 py-0.5 rounded-full">
                {item.id}
              </span>
              <span className="text-[10px] sm:text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                S/N: {item.serialNumber}
              </span>
              <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border ${currentStage.badgeBg}`}>
                {currentStage.title}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-gray-900 tracking-tight">{item.name}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenQRModal(item)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              title="Ver Código QR"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Step Process Progress Indicator Bar */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-gray-50/80 border border-gray-200/60">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            ETAPA DE MANTENIMIENTO:
          </label>
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center">
            {KANBAN_STAGES.map((stg) => {
              const isPassed = stg.step <= currentStage.step;
              const isCurrent = stg.step === currentStage.step;

              return (
                <div
                  key={stg.id}
                  onClick={() => {
                    if (currentRole === 'admin' || currentRole === 'technician') {
                      onUpdateStatus(item.id, stg.id);
                    }
                  }}
                  className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all ${
                    currentRole === 'admin' || currentRole === 'technician' ? 'cursor-pointer hover:border-black' : ''
                  } ${
                    isCurrent
                      ? 'bg-black text-white border-black shadow-md'
                      : isPassed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                    <span>P{stg.step}</span>
                    {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600 hidden sm:inline" />}
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-semibold truncate mt-0.5">{stg.title.split(' ')[0]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          
          {/* Main Info Column */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Issue Description */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200/70">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">
                Falla Reportada / Motivo de Mantenimiento
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">{item.issue}</p>
            </div>

            {/* Quick Status Update Selector */}
            {(currentRole === 'admin' || currentRole === 'technician') && (
              <div className="p-3 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Actualizar Etapa</h4>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">Notifica al cliente</p>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                  className="bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {KANBAN_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.step}. {s.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Technician Notes Log Section */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-black" />
                <span>Notas Técnicas y Observaciones</span>
              </h3>

              {/* Note Input */}
              <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Agregar nota técnica..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="submit"
                  className="liquid-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(!item.notes || item.notes.length === 0) ? (
                  <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">No hay notas técnicas registradas aún.</p>
                ) : (
                  item.notes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span className="font-bold text-gray-800">{note.author} ({note.role})</span>
                        <span>{new Date(note.date).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar: Owner Contact & Specs */}
          <div className="space-y-3 sm:space-y-4">
            
            {/* Owner Contact Card */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2 text-xs">
              <h3 className="font-bold text-gray-900 uppercase text-[10px] tracking-wider">Propietario</h3>
              
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-900">{item.ownerName}</span>
              </div>

              {item.ownerPhone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{item.ownerPhone}</span>
                </div>
              )}

              {item.ownerEmail && (
                <div className="flex items-center gap-2 text-gray-600 truncate">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{item.ownerEmail}</span>
                </div>
              )}
            </div>

            {/* Equipment Metadata */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5 text-xs">
              <h3 className="font-bold text-gray-900 uppercase text-[10px] tracking-wider">Especificaciones</h3>
              <div className="flex justify-between border-b border-gray-200/50 pb-1">
                <span className="text-gray-500">Categoría:</span>
                <span className="font-semibold text-gray-900">{item.category}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-1">
                <span className="text-gray-500">Prioridad:</span>
                <span className="font-semibold text-gray-900">{item.priority}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-1">
                <span className="text-gray-500">Técnico:</span>
                <span className="font-semibold text-gray-900">{item.technicianAssigned || 'Sin asignar'}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
