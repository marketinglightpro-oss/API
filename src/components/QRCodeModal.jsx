import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, X, Copy, Check, QrCode as QrIcon } from 'lucide-react';

export default function QRCodeModal({ item, onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = React.useState(false);

  const qrData = JSON.stringify({
    id: item.id,
    serialNumber: item.serialNumber,
    name: item.name,
    ownerName: item.ownerName,
  });

  useEffect(() => {
    if (canvasRef.current && item) {
      QRCode.toCanvas(
        canvasRef.current,
        qrData,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#121316',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('Error generando Código QR', error);
        }
      );
    }
  }, [item, qrData]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${item.id}_${item.serialNumber}.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const qrDataUrl = canvasRef.current.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta de Activo - ${item.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; text-align: center; }
            .tag { border: 2px solid #000; border-radius: 16px; padding: 20px; max-width: 350px; margin: 0 auto; text-align: left; }
            .header-logo { text-align: center; margin-bottom: 12px; }
            .header-logo img { height: 32px; object-fit: contain; }
            .id-badge { font-size: 14px; font-family: monospace; font-weight: bold; background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 10px; }
            .qr-container { text-align: center; margin: 15px 0; }
            .qr-container img { width: 180px; height: 180px; }
            .details { font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="header-logo">
              <img src="/logo.png" alt="LIGHT PRO" />
            </div>
            <div class="id-badge">${item.id}</div>
            <div style="font-size:13px; font-weight:bold;">${item.name}</div>
            <div style="font-size:11px; color:#555;">S/N: ${item.serialNumber}</div>
            <div class="qr-container">
              <img src="${qrDataUrl}" alt="Etiqueta QR" />
            </div>
            <div class="details">
              <strong>Propietario:</strong> ${item.ownerName}<br/>
              <strong>Categoría:</strong> ${item.category}<br/>
              <strong>Prioridad:</strong> ${item.priority}
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="liquid-card bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-white/80 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title & Brand */}
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
          <img src="/logo.png" alt="LIGHT PRO" className="h-6 object-contain mb-1" />
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
            <QrIcon className="w-4 h-4 text-black" />
            <span>Etiqueta QR de Equipo</span>
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Escanea con la cámara móvil o el escáner del sistema</p>

        {/* Item Info Box */}
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded-md">
              {item.id}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{item.serialNumber}</span>
          </div>
          <p className="text-xs font-bold text-gray-900 mt-1 line-clamp-1">{item.name}</p>
          <p className="text-[11px] text-gray-500">Cliente: {item.ownerName}</p>
        </div>

        {/* Canvas QR Code Display */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200 inline-block shadow-inner mb-6">
          <canvas ref={canvasRef} className="mx-auto rounded-lg" />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              className="liquid-btn-primary py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="liquid-btn-secondary py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Tag</span>
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full py-2 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡ID Copiado!' : 'Copiar ID de Activo'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
