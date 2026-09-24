import React, { useState } from 'react';
import { Camera, QrCode, Search, Zap, RefreshCw, X, CheckCircle2, ArrowRight } from 'lucide-react';

export default function QRScannerModal({ equipmentList, onScanSuccess, onClose }) {
  const [manualInput, setManualInput] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [scannedResult, setScannedResult] = useState(null);

  const handleSimulateScan = (item) => {
    setScannedResult(item);
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const query = manualInput.trim().toLowerCase();
    const found = equipmentList.find(
      (e) =>
        e.id.toLowerCase() === query ||
        e.serialNumber.toLowerCase() === query ||
        e.name.toLowerCase().includes(query)
    );
    if (found) {
      setScannedResult(found);
    } else {
      alert(`No se encontró ningún equipo que coincida con "${manualInput}"`);
    }
  };

  const confirmScanAndOpenDetails = () => {
    if (scannedResult) {
      onScanSuccess(scannedResult);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="liquid-card-dark rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 text-white border-t sm:border border-gray-800 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        
        {/* Close Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">Escáner QR Cámara Móvil</h3>
              <p className="text-[10px] text-gray-400">Escanea la etiqueta física o selecciona equipo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Camera Simulation */}
        <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-black overflow-hidden border border-gray-800 flex flex-col items-center justify-center">
          
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900 to-black opacity-90" />
          
          {/* Corner Framing Markers */}
          <div className="relative w-40 sm:w-48 h-40 sm:h-48 border-2 border-white/20 rounded-2xl flex items-center justify-center shadow-2xl">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-white rounded-br-lg" />
            
            {/* Red Laser Scanline */}
            <div className="w-full h-0.5 bg-red-500 shadow-[0_0_15px_#ef4444] animate-scanline" />
            
            {/* Viewfinder Icon */}
            <QrCode className="w-10 sm:w-12 h-10 sm:h-12 text-white/30" />
          </div>

          {/* Camera Controls Bar */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`p-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all ${
                flashOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30' : 'bg-gray-800/80 text-gray-300'
              }`}
              title="Encender Linterna"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCameraFacing(cameraFacing === 'environment' ? 'user' : 'environment')}
              className="p-2 rounded-full bg-gray-800/80 text-gray-300 hover:text-white backdrop-blur-md transition-all"
              title="Cambiar Cámara"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <span className="absolute bottom-2 text-[10px] text-gray-400 bg-gray-900/80 px-3 py-1 rounded-full border border-gray-800">
            Alinea el código QR dentro del recuadro
          </span>
        </div>

        {/* Scan Result Drawer / Notification */}
        {scannedResult ? (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-left animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                ¡Código QR Reconocido!
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500 text-black px-2 py-0.5 rounded">
                {scannedResult.id}
              </span>
            </div>
            
            <h4 className="font-bold text-sm text-white">{scannedResult.name}</h4>
            <p className="text-xs text-gray-300 mt-0.5">Propietario: {scannedResult.ownerName}</p>
            <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">"{scannedResult.issue}"</p>

            <button
              onClick={confirmScanAndOpenDetails}
              className="mt-3 w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Ver y Actualizar Ficha del Equipo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            
            {/* Quick Test Simulator Buttons */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Simular Escaneo (Selecciona Equipo):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                {equipmentList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSimulateScan(item)}
                    className="p-2 sm:p-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-200 group-hover:text-white truncate max-w-[140px]">
                        {item.name}
                      </span>
                      <span className="font-mono text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                        {item.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block truncate">{item.ownerName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Serial Search Fallback */}
            <form onSubmit={handleManualSearch} className="pt-2 border-t border-gray-800">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                O Buscar por ID / Serie:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ej. EQ-8092..."
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-3.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
