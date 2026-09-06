import { useEffect, useRef, useCallback } from 'react';

/**
 * useBarcodeScanner
 * Detecta lecturas de pistola USB/Bluetooth (keyboard-emulated).
 * Los escaneres envian los caracteres muy rapido y terminan con Enter.
 * @param onScan  Callback que recibe el codigo escaneado
 * @param enabled Si es false, el hook no hace nada
 * @param minLength Longitud minima para considerar que fue un escaneo
 */
export const useBarcodeScanner = (
  onScan: (code: string) => void,
  enabled: boolean = true,
  minLength: number = 3
) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const SCANNER_THRESHOLD_MS = 80;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const now = Date.now();
    const delta = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (e.key === 'Enter') {
      const code = bufferRef.current.trim();
      if (code.length >= minLength) {
        onScan(code);
      }
      bufferRef.current = '';
      return;
    }

    if (delta > 600) {
      bufferRef.current = '';
    }

    if (e.key.length === 1) {
      bufferRef.current += e.key;
    }
  }, [onScan, minLength]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};
