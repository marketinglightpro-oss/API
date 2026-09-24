import React, { useState, useRef } from 'react';
import { KANBAN_STAGES } from '../mockData';
import { X, User, Phone, Mail, Wrench, Plus, QrCode, CheckCircle2, Camera, Image as ImageIcon, Trash2, Eye, Calendar, UserCheck, Clock, MessageSquare, History, Tag, AlertTriangle, ChevronRight, Shield } from 'lucide-react';

export default function EquipmentDetailModal({
  item,
  currentRole,
  currentUser,
  teamMembers = [],
  onUpdateStatus,
  onAssignTechnician,
  onSetPromisedDate,
  onAddNote,
  onDeleteEquipment,
  onOpenQRModal,
  onClose,
}) {
  const [activeActivityTab, setActiveActivityTab] = useState('notes'); // 'notes' | 'history'
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgente':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-600" /> Urgente</span>;
      case 'Baja':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">Baja</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">Media</span>;
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

    const authorName = currentUser?.user_metadata?.full_name || currentUser?.email || (currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : item.ownerName);
    const authorRole = currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Administrador' : currentRole === 'technician' ? 'Técnico' : 'Cliente';

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

  // Assign logged in user to equipment
  const handleAssignToMe = () => {
    const myName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Técnico Usuario';
    if (onAssignTechnician) {
      onAssignTechnician(item.id, myName);
    }
  };

  // Combine item damage photos from photos array or single photoUrl
  const allEquipmentPhotos = item.photos && item.photos.length > 0
    ? item.photos
    : item.photoUrl ? [item.photoUrl] : [];

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-5 lg:p-[30px] bg-black/70 backdrop-blur-xl flex items-center justify-center animate-fadeIn">
      <div className="liquid-card bg-white rounded-[28px] w-full h-full max-w-none max-h-none border border-gray-200 shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Jira-Style Top Navigation & Header Bar */}
        <div className="px-4 sm:px-8 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
          
          {/* Left Breadcrumb & Asset Key */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-mono font-extrabold bg-black text-white px-3 py-1 rounded-xl text-xs shadow-md">
              {item.id}
            </span>
            <span className="text-gray-300 font-bold">/</span>
            <span className="font-mono text-gray-700 bg-white px-2.5 py-0.5 rounded-lg font-semibold text-[11px] border border-gray-200 shadow-xs">
              S/N: {item.serialNumber}
            </span>
            <span className="text-gray-300 font-bold hidden sm:inline">/</span>
            <span className="hidden sm:inline-block font-semibold text-gray-700 bg-white px-3 py-0.5 rounded-full text-[11px] border border-gray-200 shadow-xs">
              {item.category}
            </span>
          </div>

          {/* Right Action Bar: Status Select & Action Buttons */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            
            {/* Quick Status Select Button */}
            {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') ? (
              <select
                value={item.status}
                onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                className="bg-black text-white font-extrabold text-xs px-3.5 py-2 rounded-2xl shadow-md border border-gray-800 cursor-pointer focus:outline-none hover:bg-gray-900 transition-all"
              >
                {KANBAN_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>Etapa: {s.step}. {s.title}</option>
                ))}
              </select>
            ) : (
              <span className={`text-xs font-bold px-3.5 py-1.5 rounded-2xl border shadow-sm ${currentStage.badgeBg}`}>
                {currentStage.title}
              </span>
            )}

            <button
              onClick={() => onOpenQRModal(item)}
              className="p-2.5 rounded-2xl bg-white hover:bg-black hover:text-white text-gray-900 transition-all shadow-sm border border-gray-200"
              title="Ver / Imprimir Etiqueta QR"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {(currentRole === 'super_admin' || currentRole === 'admin') && onDeleteEquipment && (
              <button
                onClick={() => onDeleteEquipment(item.id)}
                className="p-2.5 rounded-2xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition-all shadow-sm border border-red-200 flex items-center gap-1.5 text-xs font-bold"
                title="Eliminar Ficha de Equipo (Exclusivo Admin / Super Admin)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar Ficha</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-black hover:text-white flex items-center justify-center text-gray-600 transition-all shadow-sm border border-gray-200"
              title="Cerrar Ficha"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Jira Main Layout (Scrollable Body with 30px Padding) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-[30px] grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-[30px] bg-white">
          
          {/* LEFT COLUMN: Title, Description, Damage Photos & Activity Tabs (Jira Ratio ~ 68% -> lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Asset Title */}
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                {item.name}
              </h1>
            </div>

            {/* Description / Reported Issue Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                Descripción de la Falla / Motivo
              </h3>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 text-xs text-gray-800 leading-relaxed font-medium shadow-sm">
                {item.issue}
              </div>
            </div>

            {/* Equipment Damage Photos Section */}
            {allEquipmentPhotos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-black" />
                    <span>Fotografías de Daño / Evidencias de Ingreso ({allEquipmentPhotos.length})</span>
                  </h3>
                  <span className="text-[10px] text-gray-400">Clic para ampliar</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {allEquipmentPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPreviewPhoto(photoUrl)}
                      className="relative rounded-2xl overflow-hidden border border-gray-200 h-28 bg-black cursor-pointer group shadow-sm hover:border-black transition-all"
                    >
                      <img src={photoUrl} alt={`Foto Daño ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 bg-black/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md font-bold">
                        Foto {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jira-Style Activity & Comments Tabbed Section */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              
              {/* Activity Bar Tabs */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                    Actividad & Hilo de Mantenimiento
                  </h3>
                  <div className="flex items-center bg-white border border-gray-200 p-1 rounded-xl text-xs font-semibold shadow-xs">
                    <button
                      onClick={() => setActiveActivityTab('notes')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        activeActivityTab === 'notes' ? 'bg-black text-white shadow-sm font-bold' : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      Comentarios ({item.notes?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveActivityTab('history')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        activeActivityTab === 'history' ? 'bg-black text-white shadow-sm font-bold' : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <History className="w-3 h-3 inline mr-1" />
                      Historial ({item.history?.length || 0})
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab 1: Comments & Technical Notes Input & Feed */}
              {activeActivityTab === 'notes' && (
                <div className="space-y-4">
                  
                  {/* Jira Style Comment Box */}
                  <form onSubmit={handleAddNoteSubmit} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(currentUser?.user_metadata?.full_name || currentUser?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={2}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Añadir un comentario u observación técnica sobre la reparación..."
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        />

                        {/* Evidence Draft Preview */}
                        {notePhotos.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200">
                            <span className="text-[10px] font-semibold text-gray-500">Evidencias:</span>
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

                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => notePhotoInputRef.current?.click()}
                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5 text-black" />
                            <span>Adjuntar Evidencia Foto</span>
                          </button>
                          <input
                            type="file"
                            ref={notePhotoInputRef}
                            onChange={handleAddNotePhoto}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                          />

                          <button
                            type="submit"
                            className="liquid-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Guardar Comentario</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Notes Feed */}
                  <div className="space-y-3">
                    {(!item.notes || item.notes.length === 0) ? (
                      <p className="text-xs text-gray-400 italic p-4 bg-white border border-gray-200 rounded-2xl text-center">No hay comentarios técnicos registrados aún.</p>
                    ) : (
                      item.notes.map((note) => (
                        <div key={note.id} className="p-4 rounded-2xl bg-white border border-gray-200 text-xs space-y-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-[10px]">
                                {note.author ? note.author[0].toUpperCase() : 'T'}
                              </div>
                              <span className="font-extrabold text-gray-900">{note.author}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white">
                                {note.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(note.date).toLocaleString()}
                            </span>
                          </div>

                          {note.text && <p className="text-gray-800 leading-relaxed font-medium pl-8">{note.text}</p>}

                          {/* Evidence photos */}
                          {note.photos && note.photos.length > 0 && (
                            <div className="pl-8 pt-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Evidencias Adjuntas:</span>
                              <div className="flex flex-wrap gap-2">
                                {note.photos.map((ph, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setSelectedPreviewPhoto(ph)}
                                    className="w-16 h-16 rounded-xl overflow-hidden border border-gray-300 bg-black cursor-pointer hover:border-black transition-all relative group shadow-sm"
                                  >
                                    <img src={ph} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                      <Eye className="w-4 h-4 text-white" />
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
              )}

              {/* Tab 2: Stage Movement History */}
              {activeActivityTab === 'history' && (
                <div className="space-y-2">
                  {(!item.history || item.history.length === 0) ? (
                    <p className="text-xs text-gray-400 italic p-4 bg-white border border-gray-200 rounded-2xl text-center">Sin historial de etapas.</p>
                  ) : (
                    item.history.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-gray-200 text-xs flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-gray-900">Etapa actualizada a "{KANBAN_STAGES.find(s => s.id === h.stage)?.title || h.stage}"</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          <span>{h.updatedBy}</span> • <span>{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>

          {/* RIGHT SIDEBAR: Jira Structured "Detalles" Panel (~ 32% width -> lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Jira Structured Details Container */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 space-y-4 text-xs shadow-md">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="font-extrabold text-gray-900 uppercase text-xs tracking-wider">
                  Detalles del Activo
                </h3>
              </div>

              {/* Detail Rows */}
              <div className="space-y-3 text-xs">
                
                {/* Persona Asignada */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-gray-500 font-semibold">
                    <span>Persona asignada:</span>
                    {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') && (
                      <button
                        onClick={handleAssignToMe}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Asignarme a mí
                      </button>
                    )}
                  </div>
                  
                  {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') ? (
                    <select
                      value={item.technicianAssigned || ''}
                      onChange={(e) => onAssignTechnician && onAssignTechnician(item.id, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Sin asignar</option>
                      {teamMembers.map((m) => (
                        <option key={m.id || m.email} value={m.full_name}>
                          {m.full_name} ({getRoleLabel(m.role)})
                        </option>
                      ))}
                      {!teamMembers.some(m => m.full_name === 'Carlos Mendoza') && <option value="Carlos Mendoza">Carlos Mendoza (Técnico)</option>}
                      {!teamMembers.some(m => m.full_name === 'Andrés Silva') && <option value="Andrés Silva">Andrés Silva (Administrador)</option>}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-xs">
                      <UserCheck className="w-4 h-4 text-gray-500" />
                      <span className="font-bold text-gray-900">{item.technicianAssigned || 'Sin asignar'}</span>
                    </div>
                  )}
                </div>

                {/* Prioridad */}
                <div className="flex items-center justify-between py-1 border-t border-gray-200 pt-2">
                  <span className="text-gray-500 font-semibold">Prioridad:</span>
                  <div>{getPriorityBadge(item.priority)}</div>
                </div>

                {/* Fecha Promesa de Reparación */}
                <div className="space-y-1 border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between text-gray-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fecha de Vencimiento / Promesa:</span>
                    </span>
                  </div>

                  {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') ? (
                    <input
                      type="date"
                      value={item.promisedDate || ''}
                      onChange={(e) => onSetPromisedDate && onSetPromisedDate(item.id, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  ) : (
                    <div>
                      {item.promisedDate ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.promisedDate}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Por definir</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Propietario / Cliente Info Card */}
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <span className="text-gray-500 font-extrabold uppercase text-[10px] tracking-wider block">
                    Propietario del Equipo
                  </span>
                  
                  <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-1.5 shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                      <User className="w-3.5 h-3.5 text-black" />
                      <span>{item.ownerName}</span>
                    </div>

                    {item.ownerPhone && (
                      <div className="flex items-center gap-2 text-gray-600 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{item.ownerPhone}</span>
                      </div>
                    )}

                    {item.ownerEmail && (
                      <div className="flex items-center gap-2 text-gray-600 truncate font-mono text-[11px]">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{item.ownerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informador / Empresa Originaria */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs">
                  <span className="text-gray-500 font-semibold">Informador:</span>
                  <div className="flex items-center gap-1.5 font-bold text-gray-900">
                    <img src="/logo.png" alt="LIGHTPRO" className="h-4 object-contain" />
                    <span>LIGHTPRO</span>
                  </div>
                </div>

              </div>

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

