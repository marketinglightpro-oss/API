import React, { useState } from 'react';
import { CATEGORIES } from '../mockData';
import { PlusCircle, QrCode, X, ShieldAlert } from 'lucide-react';

export default function EquipmentForm({ onAddEquipment, onClose, currentRole }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Audio',
    serialNumber: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    issue: '',
    priority: 'Media',
    technicianAssigned: currentRole === 'technician' ? 'Técnico Usuario' : 'Carlos Mendoza',
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.serialNumber || !formData.ownerName || !formData.issue) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    const newId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      ...formData,
      id: newId,
      status: 'received',
      createdAt: new Date().toISOString(),
      notes: [],
      history: [
        {
          stage: 'received',
          timestamp: new Date().toISOString(),
          updatedBy: currentRole === 'client' ? formData.ownerName : 'Recepción',
        }
      ]
    };

    onAddEquipment(newRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="liquid-card bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 border-t sm:border border-white/80 shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md">
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Registrar Nuevo Equipo</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Crear ficha de activo e imprimir QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 text-xs">
          
          {/* Equipment Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Nombre / Modelo del Equipo *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Meyer Sound LEOPARD"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Categoría *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Serial Number & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Número de Serie / ID Activo *</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Ej. MS-LEO-99481"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black font-mono transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Prioridad *</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="Baja">Baja (Mantenimiento de Rutina)</option>
                <option value="Media">Media (Reparación Estándar)</option>
                <option value="Urgente">Urgente (Crítico para Evento)</option>
              </select>
            </div>
          </div>

          {/* Owner Details */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/80 border border-gray-200/60 space-y-2.5">
            <h3 className="font-bold text-gray-900 text-xs tracking-tight">
              Datos del Propietario / Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-gray-600 font-medium mb-0.5">Nombre / Empresa *</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Ej. Eventos S.A."
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-0.5">Teléfono</label>
                <input
                  type="text"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  placeholder="+57 310 000 0000"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-0.5">Correo</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  placeholder="cliente@eventos.com"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Issue / Maintenance Reason */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Motivo / Falla Reportada *</label>
            <textarea
              name="issue"
              rows={2}
              value={formData.issue}
              onChange={handleChange}
              placeholder="Describe la falla..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200/80">
            <button
              type="button"
              onClick={onClose}
              className="liquid-btn-secondary px-4 py-2 rounded-full font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="liquid-btn-primary px-5 py-2 rounded-full font-semibold text-xs flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Registrar y Generar QR</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
