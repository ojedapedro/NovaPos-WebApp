import { db } from './firebase';
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  writeBatch, query, orderBy, limit, getDoc, updateDoc
} from 'firebase/firestore';
import {
  Product, Client, SaleHeader, SaleDetail, CashMovement,
  Supplier, PurchaseItem, PurchaseHeader, PurchaseDetail,
  SaleStatus, CreditPayment, PaymentMethod, TransactionType, TransactionOrigin,
  SupplierPayment, PurchaseStatus
} from '../types';
import {
  INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_SALES, INITIAL_DETAILS,
  INITIAL_MOVEMENTS, INITIAL_SUPPLIERS, INITIAL_PURCHASES, INITIAL_PURCHASE_DETAILS
} from './mockData';

// ─────────────────────────────────────────
// LocalStorage Keys (cache layer)
// ─────────────────────────────────────────
const LS = {
  PRODUCTS:          'nova_products',
  CLIENTS:           'nova_clients',
  SUPPLIERS:         'nova_suppliers',
  SALES_HEADER:      'nova_sales_header',
  SALES_DETAIL:      'nova_sales_detail',
  PURCHASES_HEADER:  'nova_purchases_header',
  PURCHASES_DETAIL:  'nova_purchases_detail',
  MOVEMENTS:         'nova_movements',
  CREDIT_PAYMENTS:   'nova_credit_payments',
  SUPPLIER_PAYMENTS: 'nova_supplier_payments',
};

// ─────────────────────────────────────────
// Firestore Collection Names
// ─────────────────────────────────────────
const FS = {
  PRODUCTS:          'products',
  CLIENTS:           'clients',
  SUPPLIERS:         'suppliers',
  SALES:             'sales',
  SALE_DETAILS:      'salesDetails',
  PURCHASES:         'purchases',
  PURCHASE_DETAILS:  'purchaseDetails',
  MOVEMENTS:         'movements',
  CREDIT_PAYMENTS:   'creditPayments',
  SUPPLIER_PAYMENTS: 'supplierPayments',
};

// ─────────────────────────────────────────
// In-Memory Cache
// ─────────────────────────────────────────
interface AppCache {
  products:         Product[];
  clients:          Client[];
  suppliers:        Supplier[];
  sales:            SaleHeader[];
  details:          SaleDetail[];
  purchases:        PurchaseHeader[];
  purchaseDetails:  PurchaseDetail[];
  movements:        CashMovement[];
  creditPayments:   CreditPayment[];
  supplierPayments: SupplierPayment[];
}

let cache: AppCache = {
  products: [], clients: [], suppliers: [], sales: [],
  details: [], purchases: [], purchaseDetails: [], movements: [], creditPayments: [], supplierPayments: []
};

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Lee un array de localStorage; si vacío devuelve el fallback */
const fromLS = <T>(key: string, fallback: T[]): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* ignore */ }
  return fallback;
};

/** Actualiza caché + localStorage simultáneamente */
const setCache = <K extends keyof AppCache>(cacheKey: K, lsKey: string, data: AppCache[K]) => {
  cache[cacheKey] = data;
  localStorage.setItem(lsKey, JSON.stringify(data));
};

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/** Sube un documento a Firestore sin bloquear la UI (fire & forget) */
const fsSet = (col: string, id: string, data: object) => {
  if (IS_DEMO_MODE) return;
  setDoc(doc(db, col, id), data).catch(e => console.warn(`[Firestore] Error escribiendo ${col}/${id}:`, e));
};

/** Elimina un documento de Firestore sin bloquear la UI */
const fsDel = (col: string, id: string) => {
  if (IS_DEMO_MODE) return;
  deleteDoc(doc(db, col, id)).catch(e => console.warn(`[Firestore] Error eliminando ${col}/${id}:`, e));
};

/** Carga una colección completa de Firestore como array tipado */
const fsGetAll = async <T>(col: string): Promise<T[]> => {
  if (IS_DEMO_MODE) return [];
  const snap = await getDocs(collection(db, col));
  return snap.docs.map(d => d.data() as T);
};

