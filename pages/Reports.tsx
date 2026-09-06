import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Download, TrendingUp, Package, Users, DollarSign, FileText } from 'lucide-react';
import { DataService } from '../services/dataService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SaleStatus } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  // ─── Data Fetching ───
  const sales = useMemo(() => DataService.getSales().filter(s => s.status !== SaleStatus.ANULADA), []);
  const saleDetails = useMemo(() => DataService.getSaleDetails(), []);
  const products = useMemo(() => DataService.getProducts(), []);
  const clients = useMemo(() => DataService.getClients(), []);

  // ─── Chart Data Processing ───
  
  // 1. Ventas de los ultimos 7 dias
  const last7DaysSales = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Generar labels de los ultimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
      data[dateStr] = 0;
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      saleDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - saleDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays <= 7) {
        const dateStr = saleDate.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
        if (data[dateStr] !== undefined) {
          data[dateStr] += sale.totalUSD;
        }
      }
    });
    
    return Object.entries(data).map(([name, total]) => ({ name, total }));
  }, [sales]);

  // 2. Top 5 Productos mas vendidos
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    saleDetails.forEach(detail => {
      counts[detail.productId] = (counts[detail.productId] || 0) + detail.quantity;
    });
    
    return Object.entries(counts)
      .map(([productId, quantity]) => ({
        name: products.find(p => p.id === productId)?.name.substring(0, 15) + '...' || 'Desconocido',
        cantidad: quantity
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [saleDetails, products]);

  // 3. Ventas por Categoria
  const salesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    saleDetails.forEach(detail => {
      const product = products.find(p => p.id === detail.productId);
      if (product) {
        data[product.category] = (data[product.category] || 0) + detail.subtotal;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [saleDetails, products]);

  // ─── PDF Exports ───

  const exportInventoryPDF = () => {
    const doc = new jsPDF();
    const activeProducts = products.filter(p => p.active);
    
    doc.setFontSize(18);
    doc.text('Reporte de Estado de Inventario', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString('es-VE')}`, 14, 30);
    
    const tableData = activeProducts.map(p => [
      p.id,
      p.name,
      p.category,
      p.stock.toString(),
      `$${p.priceSell.toFixed(2)}`,
      p.stock <= p.minStock ? 'BAJO' : 'OK'
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [['ID', 'Producto', 'Categoria', 'Stock', 'Precio Venta', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'BAJO') {
            data.cell.styles.textColor = [239, 68, 68]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    doc.save(`Inventario_${new Date().getTime()}.pdf`);
  };

  const exportSalesPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Reporte de Ventas (Ultimos 30 dias)', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString('es-VE')}`, 14, 30);
    
    // Filter sales from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = sales
      .filter(s => new Date(s.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const tableData = recentSales.map(s => [
      s.id,
      new Date(s.date).toLocaleDateString('es-VE'),
      clients.find(c => c.id === s.clientId)?.name || 'Cliente de Contado',
      s.type,
      `$${s.totalUSD.toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [['Recibo', 'Fecha', 'Cliente', 'Tipo', 'Total USD']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    const total = recentSales.reduce((sum, s) => sum + s.totalUSD, 0);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Ventas en el periodo: $${total.toFixed(2)}`, 14, finalY + 10);
    
    doc.save(`Ventas_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-6 animate-fade-in pb-20">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reportes y Estadisticas</h2>
          <p className="text-gray-500 text-sm mt-1">Analisis visual de las metricas del negocio</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={exportInventoryPDF}
             className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
           >
             <FileText size={16} className="text-blue-600"/> Inventario PDF
           </button>
           <button 
             onClick={exportSalesPDF}
             className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm text-sm font-medium transition-colors"
           >
             <FileText size={16} className="text-green-600"/> Ventas PDF
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Ventas Hoy</p>
              <h3 className="text-2xl font-bold text-gray-800">
                ${sales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).reduce((acc, s) => acc + s.totalUSD, 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20}/></div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Clientes</p>
              <h3 className="text-2xl font-bold text-gray-800">{clients.length}</h3>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Users size={20}/></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Prod. Activos</p>
              <h3 className="text-2xl font-bold text-gray-800">{products.filter(p => p.active).length}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Package size={20}/></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Prod. Alerta Stock</p>
              <h3 className="text-2xl font-bold text-red-600">{products.filter(p => p.active && p.stock <= p.minStock).length}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={20}/></div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Ingresos ultimos 7 dias */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">Ingresos (Ultimos 7 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysSales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top 5 Productos */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">Top 5 Productos Mas Vendidos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} width={120} />
                <RechartsTooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Ventas por Categoria */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Distribucion de Ingresos por Categoria</h3>
            <p className="text-xs text-gray-500 mb-4">Muestra de donde provienen los ingresos basados en el historial completo.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-6">
             <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h4 className="font-semibold text-gray-700 text-sm mb-3">Resumen de Categorias</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {salesByCategory.sort((a,b) => b.value - a.value).map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">${cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                  {salesByCategory.length === 0 && (
                     <div className="text-sm text-gray-400 text-center py-4">No hay datos suficientes</div>
                  )}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
