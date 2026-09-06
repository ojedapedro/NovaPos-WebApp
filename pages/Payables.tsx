import React, { useState, useMemo } from 'react';
import {
  Truck, DollarSign, AlertCircle, CheckCircle, Clock,
  X, Check, ChevronDown, ChevronUp, CreditCard, FileText
} from 'lucide-react';
import {
  PurchaseHeader, Supplier, SupplierPayment, PaymentMethod, PurchaseStatus
} from '../types';
import { DataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

const statusBadge = (status: PurchaseStatus) => {
  if (status === PurchaseStatus.PAGADA)
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle size={11} /> Pagada</span>;
  if (status === PurchaseStatus.PARCIAL)
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700"><Clock size={11} /> Parcial</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><AlertCircle size={11} /> Pendiente</span>;
};

interface PaymentModalProps {
  purchase: PurchaseHeader;
  balance: number;
  supplierName: string;
  onClose: () => void;
  onSave: (payment: SupplierPayment) => void;
}
const PaymentModal: React.FC<PaymentModalProps> = ({ purchase, balance, supplierName, onClose, onSave }) => {
  const [amount, setAmount] = useState<string>(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.EFECTIVO_USD);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    if (parsed > balance + 0.001) { alert('El monto no puede superar el saldo pendiente.'); return; }
    const payment: SupplierPayment = {
      id: `SP${crypto.randomUUID().split('-')[0].toUpperCase()}`,
      purchaseId: purchase.id,
      date: new Date().toISOString(),
      amount: parsed,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    };
    onSave(payment);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Registrar Abono</h2>
            <p className="text-sm text-gray-500 mt-0.5">{supplierName} - {purchase.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 rounded-xl p-4 flex items-center justify-between border border-red-100">
            <div>
              <p className="text-xs text-red-500 font-medium">Saldo pendiente</p>
              <p className="text-2xl font-bold text-gray-800">${balance.toFixed(2)}</p>
            </div>
            <DollarSign size={32} className="text-red-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a abonar (USD)</label>
            <input type="number" step="0.01" min="0.01" max={balance}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
              {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <input type="text" className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Ej: Transferencia #789" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <input type="text" className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Ej: Pago parcial acordado" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm">Cancelar</button>
          <button onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
            <Check size={16} /> Registrar Abono
          </button>
        </div>
      </div>
    </div>
  );
};

export const Payables: React.FC = () => {
  const { showNotification } = useNotification();
  const [purchases, setPurchases] = useState<PurchaseHeader[]>(() => DataService.getPurchases());
  const [suppliers] = useState<Supplier[]>(() => DataService.getSuppliers());
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingPurchase, setPayingPurchase] = useState<{ purchase: PurchaseHeader; balance: number } | null>(null);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Proveedor desconocido';

  const enriched = useMemo(() =>
    purchases.map(p => ({
      ...p,
      balance: DataService.getPurchaseBalance(p.id),
      supplierName: getSupplierName(p.supplierId),
      payments: DataService.getSupplierPayments().filter(sp => sp.purchaseId === p.id),
    })),
  [purchases]);

  const displayed = useMemo(() =>
    selectedTab === 'pending'
      ? enriched.filter(p => p.status !== PurchaseStatus.PAGADA)
      : enriched,
  [enriched, selectedTab]);

  const totalPending = useMemo(() =>
    enriched.filter(p => p.status !== PurchaseStatus.PAGADA).reduce((acc, p) => acc + p.balance, 0),
  [enriched]);

  const pendingCount = enriched.filter(p => p.status !== PurchaseStatus.PAGADA).length;

  const handlePayment = (payment: SupplierPayment) => {
    DataService.addSupplierPayment(payment);
    setPurchases(DataService.getPurchases());
    setPayingPurchase(null);
    showNotification('success', `Abono de $${payment.amount.toFixed(2)} registrado correctamente.`);
  };

  return (
    <div className="p-6 animate-fade-in pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Cuentas por Pagar</h2>
        <p className="text-gray-500 text-sm mt-1">Gestion de deudas con proveedores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Adeudado</p>
            <h3 className="text-3xl font-bold text-red-600 mt-1">${totalPending.toFixed(2)}</h3>
            <p className="text-xs text-gray-400 mt-1">Saldo pendiente en USD</p>
          </div>
          <div className="p-4 bg-red-50 text-red-500 rounded-xl"><DollarSign size={28} /></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Deudas Abiertas</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{pendingCount}</h3>
            <p className="text-xs text-gray-400 mt-1">Compras pendientes / parciales</p>
          </div>
          <div className="p-4 bg-yellow-50 text-yellow-500 rounded-xl"><AlertCircle size={28} /></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Compras</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{enriched.length}</h3>
            <p className="text-xs text-green-600 font-medium mt-1">{enriched.filter(p => p.status === PurchaseStatus.PAGADA).length} completamente pagadas</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-500 rounded-xl"><Truck size={28} /></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setSelectedTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTab === 'pending' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Pendientes / Parciales
          {pendingCount > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${selectedTab === 'pending' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button onClick={() => setSelectedTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Todas las Compras
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Sin deudas pendientes</p>
            <p className="text-sm mt-1">Todas las compras estan saldadas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayed.map(p => (
              <div key={p.id}>
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{p.supplierName}</span>
                      {statusBadge(p.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span className="font-mono">{p.id}</span>
                      <span>{new Date(p.date).toLocaleDateString('es-VE')}</span>
                      {p.reference && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{p.reference}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">Total / Saldo</div>
                    <div className="text-sm font-bold text-gray-700">${p.total.toFixed(2)}</div>
                    {p.status !== PurchaseStatus.PAGADA && (
                      <div className="text-sm font-bold text-red-600">Debe: ${p.balance.toFixed(2)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status !== PurchaseStatus.PAGADA && (
                      <button onClick={() => setPayingPurchase({ purchase: p, balance: p.balance })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        <CreditCard size={14} /> Abonar
                      </button>
                    )}
                    {p.payments.length > 0 && (
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === p.id && p.payments.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2"><FileText size={13} /> Historial de abonos</p>
                    <div className="space-y-2">
                      {p.payments.map((pay, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-100 text-sm">
                          <div className="text-gray-600">{new Date(pay.date).toLocaleDateString('es-VE')} - {pay.method}</div>
                          {pay.reference && <div className="text-xs text-gray-400">{pay.reference}</div>}
                          <div className="font-bold text-green-700">+${pay.amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {payingPurchase && (
        <PaymentModal
          purchase={payingPurchase.purchase}
          balance={payingPurchase.balance}
          supplierName={getSupplierName(payingPurchase.purchase.supplierId)}
          onClose={() => setPayingPurchase(null)}
          onSave={handlePayment}
        />
      )}
    </div>
  );
};
