import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { Camera, X, Zap } from 'lucide-react';

interface CameraBarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: { width: 250, height: 180 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      (decodedText) => {
        onScan(decodedText);
        onClose();
      },
      undefined
    )
    .then(() => setScanning(true))
    .catch((err) => setError('No se pudo acceder a la camara. Verifica los permisos del navegador.'));

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
        <div className="p-4 flex justify-between items-center bg-gray-800">
          <div className="flex items-center gap-2 text-white">
            <Camera size={20} />
            <span className="font-semibold">Escanear con Camara</span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="relative bg-black">
          <div id={containerId} className="w-full" />
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-blue-400 rounded-lg w-64 h-44 opacity-70" />
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm text-center">{error}</div>
        )}

        <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <Zap size={14} className="text-blue-500" />
          Apunta la camara al codigo de barras o QR
        </div>
      </div>
    </div>
  );
};
