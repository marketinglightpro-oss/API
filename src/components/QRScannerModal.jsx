import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, QrCode, Search, Zap, RefreshCw, X, CheckCircle2, ArrowRight, Upload, Image as ImageIcon } from 'lucide-react';

export default function QRScannerModal({ equipmentList, onScanSuccess, onClose }) {
  const [manualInput, setManualInput] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Real Camera Stream
  useEffect(() => {
    let html5QrcodeScanner = null;

    const startScanner = async () => {
      try {
        setCameraError('');
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera ("environment") if available
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('rear')) || devices[devices.length - 1];
          const camId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(camId);

          html5QrcodeScanner = new Html5Qrcode("reader");
          scannerRef.current = html5QrcodeScanner;

          await html5QrcodeScanner.start(
            camId,
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleDecodedText(decodedText);
            },
            () => {
              // Ignore frame parse errors silently while scanning
            }
          );
          setIsScanning(true);
        } else {
          setCameraError('No camera found on this device.');
        }
      } catch (err) {
        console.warn('Camera access warning/error:', err);
        setCameraError('Could not start live camera stream. You can scan from a gallery photo or select a test item below.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  // Process decoded QR code string (either JSON payload or plain ID)
  const handleDecodedText = (decodedText) => {
    let targetId = decodedText.trim();
    let serialSearch = '';
    let nameSearch = '';

    // Try parsing if payload is JSON object
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed) {
        if (parsed.id) targetId = parsed.id.trim();
        if (parsed.serialNumber) serialSearch = parsed.serialNumber.trim();
        if (parsed.name) nameSearch = parsed.name.trim();
      }
    } catch (e) {
      // Not JSON, use raw text
    }

    const cleanTarget = targetId.toLowerCase();
    const cleanSerial = serialSearch.toLowerCase();
    const cleanName = nameSearch.toLowerCase();

    const found = equipmentList.find((e) => {
      const eId = (e.id || '').toLowerCase();
      const eSerial = (e.serialNumber || '').toLowerCase();
      const eName = (e.name || '').toLowerCase();
      const eOwner = (e.ownerName || '').toLowerCase();

      return (
        eId === cleanTarget ||
        (cleanSerial && eSerial === cleanSerial) ||
        eSerial === cleanTarget ||
        (cleanName && eName.includes(cleanName)) ||
        eName.includes(cleanTarget) ||
        eOwner.includes(cleanTarget) ||
        cleanTarget.includes(eId) ||
        cleanTarget.includes(eSerial)
      );
    });

    if (found) {
      setScannedResult(found);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
        setIsScanning(false);
      }
    } else {
      alert(`El código QR o búsqueda ("${targetId}") no coincide con ningún equipo registrado en el sistema.`);
    }
  };

  // Scan QR from Gallery Photo File
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const html5Qr = scannerRef.current || new Html5Qrcode("reader-file-temp");
      const decodedText = await html5Qr.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err) {
      alert('No se pudo leer el código QR en la imagen seleccionada. Por favor asegúrate de que la foto sea clara e intenta de nuevo.');
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleDecodedText(manualInput.trim());
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
              <h3 className="font-bold text-sm tracking-tight text-white">Escáner de Cámara Real</h3>
              <p className="text-[10px] text-gray-400">Escaneo de códigos QR en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Viewfinder Box */}
        <div className="relative w-full min-h-[240px] sm:min-h-[260px] rounded-2xl bg-black overflow-hidden border border-gray-800 flex flex-col items-center justify-center">
          
          {/* HTML5 QR Camera Container */}
          <div id="reader" className="w-full h-full text-center" />
          <div id="reader-file-temp" className="hidden" />

          {/* Fallback framing if camera permissions pending / error */}
          {cameraError && (
            <div className="p-4 text-center text-xs text-amber-300 bg-amber-950/40 rounded-xl m-3 border border-amber-800/40">
              <p className="font-semibold mb-1">Cámara no disponible</p>
              <p className="text-[10px] text-gray-300">{cameraError}</p>
            </div>
          )}

          {/* Action buttons bar for Camera Gallery & Camera Switch */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-gray-200 transition-all"
              title="Cargar foto desde Galería"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Subir Foto QR</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

        </div>

        {/* Scan Result Recognized Card */}
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
            
            {/* Quick Select Preset Equipment list */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                O Selecciona Equipo Registrado para Ver Ficha:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                {equipmentList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setScannedResult(item)}
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
                O Buscar por ID / Serie Manualmente:
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
