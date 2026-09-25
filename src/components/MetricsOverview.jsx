import React from 'react';
import { Package, Wrench, CheckCircle2, AlertTriangle, QrCode, PlusCircle, Search, Clock, ShieldAlert } from 'lucide-react';

export default function MetricsOverview({ equipmentList, onOpenRegister, onOpenScanner, activeCategory, setActiveCategory, searchQuery, setSearchQuery }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const total = equipmentList.length;
  const inRepair = equipmentList.filter(e => e.status === 'in_repair' || e.status === 'diagnostic').length;
  const ready = equipmentList.filter(e => e.status === 'ready').length;
  const urgent = equipmentList.filter(e => e.priority === 'Urgente' || e.priority === 'Urgent').length;

  // Active tickets with promisedDate due today or overdue (promisedDate <= todayStr AND not ready)
  const dueOrOverdue = equipmentList.filter(e => e.promisedDate && e.status !== 'ready' && e.promisedDate <= todayStr).length;

  // Delivered on time (ready status, AND if promisedDate existed, delivered on or before promisedDate)
  const deliveredOnTime = equipmentList.filter(e => {
    if (e.status !== 'ready') return false;
    if (!e.promisedDate) return true;
    const readyHistoryItem = (e.history || []).find(h => h.stage === 'ready');
    if (readyHistoryItem && readyHistoryItem.timestamp) {
      const deliveredDateStr = readyHistoryItem.timestamp.split('T')[0];
      return deliveredDateStr <= e.promisedDate;
    }
    return true;
  }).length;

  const categories = ['Todos', 'Audio', 'Iluminación', 'Rigging', 'Video', 'Energía'];

  return (
    <div className="w-full px-3 sm:px-6 md:px-8 mb-4 sm:mb-6 space-y-4 sm:space-y-6">
      
      {/* Liquid Hero Banner - Full Fluid Width */}
      <div className="liquid-card rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 relative overflow-hidden w-full">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-br from-gray-200/40 to-white/0 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">RESUMEN DEL SISTEMA</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              {total} <span className="text-lg sm:text-2xl font-medium text-gray-500">Equipos Registrados</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md hidden sm:block">
              Seguimiento por código QR en tiempo real, diagnóstico de fallas e historial de reparaciones por cliente.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onOpenRegister}
              className="liquid-btn-primary px-3 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span>Registrar Equipo</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="liquid-btn-secondary px-3 sm:px-5 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <QrCode className="w-4 h-4 text-black flex-shrink-0" />
              <span>Escanear QR</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Bar Grid - 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200/60 w-full">
          
          {/* Total Equipos */}
          <div className="bg-white/80 p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">TOTAL EQUIPOS</p>
              <p className="text-base font-bold text-gray-900">{total}</p>
            </div>
          </div>

          {/* En Reparación */}
          <div className="bg-white/80 p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-amber-200">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">EN REPARACIÓN</p>
              <p className="text-base font-bold text-gray-900">{inRepair}</p>
            </div>
          </div>

          {/* Entregados A Tiempo */}
          <div className="bg-white/80 p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">A TIEMPO</p>
              <p className="text-base font-bold text-emerald-700">{deliveredOnTime}</p>
            </div>
          </div>

          {/* En Vencimiento / Hoy (Rojo Urgente) */}
          <div className={`p-3 rounded-2xl border shadow-xs flex items-center gap-2.5 transition-all ${
            dueOrOverdue > 0 
              ? 'bg-red-50/90 border-red-200 ring-2 ring-red-400/30 animate-pulse' 
              : 'bg-white/80 border-gray-100'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs ${
              dueOrOverdue > 0 ? 'bg-red-600 text-white shadow-red-200' : 'bg-gray-200 text-gray-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-red-700 uppercase tracking-tight">EN VENCIMIENTO</p>
              <p className={`text-base font-black ${dueOrOverdue > 0 ? 'text-red-700' : 'text-gray-900'}`}>{dueOrOverdue}</p>
            </div>
          </div>

          {/* Entregados Total */}
          <div className="bg-white/80 p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">ENTREGADOS</p>
              <p className="text-base font-bold text-gray-900">{ready}</p>
            </div>
          </div>

          {/* Urgentes */}
          <div className="bg-white/80 p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-orange-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">URGENTES</p>
              <p className="text-base font-bold text-gray-900">{urgent}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Filter & Search Bar - Full Width */}
      <div className="liquid-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isSel = (cat === 'Todos' && !activeCategory) || activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === 'Todos' ? '' : cat)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-black text-white font-semibold shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por equipo, serie, cliente..."
            className="w-full bg-white/90 border border-gray-200 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-black transition-all shadow-inner"
          />
        </div>
      </div>

    </div>
  );
}
