import React, { useState, useRef } from 'react';
import { CATEGORIES, INSPECTION_ITEMS, ASSET_STATUSES, DEFAULT_INSPECTION_CHECKLIST } from '../mockData';
import { PlusCircle, QrCode, X, ShieldAlert, Camera, Upload, Trash2, CheckCircle2, AlertTriangle, XCircle, Tag, CheckSquare, Wrench } from 'lucide-react';

export default function EquipmentForm({ onAddEquipment, onClose, currentRole }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'Audio',
    serialNumber: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    issue: '',
    priority: 'Media',
    assetStatus: 'En reparación',
    inspectionChecklist: { ...DEFAULT_INSPECTION_CHECKLIST },
    technicianAssigned: currentRole === 'technician' ? 'Técnico Usuario' : 'Carlos Mendoza',
    photoUrl: '',
    photos: [],
  });

  const [error, setError] = useState('');
  const photoInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleChecklistChange = (itemKey, statusValue) => {
    setFormData((prev) => ({
      ...prev,
      inspectionChecklist: {
        ...prev.inspectionChecklist,
        [itemKey]: statusValue,
      },
    }));
  };

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

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData((prev) => {
          const updatedPhotos = [...prev.photos, compressedBase64];
          return {
            ...prev,
            photos: updatedPhotos,
            photoUrl: updatedPhotos[0] || '',
          };
        });
      } catch (err) {
        console.error('Error al comprimir la imagen:', err);
      }
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setFormData((prev) => {
      const updatedPhotos = prev.photos.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        photos: updatedPhotos,
        photoUrl: updatedPhotos[0] || '',
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.serialNumber || !formData.ownerName || !formData.issue) {
      setError('Por favor completa todos los campos obligatorios (Nombre, Serie, Propietario y Motivo/Falla).');
      return;
    }

    const newId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      ...formData,
      brand: formData.brand.trim() || 'Genérica',
      id: newId,
      status: 'received',
      createdAt: new Date().toISOString(),
      photos: formData.photos,
      photoUrl: formData.photos[0] || '',
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
      <div className="liquid-card bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-4 sm:p-8 border-t sm:border border-white/80 shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md">
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Registrar Nuevo Equipo / Ficha de Activo</h2>
              <p className="text-[10px] sm:text-xs text-gray-500">Ingreso con inspección de 10 puntos, marca e impresión de QR</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Equipment Name, Brand & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Nombre / Modelo del Equipo *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Sharpy 300 Beam"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Marca del Equipo</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Ej. Clay Paky, Chauvet, Robe, Martin"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
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

          {/* Serial Number, Priority & Asset Availability Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Estado Actual del Equipo *</label>
              <select
                name="assetStatus"
                value={formData.assetStatus}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 sm:py-2.5 text-gray-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
              >
                {ASSET_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 10-Point Physical Inspection Checklist */}
          <div className="p-4 rounded-2xl bg-gray-50/90 border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-900 font-extrabold text-xs flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-black" />
                <span>Estado de Inspección Inicial por Componente (10 Puntos)</span>
              </label>
              <span className="text-[10px] text-gray-500 font-semibold bg-white px-2 py-0.5 rounded-full border border-gray-200">
                Selecciona: Bueno, Regular o Malo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {INSPECTION_ITEMS.map((itemKey) => {
                const currentVal = formData.inspectionChecklist[itemKey] || 'Bueno';
                return (
                  <div key={itemKey} className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2 shadow-xs">
                    <span className="font-bold text-gray-800 text-[11px] truncate">{itemKey}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleChecklistChange(itemKey, 'Bueno')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 border ${
                          currentVal === 'Bueno'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Bueno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChecklistChange(itemKey, 'Regular')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 border ${
                          currentVal === 'Regular'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Regular</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChecklistChange(itemKey, 'Malo')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-0.5 border ${
                          currentVal === 'Malo'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Malo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo Capture Section (Multiple Smartphone Camera / Upload Photos) */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-700 font-semibold text-xs flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-black" />
                <span>Fotografías del Equipo / Evidencias de Daño ({formData.photos.length})</span>
              </label>
              <span className="text-[10px] text-gray-400 font-normal">Múltiples capturas permitidas</span>
            </div>

            {formData.photos.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-black group">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                        Foto {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-black rounded-xl bg-white text-gray-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                  <span>+ Tomar / Agregar Otra Fotografía</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-black rounded-xl bg-white flex flex-col items-center justify-center text-gray-500 hover:text-black transition-all"
              >
                <Camera className="w-6 h-6 mb-1 text-gray-400" />
                <span className="font-semibold text-xs">Tomar Foto con Celular o Subir de Galería</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Puedes adjuntar varias fotografías del estado del activo</span>
              </button>
            )}

            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoCapture}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
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

