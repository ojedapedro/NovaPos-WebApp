import React, { useState, useMemo, useCallback } from 'react';
import {
  CreditCard, Search, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Clock, DollarSign,
  Plus, X, User, ArrowUpRight, FileText, Phone, Edit2, Check, Printer
} from 'lucide-react';
import { SaleHeader, SaleStatus, Client, CreditPayment, PaymentMethod } from '../types';
import { DataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PAGE_SIZE = 10;

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; icon: React.ReactNode }> = {
  [SaleStatus.PENDIENTE]: {
    label: 'Pendiente',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertCircle size={14} />
  },
  [SaleStatus.PARCIAL]: {
    label: 'Parcial',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Clock size={14} />
  },
  [SaleStatus.PAGADA]: {
    label: 'Pagada',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 size={14} />
  },
};

interface PaymentModalProps {
  sale: SaleHeader;
  client: Client | undefined;
  balance: number;
  onClose: () => void;
  onPaid: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ sale, client, balance, onClose, onPaid }) => {
  const { showNotification } = useNotification();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.EFECTIVO_USD);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum > 0 && amountNum <= balance + 0.01;

  const handleSubmit = () => {
    if (!isValid) return;
    const payment: CreditPayment = {
      id: `CP${crypto.randomUUID().split('-')[0].toUpperCase()}`,
      saleId: sale.id,
      date: new Date().toISOString(),
      amount: Math.min(amountNum, balance),
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    };
    DataService.addCreditPayment(payment);
    showNotification('success', `Abono de $${payment.amount.toFixed(2)} registrado correctamente.`);
    onPaid();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registrar Abono</h2>
              <p className="text-sm text-gray-500 mt-0.5">Venta {sale.id} · {client?.name || '—'}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Balance Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Saldo pendiente</span>
            <span className="text-xl font-black text-amber-700">${balance.toFixed(2)}</span>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Monto del abono (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            {amountNum > 0 && amountNum > balance + 0.01 && (
              <p className="text-xs text-red-500 mt-1">El abono supera el saldo pendiente.</p>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Método de pago</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {Object.values(PaymentMethod).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Referencia (opcional)</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Nro. de transferencia, Zelle, etc."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Segundo abono del cliente"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Registrar Abono
          </button>
        </div>
      </div>
    </div>
  );
};

export const Receivables: React.FC = () => {
  const { showNotification } = useNotification();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const sales = DataService.getSales();
  const clients = DataService.getClients();
  const creditPayments = DataService.getCreditPayments();

  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, c])),
    [clients, refreshKey]
  );

  // Todas las ventas a crédito (no sólo pendientes)
  const creditSales = useMemo(() => {
    return sales
      .filter(s => s.type === 'Crédito')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, refreshKey]);

  const filtered = useMemo(() => {
    return creditSales.filter(s => {
      const client = clientMap.get(s.clientId);
      const matchesSearch = search === ''
        || s.id.toLowerCase().includes(search.toLowerCase())
        || client?.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [creditSales, search, statusFilter, clientMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary cards
  const totalDebt = useMemo(() =>
    creditSales
      .filter(s => s.status !== SaleStatus.PAGADA)
      .reduce((acc, s) => acc + DataService.getCreditBalance(s.id), 0),
    [creditSales, refreshKey]
  );
  const pendingCount = creditSales.filter(s => s.status === SaleStatus.PENDIENTE).length;
  const partialCount = creditSales.filter(s => s.status === SaleStatus.PARCIAL).length;
  const paidCount = creditSales.filter(s => s.status === SaleStatus.PAGADA).length;

  const handlePaymentRegistered = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleSavePhone = (client: Client) => {
    DataService.updateClient({ ...client, phone: editPhone.trim() });
    setEditingClientId(null);
    showNotification('success', 'Teléfono actualizado.');
    setRefreshKey(k => k + 1);
  };

  const exportAccountStatement = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Estado de Cuenta de Clientes', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString('es-VE')}`, 14, 30);
    
    // Agrupar deuda por cliente
    const debtsByClient: Record<string, number> = {};
    creditSales.filter(s => s.status !== SaleStatus.PAGADA).forEach(s => {
       debtsByClient[s.clientId] = (debtsByClient[s.clientId] || 0) + DataService.getCreditBalance(s.id);
    });

    const tableData = Object.entries(debtsByClient)
      .map(([clientId, debt]) => [
         clientMap.get(clientId)?.name || 'Desconocido',
         clientMap.get(clientId)?.phone || 'N/A',
         `$${debt.toFixed(2)}`
      ])
      .sort((a,b) => parseFloat(b[2].replace('$','')) - parseFloat(a[2].replace('$',''))); // Sort by debt desc

    (doc as any).autoTable({
      startY: 40,
      head: [['Cliente', 'Teléfono', 'Deuda Total (USD)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68); // Red
    doc.text(`Total Cuentas por Cobrar: $${totalDebt.toFixed(2)}`, 14, finalY + 10);

    doc.save(`Estado_Cuenta_Clientes_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in pb-20">
      {selectedSale && (
        <PaymentModal
          sale={selectedSale}
          client={clientMap.get(selectedSale.clientId)}
          balance={DataService.getCreditBalance(selectedSale.id)}
          onClose={() => setSelectedSale(null)}
          onPaid={handlePaymentRegistered}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Cuentas por Cobrar</h2>
          <p className="text-gray-500 text-sm mt-1">Seguimiento de ventas a crédito y abonos de clientes</p>
        </div>
        <button 
           onClick={exportAccountStatement}
           className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
        >
           <Printer size={16} className="text-blue-600"/>
           Estado de Cuenta (PDF)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deuda Total</p>
          <p className="text-2xl font-black text-red-600 mt-1">${totalDebt.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">por cobrar</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-black text-red-500 mt-1">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">sin abono</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parciales</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{partialCount}</p>
          <p className="text-xs text-gray-400 mt-1">con abonos</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cobradas</p>
          <p className="text-2xl font-black text-green-600 mt-1">{paidCount}</p>
          <p className="text-xs text-gray-400 mt-1">completadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por ID de venta o nombre de cliente..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', SaleStatus.PENDIENTE, SaleStatus.PARCIAL, SaleStatus.PAGADA] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {s === 'ALL' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Venta</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay ventas a crédito</p>
                  </td>
                </tr>
              ) : paginated.map(sale => {
                const client = clientMap.get(sale.clientId);
                const balance = DataService.getCreditBalance(sale.id);
                const isFullyPaid = sale.status === SaleStatus.PAGADA;
                const statusCfg = STATUS_CONFIG[sale.status] || STATUS_CONFIG[SaleStatus.PENDIENTE];
                const salePayments = creditPayments.filter(p => p.saleId === sale.id);

                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-gray-800 text-xs">{sale.id}</div>
                      {salePayments.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">{salePayments.length} abono(s)</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center justify-center uppercase shrink-0">
                          {(client?.name || '?').substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{client?.name || 'Desconocido'}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {editingClientId === client?.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={e => setEditPhone(e.target.value)}
                                  className="border border-blue-300 rounded px-1 py-0.5 text-xs w-28 focus:outline-none"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter' && client) handleSavePhone(client); if (e.key === 'Escape') setEditingClientId(null); }}
                                />
                                {client && (
                                  <button onClick={() => handleSavePhone(client)} className="text-green-600"><Check size={12} /></button>
                                )}
                                <button onClick={() => setEditingClientId(null)} className="text-red-400"><X size={12} /></button>
                              </>
                            ) : (
                              <>
                                <Phone size={11} />
                                <span>{client?.phone || 'Sin teléfono'}</span>
                                {client && (
                                  <button
                                    onClick={() => { setEditingClientId(client.id); setEditPhone(client.phone || ''); }}
                                    className="text-gray-300 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-gray-500">
                      {new Date(sale.date).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-gray-800">
                      ${sale.total.toFixed(2)}
                    </td>
                    <td className={`px-5 py-4 text-right font-mono font-bold ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                      ${balance.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {!isFullyPaid ? (
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={12} />
                          Abonar
                        </button>
                      ) : (
                        <span className="text-green-600 text-xs font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 size={14} /> Saldada
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
