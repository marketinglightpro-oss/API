import React from 'react';
import { Activity, Clock, Shield, User, Wrench, Search, ExternalLink } from 'lucide-react';

export default function ActivityLogView({ logs, onSelectEquipment }) {
  const [filterRole, setFilterRole] = React.useState('Todos');
  const [logSearch, setLogSearch] = React.useState('');

  const getEquipmentId = (log) => {
    if (log.equipmentId) return log.equipmentId;
    if (log.equipment_id) return log.equipment_id;
    if (log.detail) {
      const match = log.detail.match(/EQ-\d+/i);
      if (match) return match[0].toUpperCase();
    }
    return null;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesRole = filterRole === 'Todos' || log.role === filterRole || (filterRole === 'Administrador' && log.role === 'Admin') || (filterRole === 'Técnico' && log.role === 'Technician') || (filterRole === 'Cliente' && log.role === 'Client');
    const matchesSearch =
      !logSearch ||
      log.detail.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 mb-12">
      <div className="liquid-card rounded-3xl p-6 sm:p-8 bg-white border border-gray-200/80 shadow-md">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Registro de Actividad y Auditoría del Sistema</h2>
              <p className="text-xs text-gray-500">Historial en tiempo real de cambios de etapa, notas de técnicos e ingresos de equipos</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-full px-4 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="Todos">Todos los Roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Técnico">Técnico</option>
              <option value="Cliente">Cliente</option>
            </select>

            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Buscar actividad..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        {/* Logs Timeline List */}
        <div className="mt-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No hay registros de actividad que coincidan con los filtros.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const eqId = getEquipmentId(log);
              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/60 hover:bg-white hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                      log.role === 'Admin' || log.role === 'Administrador' ? 'bg-black' : log.role === 'Technician' || log.role === 'Técnico' ? 'bg-amber-500' : 'bg-blue-600'
                    }`}>
                      {log.role === 'Admin' || log.role === 'Administrador' ? <Shield className="w-4 h-4" /> : log.role === 'Technician' || log.role === 'Técnico' ? <Wrench className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-gray-900">{log.action}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                          {log.role}: {log.user}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-snug">{log.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {eqId && onSelectEquipment && (
                      <button
                        onClick={() => onSelectEquipment(eqId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-gray-800 text-white text-[11px] font-bold transition-all shadow-xs flex-shrink-0"
                        title={`Abrir ticket ${eqId}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Ticket ({eqId})</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-mono whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

