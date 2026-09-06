import React, { useState, useRef, useMemo } from 'react';
import {
  Download, Upload, AlertTriangle, CheckCircle, X,
  TrendingUp, TrendingDown, Minus, ClipboardCheck, Info
} from 'lucide-react';
import { Product } from '../types';
import { DataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

interface AuditRow {
  id: string;
  name: string;
  category: string;
  teorico: number;
  fisico: number | null;
  diferencia: number | null;
}

export const InventoryAudit: React.FC = () => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [hasUploaded, setHasUploaded] = useState(false);

  // ── Descargar plantilla CSV con inventario teorico ──
  const handleDownloadTemplate = () => {
    const products = DataService.getProducts().filter(p => p.active);
    const header = 'ID,Nombre,Categoria,Stock_Teorico,Stock_Fisico';
    const rows = products.map(p =>
      `${p.id},"${p.name.replace(/"/g, '""')}","${p.category.replace(/"/g, '""')}",${p.stock},`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Plantilla descargada. Completa la columna Stock_Fisico y vuelve a subir el archivo.');
  };

  // ── Parsear CSV subido ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showNotification('error', 'El archivo debe ser un CSV.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split('\n');
        if (lines.length < 2) { showNotification('error', 'Archivo vacio o invalido.'); return; }

        const header = lines[0].toLowerCase();
        if (!header.includes('stock_fisico') || !header.includes('stock_teorico')) {
          showNotification('error', 'El archivo no tiene el formato correcto. Descarga la plantilla.');
          return;
        }

        const products = DataService.getProducts();
        const rows: AuditRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          // CSV parse respetando comillas
          const cols = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
          if (cols.length < 5) continue;

          const [id, name, category, teoricoStr, fisicoStr] = cols;
          const teorico = parseFloat(teoricoStr) || 0;
          const fisico = fisicoStr !== '' && fisicoStr !== undefined ? parseFloat(fisicoStr) : null;
          const product = products.find(p => p.id === id);

          rows.push({
            id,
            name: name || product?.name || id,
            category: category || product?.category || '',
            teorico: product ? product.stock : teorico,
            fisico,
            diferencia: fisico !== null ? fisico - (product ? product.stock : teorico) : null,
          });
        }

        setAuditRows(rows);
        setHasUploaded(true);
        showNotification('success', `${rows.length} productos analizados.`);
      } catch (err) {
        showNotification('error', 'Error al procesar el archivo CSV.');
        console.error(err);
      }
    };
    reader.readAsText(file, 'utf-8');
    // Reset input para permitir subir el mismo archivo de nuevo
    e.target.value = '';
  };

  // ── Estadisticas del reporte ──
  const stats = useMemo(() => {
    const compared = auditRows.filter(r => r.diferencia !== null);
    const withDiff = compared.filter(r => r.diferencia !== 0);
    const surplus = compared.filter(r => (r.diferencia ?? 0) > 0);
    const shortage = compared.filter(r => (r.diferencia ?? 0) < 0);
    const missing = auditRows.filter(r => r.diferencia === null);
    return { total: compared.length, withDiff: withDiff.length, surplus: surplus.length, shortage: shortage.length, missing: missing.length };
  }, [auditRows]);

  const diffIcon = (diff: number | null) => {
    if (diff === null) return <Minus size={14} className="text-gray-300" />;
    if (diff > 0) return <TrendingUp size={14} className="text-green-500" />;
    if (diff < 0) return <TrendingDown size={14} className="text-red-500" />;
    return <CheckCircle size={14} className="text-green-400" />;
  };

  const diffBg = (diff: number | null) => {
    if (diff === null) return '';
    if (diff > 0) return 'bg-green-50';
    if (diff < 0) return 'bg-red-50';
    return '';
  };

  return (
    <div className="p-6 animate-fade-in pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardCheck size={26} className="text-blue-600" /> Auditoria de Inventario
        </h2>
        <p className="text-gray-500 text-sm mt-1">Compara el inventario teorico (sistema) contra el conteo fisico real</p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Step 1 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">1</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Descargar Plantilla (Teorico)</h3>
              <p className="text-sm text-gray-500 mb-3">Descarga el CSV con el stock actual del sistema. Completa la columna <span className="font-mono bg-gray-100 px-1 rounded">Stock_Fisico</span> con el conteo real.</p>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                <Download size={16} /> Descargar CSV Teorico
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">2</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Subir Inventario Fisico</h3>
              <p className="text-sm text-gray-500 mb-3">Sube el CSV ya completado para ver el reporte de diferencias.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
              >
                <Upload size={16} /> Subir CSV Fisico
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasUploaded && auditRows.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-500 font-medium">Productos Revisados</p>
              <p className="text-3xl font-black text-gray-800 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 text-center">
              <p className="text-xs text-red-500 font-medium">Con Diferencias</p>
              <p className="text-3xl font-black text-red-600 mt-1">{stats.withDiff}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 text-center">
              <p className="text-xs text-red-500 font-medium flex items-center justify-center gap-1"><TrendingDown size={12} /> Faltantes</p>
              <p className="text-3xl font-black text-red-600 mt-1">{stats.shortage}</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 text-center">
              <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1"><TrendingUp size={12} /> Sobrantes</p>
              <p className="text-3xl font-black text-green-600 mt-1">{stats.surplus}</p>
            </div>
          </div>

          {stats.missing > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Info size={16} /> {stats.missing} producto(s) no tienen stock fisico ingresado (columna vacia).
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Reporte de Diferencias</h3>
              <span className="text-xs text-gray-400">{auditRows.length} productos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Codigo</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-center">Teorico</th>
                    <th className="px-4 py-3 text-center">Fisico</th>
                    <th className="px-4 py-3 text-center">Diferencia</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditRows.map((row) => (
                    <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${diffBg(row.diferencia)}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{row.category}</span></td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">{row.teorico}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {row.fisico !== null ? row.fisico : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.diferencia !== null ? (
                          <span className={`font-bold ${row.diferencia > 0 ? 'text-green-600' : row.diferencia < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {row.diferencia > 0 ? '+' : ''}{row.diferencia}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">{diffIcon(row.diferencia)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!hasUploaded && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardCheck size={52} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">Descarga la plantilla, completa el conteo fisico y vuelve a subirla.</p>
        </div>
      )}
    </div>
  );
};
