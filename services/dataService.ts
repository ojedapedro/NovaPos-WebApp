import { Product, Client, SaleHeader, SaleDetail, CashMovement, Supplier, PurchaseItem, PurchaseHeader, PurchaseDetail, SaleStatus, CreditPayment, PaymentMethod, TransactionType, TransactionOrigin } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_SALES, INITIAL_DETAILS, INITIAL_MOVEMENTS, INITIAL_SUPPLIERS, INITIAL_PURCHASES, INITIAL_PURCHASE_DETAILS } from './mockData';
import { ApiService } from './api';

const STORAGE_KEYS = {
  PRODUCTS: 'nova_products',
  CLIENTS: 'nova_clients',
  SUPPLIERS: 'nova_suppliers',
  SALES_HEADER: 'nova_sales_header',
  SALES_DETAIL: 'nova_sales_detail',
  PURCHASES_HEADER: 'nova_purchases_header',
  PURCHASES_DETAIL: 'nova_purchases_detail',
  MOVEMENTS: 'nova_movements',
  CREDIT_PAYMENTS: 'nova_credit_payments',
  LAST_SYNC: 'nova_last_sync'
};

// In-Memory Cache for performance
// DB-04 FIX: Tipado estricto en lugar de `any`
interface AppCache {
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  sales: SaleHeader[];
  details: SaleDetail[];
  purchases: PurchaseHeader[];
  purchaseDetails: PurchaseDetail[];
  movements: CashMovement[];
  creditPayments: CreditPayment[];
}

let cache: AppCache = {
  products: [],
  clients: [],
  suppliers: [],
  sales: [],
  details: [],
  purchases: [],
  purchaseDetails: [],
  movements: [],
  creditPayments: []
};

// Helper to save to local storage and update cache
const updateLocal = <K extends keyof AppCache>(key: string, data: AppCache[K], cacheKey: K) => {
  cache[cacheKey] = data;
  localStorage.setItem(key, JSON.stringify(data));
};

const loadFromStorage = () => {
  cache.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
  cache.clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || JSON.stringify(INITIAL_CLIENTS));
  cache.suppliers = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || JSON.stringify(INITIAL_SUPPLIERS));
  cache.sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES_HEADER) || JSON.stringify(INITIAL_SALES));
  cache.details = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES_DETAIL) || JSON.stringify(INITIAL_DETAILS));
  cache.purchases = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES_HEADER) || JSON.stringify(INITIAL_PURCHASES));
  cache.purchaseDetails = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES_DETAIL) || JSON.stringify(INITIAL_PURCHASE_DETAILS));
  cache.movements = JSON.parse(localStorage.getItem(STORAGE_KEYS.MOVEMENTS) || JSON.stringify(INITIAL_MOVEMENTS));
  cache.creditPayments = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDIT_PAYMENTS) || '[]');
};

// Initial load
loadFromStorage();

