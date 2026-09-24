import React, { useState, useRef } from 'react';
import { KANBAN_STAGES } from '../mockData';
import { X, User, Phone, Mail, Wrench, Plus, QrCode, CheckCircle2, Camera, Image as ImageIcon, Trash2, Eye, Calendar, UserCheck } from 'lucide-react';

export default function EquipmentDetailModal({ item, currentRole, teamMembers = [], onUpdateStatus, onAssignTechnician, onSetPromisedDate, onAddNote, onOpenQRModal, onClose }) {
  const [newNoteText, setNewNoteText] = useState('');
  const [notePhotos, setNotePhotos] = useState([]);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState(null);
  const notePhotoInputRef = useRef(null);

  const currentStage = KANBAN_STAGES.find((s) => s.id === item.status) || KANBAN_STAGES[0];

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      default: return 'Cliente';
    }
  };

  // Helper for compressing image
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(event.target.result);
      };
      reader.onerror = () => resolve('');
    });
  };

  const handleAddNotePhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setNotePhotos((prev) => [...prev, compressed]);
      } catch (err) {
        console.error('Error al comprimir imagen de nota:', err);
      }
    }
  };

  const handleRemoveNotePhoto = (idxToRemove) => {
    setNotePhotos((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim() && notePhotos.length === 0) return;

    const authorName = currentRole === 'admin' ? 'Usuario Administrador' : currentRole === 'technician' ? 'Técnico Encargado' : item.ownerName;
    const authorRole = currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente';

    onAddNote(item.id, {
      id: Date.now(),
      author: authorName,
      role: authorRole,
      text: newNoteText.trim(),
      photos: notePhotos,
      date: new Date().toISOString(),
    });

    setNewNoteText('');
    setNotePhotos([]);
  };

  // Combine item damage photos from photos array or single photoUrl
  const allEquipmentPhotos = item.photos && item.photos.length > 0
    ? item.photos
    : item.photoUrl ? [item.photoUrl] : [];

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
            
            {/* Equipment Damage Photos Gallery Section */}
            {allEquipmentPhotos.length > 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200/70">
                <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-black" />
                    <span>Fotografías de Daño / Ingreso ({allEquipmentPhotos.length})</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Toca para ampliar</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {allEquipmentPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPreviewPhoto(photoUrl)}
                      className="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-black cursor-pointer group shadow-sm hover:border-black transition-all"
                    >
                      <img src={photoUrl} alt={`Foto Daño ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                        Foto {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Status Update Selector */}
            {(currentRole === 'admin' || currentRole === 'technician') && (
              <div className="p-3 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Actualizar Etapa de Mantenimiento</h4>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">Notifica al cliente en tiempo real</p>
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

            {/* Technician Notes Log Section with Evidence Photos */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-black" />
                <span>Notas Técnicas, Actualizaciones y Evidencias</span>
              </h3>

              {/* Note Input with Photo Attachment Button */}
              <form onSubmit={handleAddNoteSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Escribe actualización u observación técnica..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  
                  <button
                    type="button"
                    onClick={() => notePhotoInputRef.current?.click()}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Adjuntar evidencia fotográfica"
                  >
                    <Camera className="w-3.5 h-3.5 text-black" />
                    <span className="hidden sm:inline">Evidencia</span>
                  </button>

                  <button
                    type="submit"
                    className="liquid-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={notePhotoInputRef}
                  onChange={handleAddNotePhoto}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {/* Note evidence photos draft preview */}
                {notePhotos.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-gray-100/70 rounded-xl">
                    <span className="text-[10px] font-semibold text-gray-500">Evidencias a adjuntar:</span>
                    <div className="flex items-center gap-1.5">
                      {notePhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-300">
                          <img src={photo} alt={`Evidencia ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNotePhoto(idx)}
                            className="absolute top-0 right-0 p-0.5 bg-red-600 text-white rounded-bl"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              {/* Notes Timeline List with Attached Evidence Photos */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(!item.notes || item.notes.length === 0) ? (
                  <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">No hay notas técnicas ni evidencias registradas aún.</p>
                ) : (
                  item.notes.map((note) => (
                    <div key={note.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-bold text-gray-900">{note.author} ({note.role})</span>
                        <span>{new Date(note.date).toLocaleString()}</span>
                      </div>
                      {note.text && <p className="text-gray-800 font-medium">{note.text}</p>}

                      {/* Render note evidence photos */}
                      {note.photos && note.photos.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Evidencias Adjuntas:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {note.photos.map((ph, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedPreviewPhoto(ph)}
                                className="w-14 h-14 rounded-lg overflow-hidden border border-gray-300 bg-black cursor-pointer hover:border-black transition-all relative group"
                              >
                                <img src={ph} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

            {/* Team Member Assignment & Promised Repair Date Panel */}
            {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') && (
              <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 text-xs">
                <h3 className="font-bold text-amber-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Asignación & Compromiso</span>
                </h3>

                {/* Technician Assignment */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                    Técnico Encargado
                  </label>
                  <select
                    value={item.technicianAssigned || ''}
                    onChange={(e) => onAssignTechnician && onAssignTechnician(item.id, e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Seleccionar del equipo...</option>
                    {teamMembers.map((m) => (
                      <option key={m.id || m.email} value={m.full_name}>
                        {m.full_name} ({getRoleLabel(m.role)})
                      </option>
                    ))}
                    {!teamMembers.some(m => m.full_name === 'Carlos Mendoza') && <option value="Carlos Mendoza">Carlos Mendoza (Técnico)</option>}
                    {!teamMembers.some(m => m.full_name === 'Andrés Silva') && <option value="Andrés Silva">Andrés Silva (Administrador)</option>}
                  </select>
                </div>

                {/* Promised Repair Date */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1 flex items-center justify-between">
                    <span>Fecha Promesa de Reparación</span>
                    <Calendar className="w-3 h-3 text-amber-700" />
                  </label>
                  <input
                    type="date"
                    value={item.promisedDate || ''}
                    onChange={(e) => onSetPromisedDate && onSetPromisedDate(item.id, e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            )}

            {/* Equipment Metadata Specifications */}
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
                <span className="font-bold text-black">{item.technicianAssigned || 'Sin asignar'}</span>
              </div>
              {item.promisedDate && (
                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                  <span className="text-gray-500">Promesa Entrega:</span>
                  <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                    {item.promisedDate}
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Fullscreen Photo Lightbox Preview Modal */}
        {selectedPreviewPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
              <button
                onClick={() => setSelectedPreviewPhoto(null)}
                className="absolute -top-10 right-0 p-2 bg-gray-800 text-white rounded-full hover:bg-white hover:text-black transition-colors"
                title="Cerrar vista previa"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPreviewPhoto}
                alt="Fotografía Ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-gray-800"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
