import React, { useState } from 'react';
import { ExchangeRate } from '../types';
import { DailySalesReport } from '../components/DailySalesReport';
import { migrateDataToFirebase } from '../services/migrateToFirebase';
import { useNotification } from '../context/NotificationContext';
import { Upload, CheckCircle } from 'lucide-react';

interface DashboardProps {
  exchangeRate: ExchangeRate;
}

export const Dashboard: React.FC<DashboardProps> = ({ exchangeRate }) => {
  const { showNotification } = useNotification();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrated, setMigrated] = useState<number | null>(null);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const total = await migrateDataToFirebase();
      setMigrated(total);
      showNotification('success', `✅ ${total} registros migrados a Firebase correctamente.`);
    } catch (error) {
      showNotification('error', 'Error en la migración. Revisa la consola del navegador.');
    }
    setIsMigrating(false);
  };

  return (
    <div className="p-6 animate-fade-in pb-20">
      <DailySalesReport exchangeRate={exchangeRate} />

      {/* Botón temporal de migración — eliminar una vez migrado */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between gap-4 max-w-xl">
          <div>
            <p className="font-semibold text-indigo-800 text-sm">Migración a Firebase</p>
            <p className="text-xs text-indigo-500 mt-1">
              Sube todos los datos locales a la nube. Puedes ejecutarlo múltiples veces sin duplicar.
            </p>
            {migrated !== null && (
              <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                <CheckCircle size={14} /> {migrated} registros subidos correctamente.
              </p>
            )}
          </div>
          <button
            onClick={handleMigration}
            disabled={isMigrating}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Upload size={16} />
            {isMigrating ? 'Migrando...' : 'Migrar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
};

