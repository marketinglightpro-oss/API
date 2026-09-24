import React from 'react';
import { Package, Wrench, CheckCircle2, AlertTriangle, QrCode, PlusCircle, Search } from 'lucide-react';

export default function MetricsOverview({ equipmentList, onOpenRegister, onOpenScanner, activeCategory, setActiveCategory, searchQuery, setSearchQuery }) {
  const total = equipmentList.length;
  const inRepair = equipmentList.filter(e => e.status === 'in_repair' || e.status === 'diagnostic').length;
  const ready = equipmentList.filter(e => e.status === 'ready').length;
  const urgent = equipmentList.filter(e => e.priority === 'Urgente' || e.priority === 'Urgent').length;

  const categories = ['Todos', 'Audio', 'Iluminación', 'Rigging', 'Video', 'Energía'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 mb-4 sm:mb-6 space-y-4 sm:space-y-6">
      
      {/* Liquid Hero Banner */}
      <div className="liquid-card rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 relative overflow-hidden">
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

          {/* Quick Action Buttons for Mobile / Desktop */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onOpenRegister}
              className="liquid-btn-primary px-3 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span>Registrar</span>
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

        {/* Quick Stat Bar Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200/60">
          <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">TOTAL EQUIPOS</p>
              <p className="text-base sm:text-xl font-bold text-gray-900">{total}</p>
            </div>
          </div>

          <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-200">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">EN REPARACIÓN</p>
              <p className="text-base sm:text-xl font-bold text-gray-900">{inRepair}</p>
            </div>
          </div>

          <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">ENTREGADOS</p>
              <p className="text-base sm:text-xl font-bold text-gray-900">{ready}</p>
            </div>
          </div>

          <div className="bg-white/70 p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-200">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">URGENTES</p>
              <p className="text-base sm:text-xl font-bold text-gray-900">{urgent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="liquid-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
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
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por equipo, serie, cliente..."
            className="w-full bg-white/90 border border-gray-200 rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-black transition-all shadow-inner"
          />
        </div>
      </div>

    </div>
  );
}