// ─────────────────────────────────────────
// Bootstrap: carga inicial desde localStorage
// ─────────────────────────────────────────
const loadFromLocalStorage = () => {
  cache.products        = fromLS(LS.PRODUCTS,         INITIAL_PRODUCTS);
  cache.clients         = fromLS(LS.CLIENTS,          INITIAL_CLIENTS);
  cache.suppliers       = fromLS(LS.SUPPLIERS,        INITIAL_SUPPLIERS);
  cache.sales           = fromLS(LS.SALES_HEADER,     INITIAL_SALES);
  cache.details         = fromLS(LS.SALES_DETAIL,     INITIAL_DETAILS);
  cache.purchases       = fromLS(LS.PURCHASES_HEADER, INITIAL_PURCHASES);
  cache.purchaseDetails = fromLS(LS.PURCHASES_DETAIL, INITIAL_PURCHASE_DETAILS);
  cache.movements       = fromLS(LS.MOVEMENTS,        INITIAL_MOVEMENTS);
  cache.creditPayments  = fromLS(LS.CREDIT_PAYMENTS,  []);
  cache.supplierPayments= fromLS(LS.SUPPLIER_PAYMENTS,[]);
};

// Carga inmediata al importar el módulo
loadFromLocalStorage();

// ─────────────────────────────────────────
// DataService
// ─────────────────────────────────────────
export const DataService = {

  /**
   * Inicializa la app: carga desde Firestore y actualiza el caché local.
   * Si falla (sin internet), la app sigue funcionando desde localStorage.
   */
  initialize: async () => {
    try {
      const [products, clients, suppliers, sales, details,
             purchases, purchaseDetails, movements, creditPayments, supplierPayments] = await Promise.all([
        fsGetAll<Product>(FS.PRODUCTS),
        fsGetAll<Client>(FS.CLIENTS),
        fsGetAll<Supplier>(FS.SUPPLIERS),
        fsGetAll<SaleHeader>(FS.SALES),
        fsGetAll<SaleDetail>(FS.SALE_DETAILS),
        fsGetAll<PurchaseHeader>(FS.PURCHASES),
        fsGetAll<PurchaseDetail>(FS.PURCHASE_DETAILS),
        fsGetAll<CashMovement>(FS.MOVEMENTS),
        fsGetAll<CreditPayment>(FS.CREDIT_PAYMENTS),
        fsGetAll<SupplierPayment>(FS.SUPPLIER_PAYMENTS),
      ]);

      if (products.length > 0) setCache('products',        LS.PRODUCTS,         products);
      if (clients.length > 0)  setCache('clients',         LS.CLIENTS,          clients);
      if (suppliers.length > 0) setCache('suppliers',      LS.SUPPLIERS,        suppliers);
      if (sales.length > 0)    setCache('sales',           LS.SALES_HEADER,     sales);
      if (details.length > 0)  setCache('details',         LS.SALES_DETAIL,     details);
      if (purchases.length > 0) setCache('purchases',      LS.PURCHASES_HEADER, purchases);
      if (purchaseDetails.length > 0) setCache('purchaseDetails', LS.PURCHASES_DETAIL, purchaseDetails);
      if (movements.length > 0) setCache('movements',      LS.MOVEMENTS,        movements);
      if (creditPayments.length > 0) setCache('creditPayments', LS.CREDIT_PAYMENTS, creditPayments);
      if (supplierPayments.length > 0) setCache('supplierPayments', LS.SUPPLIER_PAYMENTS, supplierPayments);

      console.log('[NovaPOS] Datos sincronizados desde Firestore.');
    } catch (e) {
      console.warn('[NovaPOS] Sin conexión — usando datos locales.', e);
    }
  },

  // ── Getters (leen del caché en memoria, síncronos, ultra-rápidos) ──
  getProducts:        (): Product[]        => cache.products,
  getClients:         (): Client[]         => cache.clients,
  getSuppliers:       (): Supplier[]       => cache.suppliers,
  getSales:           (): SaleHeader[]     => cache.sales,
  getSaleDetails:     (): SaleDetail[]     => cache.details,
  getPurchases:       (): PurchaseHeader[] => cache.purchases,
  getPurchaseDetails: (): PurchaseDetail[] => cache.purchaseDetails,
  getMovements:       (): CashMovement[]   => cache.movements,
  getCreditPayments:  (): CreditPayment[]  => cache.creditPayments,
  getSupplierPayments:(): SupplierPayment[]=> cache.supplierPayments,

  /** Saldo pendiente de una venta a crédito */
  getCreditBalance: (saleId: string): number => {
    const sale = cache.sales.find(s => s.id === saleId);
    if (!sale) return 0;
    const paid = cache.creditPayments
      .filter(p => p.saleId === saleId)
      .reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, sale.total - paid);
  },

  /** Saldo pendiente de una compra a crédito */
  getPurchaseBalance: (purchaseId: string): number => {
    const purchase = cache.purchases.find(p => p.id === purchaseId);
    if (!purchase) return 0;
    const paid = cache.supplierPayments
      .filter(p => p.purchaseId === purchaseId)
      .reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, purchase.total - paid);
  },

  // ── Escrituras: caché + localStorage + Firestore (async) ──

  saveSale: (header: SaleHeader, details: SaleDetail[], movements: CashMovement[]) => {
    const newSales     = [...cache.sales, header];
    const newDetails   = [...cache.details, ...details];
    const newMovements = [...cache.movements, ...movements];
    const newProducts  = cache.products.map(p => {
      const sold = details.find(d => d.productId === p.id);
      return sold ? { ...p, stock: p.stock - sold.quantity } : p;
    });

    setCache('sales',     LS.SALES_HEADER, newSales);
    setCache('details',   LS.SALES_DETAIL, newDetails);
    setCache('movements', LS.MOVEMENTS,    newMovements);
    setCache('products',  LS.PRODUCTS,     newProducts);

    // Sync to Firestore
    fsSet(FS.SALES, header.id, header);
    details.forEach(d => fsSet(FS.SALE_DETAILS, `${d.saleId}_${d.productId}`, d));
    movements.forEach(m => fsSet(FS.MOVEMENTS, m.id, m));
    newProducts.forEach(p => fsSet(FS.PRODUCTS, p.id, p));
  },

  addCreditPayment: (payment: CreditPayment): void => {
    const newPayments = [...cache.creditPayments, payment];
    setCache('creditPayments', LS.CREDIT_PAYMENTS, newPayments);

    // Movimiento de caja automático
    const movement: CashMovement = {
      id: `M${crypto.randomUUID().split('-')[0].toUpperCase()}`,
      date: payment.date,
      type: TransactionType.INGRESO,
      origin: TransactionOrigin.VENTA,
      method: payment.method,
      amount: payment.amount,
      currency: 'USD',
      reference: payment.reference || payment.saleId,
    };
    const newMovements = [...cache.movements, movement];
    setCache('movements', LS.MOVEMENTS, newMovements);

    // Recalcular estado de la venta
    const sale = cache.sales.find(s => s.id === payment.saleId);
    if (sale) {
      const totalPaid = newPayments
        .filter(p => p.saleId === payment.saleId)
        .reduce((acc, p) => acc + p.amount, 0);
      const newStatus = totalPaid >= sale.total - 0.01 ? SaleStatus.PAGADA : SaleStatus.PARCIAL;
      const newSales = cache.sales.map(s =>
        s.id === payment.saleId ? { ...s, status: newStatus } : s
      );
      setCache('sales', LS.SALES_HEADER, newSales);
      fsSet(FS.SALES, sale.id, { ...sale, status: newStatus });
    }

    fsSet(FS.CREDIT_PAYMENTS, payment.id, payment);
    fsSet(FS.MOVEMENTS, movement.id, movement);
  },

  updateClient: (client: Client): void => {
    const index = cache.clients.findIndex(c => c.id === client.id);
    const newClients = [...cache.clients];
    if (index >= 0) newClients[index] = client; else newClients.push(client);
    setCache('clients', LS.CLIENTS, newClients);
    fsSet(FS.CLIENTS, client.id, client);
  },

  savePurchase: (items: PurchaseItem[], movement?: CashMovement, supplierId?: string) => {
    const purchaseId = `C${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const total = items.reduce((acc, item) => acc + (item.quantity * item.newCost), 0);
    const currency = movement ? movement.currency : 'USD';
    
    // Si no hay CashMovement, fue una compra a crédito
    const status = movement ? PurchaseStatus.PAGADA : PurchaseStatus.PENDIENTE;

    const header: PurchaseHeader = {
      id: purchaseId, 
      date: movement ? movement.date : new Date().toISOString(),
      supplierId: supplierId || (movement?.supplierId || ''),
      total: total, 
      currency: currency,
      reference: movement?.reference || '', 
      status
    };
    
    const details: PurchaseDetail[] = items.map(item => ({
      purchaseId, productId: item.id, quantity: item.quantity,
      costUnit: item.newCost, subtotal: item.quantity * item.newCost
    }));

    const newPurchases       = [...cache.purchases, header];
    const newPurchaseDetails = [...cache.purchaseDetails, ...details];
    const newProducts        = cache.products.map(p => {
      const bought = items.find(i => i.id === p.id);
      return bought ? { ...p, stock: p.stock + bought.quantity, priceBuy: bought.newCost } : p;
    });

    setCache('purchases',       LS.PURCHASES_HEADER, newPurchases);
    setCache('purchaseDetails', LS.PURCHASES_DETAIL, newPurchaseDetails);
    setCache('products',        LS.PRODUCTS,         newProducts);

    fsSet(FS.PURCHASES, header.id, header);
    details.forEach(d => fsSet(FS.PURCHASE_DETAILS, `${d.purchaseId}_${d.productId}`, d));
    newProducts.forEach(p => fsSet(FS.PRODUCTS, p.id, p));

    if (movement) {
        const newMovements = [...cache.movements, movement];
        setCache('movements', LS.MOVEMENTS, newMovements);
        fsSet(FS.MOVEMENTS, movement.id, movement);
    }
  },

  addSupplierPayment: (payment: SupplierPayment): void => {
    const newPayments = [...cache.supplierPayments, payment];
    setCache('supplierPayments', LS.SUPPLIER_PAYMENTS, newPayments);

    // Generar movimiento de caja automático por el egreso
    const movement: CashMovement = {
      id: `M${crypto.randomUUID().split('-')[0].toUpperCase()}`,
      date: payment.date,
      type: TransactionType.EGRESO,
      origin: TransactionOrigin.COMPRA,
      method: payment.method,
      amount: payment.amount,
      currency: 'USD',
      reference: payment.reference || payment.purchaseId,
      supplierId: cache.purchases.find(p => p.id === payment.purchaseId)?.supplierId
    };
    const newMovements = [...cache.movements, movement];
    setCache('movements', LS.MOVEMENTS, newMovements);

    // Recalcular estado de la compra
    const purchase = cache.purchases.find(p => p.id === payment.purchaseId);
    if (purchase) {
      const totalPaid = newPayments
        .filter(p => p.purchaseId === payment.purchaseId)
        .reduce((acc, p) => acc + p.amount, 0);
      const newStatus = totalPaid >= purchase.total - 0.01 ? PurchaseStatus.PAGADA : PurchaseStatus.PARCIAL;
      const newPurchases = cache.purchases.map(p =>
        p.id === payment.purchaseId ? { ...p, status: newStatus } : p
      );
      setCache('purchases', LS.PURCHASES_HEADER, newPurchases);
      fsSet(FS.PURCHASES, purchase.id, { ...purchase, status: newStatus });
    }

    fsSet(FS.SUPPLIER_PAYMENTS, payment.id, payment);
    fsSet(FS.MOVEMENTS, movement.id, movement);
  },

  addMovement: (movement: CashMovement) => {
    const newMovements = [...cache.movements, movement];
    setCache('movements', LS.MOVEMENTS, newMovements);
    fsSet(FS.MOVEMENTS, movement.id, movement);
  },

  updateProduct: (product: Product) => {
    const index = cache.products.findIndex(p => p.id === product.id);
    const newProducts = [...cache.products];
    if (index >= 0) newProducts[index] = product; else newProducts.push(product);
    setCache('products', LS.PRODUCTS, newProducts);
    fsSet(FS.PRODUCTS, product.id, product);
  },

  saveSupplier: (supplier: Supplier) => {
    const index = cache.suppliers.findIndex(s => s.id === supplier.id);
    const newSuppliers = [...cache.suppliers];
    if (index >= 0) newSuppliers[index] = supplier; else newSuppliers.push(supplier);
    setCache('suppliers', LS.SUPPLIERS, newSuppliers);
    fsSet(FS.SUPPLIERS, supplier.id, supplier);
  },

  deleteSupplier: (supplierId: string) => {
    const newSuppliers = cache.suppliers.filter(s => s.id !== supplierId);
    setCache('suppliers', LS.SUPPLIERS, newSuppliers);
    fsDel(FS.SUPPLIERS, supplierId);
  },

  saveClient: (client: Client) => {
    const newClients = [...cache.clients, client];
    setCache('clients', LS.CLIENTS, newClients);
    fsSet(FS.CLIENTS, client.id, client);
  },
};
