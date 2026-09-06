import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, Bell, Truck, Loader2, Users, RefreshCw, Wallet, LogOut, Edit2, Check, X, Menu, HandCoins, Receipt } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Transactions } from './pages/Transactions';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { CashClose } from './pages/CashClose';
import { Login } from './pages/Login';
import { Receivables } from './pages/Receivables';
import { Payables } from './pages/Payables';
import { ExchangeRate } from './types';
import { DataService } from './services/dataService';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'purchases' | 'inventory' | 'transactions' | 'suppliers' | 'cash_close' | 'receivables' | 'payables'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { showNotification } = useNotification();
  const { isAuthenticated, currentUser, logout } = useAuth();
  
  // Rate Editor State
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempUsd, setTempUsd] = useState('');
  const [tempEur, setTempEur] = useState('');

  // Exchange Rate State (Persisted in localStorage)
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>(() => {
    const saved = localStorage.getItem('nova_exchange_rate');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignorar error de parsing
      }
    }
    return { usdToBs: 45.50, eurToBs: 48.20 };
  });

  useEffect(() => {
    const initApp = async () => {
      await DataService.initialize();
      setIsLoading(false);
    };
    initApp();
  }, []);

  const handleUpdateExchangeRates = (usd: number, eur: number) => {
    const newRates = { usdToBs: usd, eurToBs: eur };
    setExchangeRate(newRates);
    localStorage.setItem('nova_exchange_rate', JSON.stringify(newRates));
    showNotification('success', `Tasas actualizadas correctamente`);
    setIsEditingRate(false);
  };

  // Wrapper para retrocompatibilidad con el POS existente si llama a onUpdateExchangeRate
  const handleUpdateExchangeRate = (newRate: number) => {
    handleUpdateExchangeRates(newRate, exchangeRate.eurToBs);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await DataService.initialize();
      // Pequeño timeout para que el usuario perciba la acción si es muy rápida
      await new Promise(resolve => setTimeout(resolve, 800));
      showNotification('success', 'Datos sincronizados correctamente con la nube');
    } catch (error) {
      console.error("Error syncing", error);
      showNotification('error', 'Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard exchangeRate={exchangeRate} />;
      case 'pos': return <POS exchangeRate={exchangeRate} onUpdateExchangeRate={handleUpdateExchangeRate} />;
      case 'purchases': return <Purchases exchangeRate={exchangeRate} />;
      case 'inventory': return <Inventory />;
      case 'transactions': return <Transactions />;
      case 'suppliers': return <Suppliers />;
      case 'cash_close': return <CashClose exchangeRate={exchangeRate} />;
      case 'receivables': return <Receivables />;
      case 'payables': return <Payables />;
      default: return <Dashboard exchangeRate={exchangeRate} />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700 animate-pulse">Cargando NovaPOS...</h2>
      </div>
    );
  }

  const navigateTo = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">NovaPOS</h1>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Gestión Comercial</span>
            </div>
          </div>
          <button 
            className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <button 
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigateTo('pos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'pos' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShoppingCart size={20} />
            <span>Punto de Venta</span>
          </button>

          <button 
            onClick={() => navigateTo('purchases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'purchases' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Truck size={20} />
            <span>Compras</span>
          </button>

          <button 
             onClick={() => navigateTo('inventory')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Package size={20} />
            <span>Inventario</span>
          </button>

          <button 
             onClick={() => navigateTo('suppliers')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'suppliers' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Users size={20} />
            <span>Proveedores</span>
          </button>

          <button 
             onClick={() => navigateTo('transactions')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <DollarSign size={20} />
            <span>Movimientos</span>
          </button>

          <button 
             onClick={() => navigateTo('receivables')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'receivables' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <HandCoins size={20} />
            <span>Por Cobrar</span>
          </button>

          <button 
             onClick={() => navigateTo('payables')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'payables' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Receipt size={20} />
            <span>Por Pagar</span>
          </button>

          <button 
             onClick={() => navigateTo('cash_close')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'cash_close' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Wallet size={20} />
            <span>Cierre de Caja</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-200">
            <div className="flex justify-between items-center mb-2">
               <p className="text-xs opacity-80">Tasa del día</p>
               {!isEditingRate ? (
                  <button onClick={() => {
                     setTempUsd(exchangeRate.usdToBs.toString());
                     setTempEur(exchangeRate.eurToBs.toString());
                     setIsEditingRate(true);
                  }} className="text-white opacity-80 hover:opacity-100 transition-opacity" title="Editar Tasas">
                     <Edit2 size={12} />
                  </button>
               ) : (
                  <div className="flex gap-2">
                     <button onClick={() => {
                         const u = parseFloat(tempUsd);
                         const e = parseFloat(tempEur);
                         if (!isNaN(u) && !isNaN(e) && u > 0 && e > 0) {
                            handleUpdateExchangeRates(u, e);
                         } else {
                            showNotification('error', 'Valores de tasa inválidos');
                         }
                     }} className="text-green-300 hover:text-green-100" title="Guardar">
                        <Check size={14} />
                     </button>
                     <button onClick={() => setIsEditingRate(false)} className="text-red-300 hover:text-red-100" title="Cancelar">
                        <X size={14} />
                     </button>
                  </div>
               )}
            </div>
            
            {isEditingRate ? (
               <div className="space-y-2 mt-2">
                 <div className="flex justify-between items-center">
                   <span className="font-bold text-sm">USD</span>
                   <input type="number" step="0.01" value={tempUsd} onChange={e => setTempUsd(e.target.value)} className="w-16 text-right text-black text-sm p-0.5 rounded" />
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="font-bold text-sm">EUR</span>
                   <input type="number" step="0.01" value={tempEur} onChange={e => setTempEur(e.target.value)} className="w-16 text-right text-black text-sm p-0.5 rounded" />
                 </div>
               </div>
            ) : (
               <>
                 <div className="flex justify-between items-center">
                   <span className="font-bold">USD</span>
                   <span className="font-mono">{exchangeRate.usdToBs.toFixed(2)} Bs</span>
                 </div>
                 <div className="flex justify-between items-center mt-1">
                   <span className="font-bold">EUR</span>
                   <span className="font-mono">{exchangeRate.eurToBs.toFixed(2)} Bs</span>
                 </div>
               </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-10 print:hidden">
          <div className="flex items-center gap-3">
             <button 
               className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg mr-1"
               onClick={() => setIsMobileMenuOpen(true)}
             >
               <Menu size={24} />
             </button>
             <h1 className="text-lg md:text-xl font-bold text-gray-800 capitalize truncate">
             {activeTab === 'dashboard' ? 'Dashboard' :
              activeTab === 'pos' ? 'Punto de Venta' :
              activeTab === 'purchases' ? 'Compras' :
              activeTab === 'inventory' ? 'Inventario' :
              activeTab === 'suppliers' ? 'Proveedores' :
              activeTab === 'transactions' ? 'Movimientos de Caja' :
              activeTab === 'cash_close' ? 'Cierre de Caja' : 
              activeTab === 'receivables' ? 'Cuentas por Cobrar' :
              activeTab === 'payables' ? 'Cuentas por Pagar' : activeTab}
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Sync Button */}
             <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}
                title="Sincronizar datos con la nube"
             >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
             </button>

             <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
               <Bell size={20} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             
             {/* User Dropdown / Info */}
             <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="flex flex-col items-end">
                   <span className="text-sm font-bold text-gray-700 capitalize">{currentUser}</span>
                   <span className="text-xs text-gray-400">Administrador</span>
                </div>
                <div className="w-10 h-10 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm uppercase">
                   {currentUser.substring(0, 2)}
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1"
                  title="Cerrar Sesión"
                >
                   <LogOut size={18} />
                </button>
             </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 custom-scrollbar relative print:overflow-visible print:bg-white">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;