export const DataService = {
  initialize: async () => {
    try {
      const cloudData = await ApiService.fetchDatabase();
      if (cloudData) {
        updateLocal(STORAGE_KEYS.PRODUCTS, cloudData.products, 'products');
        updateLocal(STORAGE_KEYS.CLIENTS, cloudData.clients, 'clients');
        updateLocal(STORAGE_KEYS.SUPPLIERS, cloudData.suppliers, 'suppliers');
        updateLocal(STORAGE_KEYS.SALES_HEADER, cloudData.sales, 'sales');
        updateLocal(STORAGE_KEYS.SALES_DETAIL, cloudData.details, 'details');
        updateLocal(STORAGE_KEYS.PURCHASES_HEADER, cloudData.purchases, 'purchases');
        updateLocal(STORAGE_KEYS.PURCHASES_DETAIL, cloudData.purchaseDetails, 'purchaseDetails');
        updateLocal(STORAGE_KEYS.MOVEMENTS, cloudData.movements, 'movements');
        console.log('Data synced with Google Sheets');
      }
    } catch (e) {
      console.warn('Offline mode or API error. Using local data.', e);
    }
  },

  // Getters return from memory cache (Sync, fast)
  getProducts: (): Product[] => cache.products,
  getClients: (): Client[] => cache.clients,
  getSuppliers: (): Supplier[] => cache.suppliers,
  getSales: (): SaleHeader[] => cache.sales,
  getSaleDetails: (): SaleDetail[] => cache.details,
  getPurchases: (): PurchaseHeader[] => cache.purchases,
  getPurchaseDetails: (): PurchaseDetail[] => cache.purchaseDetails,
  getMovements: (): CashMovement[] => cache.movements,
  getCreditPayments: (): CreditPayment[] => cache.creditPayments,

  /** Calcula el saldo pendiente de una venta a crédito */
  getCreditBalance: (saleId: string): number => {
    const sale = cache.sales.find(s => s.id === saleId);
    if (!sale) return 0;
    const paid = cache.creditPayments
      .filter(p => p.saleId === saleId)
      .reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, sale.total - paid);
  },

  // Setters update Cache -> LocalStorage -> Async API Call
  saveSale: (header: SaleHeader, details: SaleDetail[], movements: CashMovement[]) => {
    const newSales = [...cache.sales, header];
    const newDetails = [...cache.details, ...details];
    const newMovements = [...cache.movements, ...movements];
    
    const newProducts = cache.products.map((p: Product) => {
      const soldItem = details.find(d => d.productId === p.id);
      return soldItem ? { ...p, stock: p.stock - soldItem.quantity } : p;
    });

    updateLocal(STORAGE_KEYS.SALES_HEADER, newSales, 'sales');
    updateLocal(STORAGE_KEYS.SALES_DETAIL, newDetails, 'details');
    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');

    ApiService.sendAction('SAVE_SALE', { header, details, movements });
  },

  /** Registra un abono a una venta a crédito y actualiza su estado */
  addCreditPayment: (payment: CreditPayment): void => {
    const newPayments = [...cache.creditPayments, payment];
    updateLocal(STORAGE_KEYS.CREDIT_PAYMENTS, newPayments, 'creditPayments');

    // Generar movimiento de caja por el abono
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
    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');

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
      updateLocal(STORAGE_KEYS.SALES_HEADER, newSales, 'sales');
    }

    ApiService.sendAction('SAVE_CREDIT_PAYMENT', { payment, movement });
  },

  /** Actualiza o crea un cliente */
  updateClient: (client: Client): void => {
    const index = cache.clients.findIndex(c => c.id === client.id);
    const newClients = [...cache.clients];
    if (index >= 0) {
      newClients[index] = client;
    } else {
      newClients.push(client);
    }
    updateLocal(STORAGE_KEYS.CLIENTS, newClients, 'clients');
    ApiService.sendAction('SAVE_CLIENT', client);
  },

  savePurchase: (items: PurchaseItem[], movement: CashMovement) => {
    const purchaseId = `C${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const header: PurchaseHeader = {
        id: purchaseId,
        date: movement.date,
        supplierId: movement.supplierId || '',
        total: movement.amount,
        currency: movement.currency,
        reference: movement.reference || '',
        status: 'Completada'
    };

    const details: PurchaseDetail[] = items.map(item => ({
        purchaseId,
        productId: item.id,
        quantity: item.quantity,
        costUnit: item.newCost,
        subtotal: item.quantity * item.newCost
    }));

    const newMovements = [...cache.movements, movement];
    const newPurchases = [...cache.purchases, header];
    const newPurchaseDetails = [...cache.purchaseDetails, ...details];
    
    const newProducts = cache.products.map((p: Product) => {
      const purchasedItem = items.find(item => item.id === p.id);
      if (purchasedItem) {
        return { 
            ...p, 
            stock: p.stock + purchasedItem.quantity,
            priceBuy: purchasedItem.newCost 
        };
      }
      return p;
    });

    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
    updateLocal(STORAGE_KEYS.PURCHASES_HEADER, newPurchases, 'purchases');
    updateLocal(STORAGE_KEYS.PURCHASES_DETAIL, newPurchaseDetails, 'purchaseDetails');
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');

    ApiService.sendAction('SAVE_PURCHASE', { items, movement, header, details });
  },

  addMovement: (movement: CashMovement) => {
    const newMovements = [...cache.movements, movement];
    updateLocal(STORAGE_KEYS.MOVEMENTS, newMovements, 'movements');
    ApiService.sendAction('SAVE_MOVEMENT', movement);
  },
  
  updateProduct: (product: Product) => {
    const index = cache.products.findIndex((p: Product) => p.id === product.id);
    const newProducts = [...cache.products];
    if (index >= 0) {
      newProducts[index] = product;
    } else {
      newProducts.push(product);
    }
    updateLocal(STORAGE_KEYS.PRODUCTS, newProducts, 'products');
    ApiService.sendAction('SYNC_INVENTORY', product);
  },

  saveSupplier: (supplier: Supplier) => {
    const index = cache.suppliers.findIndex((s: Supplier) => s.id === supplier.id);
    const newSuppliers = [...cache.suppliers];
    if (index >= 0) {
        newSuppliers[index] = supplier;
    } else {
        newSuppliers.push(supplier);
    }
    updateLocal(STORAGE_KEYS.SUPPLIERS, newSuppliers, 'suppliers');
    ApiService.sendAction('SAVE_SUPPLIER', supplier);
  },

  deleteSupplier: (supplierId: string) => {
    const newSuppliers = cache.suppliers.filter((s: Supplier) => s.id !== supplierId);
    updateLocal(STORAGE_KEYS.SUPPLIERS, newSuppliers, 'suppliers');
    ApiService.sendAction('DELETE_SUPPLIER', { id: supplierId });
  },

  saveClient: (client: Client) => {
    const newClients = [...cache.clients, client];
    updateLocal(STORAGE_KEYS.CLIENTS, newClients, 'clients');
    ApiService.sendAction('SAVE_CLIENT', client);
  }
};
