import React, { useState } from 'react';
import { KANBAN_STAGES } from '../mockData';
import { ChevronRight, ChevronLeft, QrCode, User, Wrench, Volume2, Lightbulb, Video, Zap, Anchor, Eye, Calendar, Trash2, Clock, AlertTriangle } from 'lucide-react';

const formatCreationDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const isPromisedDateDue = (promisedDateStr, status) => {
  if (!promisedDateStr || status === 'ready') return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return promisedDateStr <= todayStr;
};

export default function KanbanBoard({
  equipmentList,
  currentRole,
  onMoveStage,
  onSelectItem,
  onOpenQRModal,
  onDeleteEquipment,
}) {
  const [activeMobileStage, setActiveMobileStage] = useState('received');

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Audio': return <Volume2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'Iluminación':
      case 'Lighting': return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      case 'Video': return <Video className="w-3.5 h-3.5 text-purple-600" />;
      case 'Energía':
      case 'Power': return <Zap className="w-3.5 h-3.5 text-red-500" />;
      case 'Rigging': return <Anchor className="w-3.5 h-3.5 text-emerald-600" />;
      default: return <Wrench className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgente':
      case 'Urgent':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Urgente</span>;
      case 'Media':
      case 'Medium':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Media</span>;
      default:
        return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Baja</span>;
    }
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId && (currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician')) {
      onMoveStage(itemId, targetStageId);
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 md:px-8 mb-20 md:mb-12">
      
      {/* Mobile Stage Selector Strip (Visible on mobile screens) */}
      <div className="lg:hidden mb-4 overflow-x-auto pb-1 flex items-center gap-2 scrollbar-none">
        {KANBAN_STAGES.map((stage) => {
          const count = equipmentList.filter((item) => item.status === stage.id).length;
          const isSelected = activeMobileStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveMobileStage(stage.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span>{stage.title.split(' ')[0]}</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Container - Full Screen Fluid Width for maximum card room */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start w-full">
        {KANBAN_STAGES.map((stage) => {
          const itemsInStage = equipmentList.filter((item) => item.status === stage.id);
          const isVisibleOnMobile = activeMobileStage === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`bg-white/70 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 border border-gray-200/70 shadow-sm min-h-[300px] lg:min-h-[550px] flex-col transition-all hover:border-gray-300 w-full ${
                isVisibleOnMobile ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/80">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <h3 className="text-xs font-bold text-gray-900 tracking-tight">{stage.title}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${stage.badgeBg}`}>
                  {itemsInStage.length}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-0.5">
                {itemsInStage.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-3">
                    <p className="text-xs text-gray-400 font-medium">Sin equipos en esta etapa</p>
                    <p className="text-[10px] text-gray-400">Arrastra o cambia el estado aquí</p>
                  </div>
                ) : (
                  itemsInStage.map((item) => (
                    <div
                      key={item.id}
                      draggable={currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician'}
                      onDragStart={(e) => handleDragStart(e, item)}
                      className="liquid-card bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group relative cursor-pointer w-full"
                    >
                      {/* Top Header: ID & Priority */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-gray-400 tracking-wider">
                          {item.id}
                        </span>
                        {getPriorityBadge(item.priority)}
                      </div>

                      {/* Equipment Name */}
                      <h4 
                        onClick={() => onSelectItem(item)}
                        className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-black line-clamp-2 mb-1"
                      >
                        {item.name}
                      </h4>

                      {/* Category & Serial */}
                      <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md text-gray-700 font-medium text-[10px]">
                          {getCategoryIcon(item.category)}
                          {item.category}
                        </span>
                        <span className="truncate font-mono text-[10px] text-gray-400">{item.serialNumber}</span>
                      </div>

                      {/* Owner & Assigned Technician Preview */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-600 mb-2">
                        <span className="flex items-center gap-1 truncate font-medium">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.ownerName}</span>
                        </span>

                        {item.technicianAssigned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <Wrench className="w-2.5 h-2.5 text-blue-600" />
                            {item.technicianAssigned}
                          </span>
                        )}
                      </div>

                      {/* Creation & Promised Date Badges */}
                      <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                        {item.createdAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-100/90 px-2 py-0.5 rounded-md border border-gray-200">
                            <Clock className="w-3 h-3 text-gray-500" />
                            Ingreso: {formatCreationDate(item.createdAt)}
                          </span>
                        )}
                        {item.promisedDate && (
                          isPromisedDateDue(item.promisedDate, item.status) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-900 bg-red-100 px-2 py-0.5 rounded-md border border-red-300 animate-pulse shadow-xs" title="¡Atención: Promesa de Entrega Vencida o Vence Hoy!">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              Promesa: {item.promisedDate} (¡Hoy/Vencido!)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/60">
                              <Calendar className="w-3 h-3 text-amber-700" />
                              Promesa: {item.promisedDate}
                            </span>
                          )
                        )}
                      </div>

                      {/* Issue Preview */}
                      <p className="text-[11px] text-gray-500 line-clamp-2 bg-gray-50 p-2 rounded-xl border border-gray-100 mb-2 italic">
                        "{item.issue}"
                      </p>

                      {/* Registered By Creator Badge (Esquina inferior) */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2 pt-1 border-t border-gray-100/60">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200/80" title="Usuario que registró este equipo en el sistema">
                          <User className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span>Creado por: <strong className="text-gray-900">{item.createdBy || item.ownerName}</strong></span>
                        </span>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {/* View & QR Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItem(item);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ver Ficha</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenQRModal(item);
                            }}
                            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            title="Ver Código QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          {(currentRole === 'super_admin' || currentRole === 'admin') && onDeleteEquipment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEquipment(item.id);
                              }}
                              className="p-1.5 rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-700 transition-colors"
                              title="Eliminar Ficha (Exclusivo Admin / Super Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Quick Stage Advance */}
                        {(currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'technician') && (
                          <div className="flex items-center gap-1">
                            {stage.step > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prevStage = KANBAN_STAGES.find(s => s.step === stage.step - 1);
                                  if (prevStage) onMoveStage(item.id, prevStage.id);
                                }}
                                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                                title="Mover Anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {stage.step < 5 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStage = KANBAN_STAGES.find(s => s.step === stage.step + 1);
                                  if (nextStage) onMoveStage(item.id, nextStage.id);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-black text-white text-xs font-semibold flex items-center gap-1 hover:bg-gray-800 transition-all shadow-sm"
                                title="Avanzar Etapa"
                              >
                                <span>Avanzar</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
