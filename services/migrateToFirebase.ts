import { db } from './firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';

const STORAGE_KEYS = {
    PRODUCTS:         'nova_products',
    CLIENTS:          'nova_clients',
    SUPPLIERS:        'nova_suppliers',
    SALES_HEADER:     'nova_sales_header',
    SALES_DETAIL:     'nova_sales_detail',
    PURCHASES_HEADER: 'nova_purchases_header',
    PURCHASES_DETAIL: 'nova_purchases_detail',
    MOVEMENTS:        'nova_movements',
    CREDIT_PAYMENTS:  'nova_credit_payments',
};

const getLocal = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const migrateDataToFirebase = async () => {
    console.log("Iniciando migración a Firebase...");
    try {
        const collections = [
            { key: STORAGE_KEYS.PRODUCTS,         name: 'products' },
            { key: STORAGE_KEYS.CLIENTS,           name: 'clients' },
            { key: STORAGE_KEYS.SUPPLIERS,         name: 'suppliers' },
            { key: STORAGE_KEYS.SALES_HEADER,      name: 'sales' },
            { key: STORAGE_KEYS.SALES_DETAIL,      name: 'salesDetails' },
            { key: STORAGE_KEYS.PURCHASES_HEADER,  name: 'purchases' },
            { key: STORAGE_KEYS.PURCHASES_DETAIL,  name: 'purchaseDetails' },
            { key: STORAGE_KEYS.MOVEMENTS,         name: 'movements' },
            { key: STORAGE_KEYS.CREDIT_PAYMENTS,   name: 'creditPayments' },
        ];

        let totalRecords = 0;

        for (const col of collections) {
            const data = getLocal(col.key);
            if (data.length === 0) {
                console.log(`[${col.name}] Sin datos locales. Omitiendo.`);
                continue;
            }

            console.log(`[${col.name}] Migrando ${data.length} registros...`);

            // Subimos en lotes de 500 (límite de Firestore)
            // NO verificamos si ya hay datos para permitir re-ejecutar la migración
            for (let i = 0; i < data.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = data.slice(i, i + 500);

                chunk.forEach((item: any) => {
                    // Usamos el ID del item como ID del documento en Firestore
                    const id = item.id || item.productId || crypto.randomUUID();
                    const docRef = doc(db, col.name, String(id));
                    batch.set(docRef, item);
                });

                await batch.commit();
                console.log(`[${col.name}] Lote ${Math.floor(i/500)+1} subido (${Math.min(i+500, data.length)} de ${data.length}).`);
            }
            totalRecords += data.length;
        }

        console.log(`¡Migración completada! ${totalRecords} registros subidos a Firebase.`);
        return totalRecords;
    } catch (error) {
        console.error("Error durante la migración:", error);
        throw error;
    }
};

