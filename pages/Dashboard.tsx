import React, { useMemo, useState } from 'react';
import { ExchangeRate } from '../types';
import { DailySalesReport } from '../components/DailySalesReport';
import { migrateDataToFirebase } from '../services/migrateToFirebase';
import { useNotification } from '../context/NotificationContext';

interface DashboardProps {
  exchangeRate: ExchangeRate;
}

export const Dashboard: React.FC<DashboardProps> = ({ exchangeRate }) => {
  const { showNotification } = useNotification();
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateDataToFirebase();
      showNotification('success', 'Migración a Firebase completada. Revisa la consola.');
    } catch (error) {
      showNotification('error', 'Error en la migración. Intenta de nuevo.');
    }
    setIsMigrating(false);
  };

  return (
    <div className="p-6 animate-fade-in pb-20">
      <DailySalesReport exchangeRate={exchangeRate} />
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleMigration}
          disabled={isMigrating}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {isMigrating ? 'Migrando...' : 'Migrar datos a Firebase'}
        </button>
      </div>
    </div>
  );
};