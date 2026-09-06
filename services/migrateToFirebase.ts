import { db } from './firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';

const STORAGE_KEYS = {
    PRODUCTS: 'nova_products',
    CLIENTS: 'nova_clients',
    SUPPLIERS: 'nova_suppliers',
    SALES_HEADER: 'nova_sales_headers',
    SALES_DETAIL: 'nova_sales_details',
    PURCHASES_HEADER: 'nova_purchases_headers',
    PURCHASES_DETAIL: 'nova_purchases_details',
    MOVEMENTS: 'nova_movements',
};

const getLocal = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const migrateDataToFirebase = async () => {
    console.log("Iniciando migración a Firebase...");
    try {
        const collections = [
            { key: STORAGE_KEYS.PRODUCTS, name: 'products' },
            { key: STORAGE_KEYS.CLIENTS, name: 'clients' },
            { key: STORAGE_KEYS.SUPPLIERS, name: 'suppliers' },
            { key: STORAGE_KEYS.SALES_HEADER, name: 'sales' },
            { key: STORAGE_KEYS.SALES_DETAIL, name: 'salesDetails' },
            { key: STORAGE_KEYS.PURCHASES_HEADER, name: 'purchases' },
            { key: STORAGE_KEYS.PURCHASES_DETAIL, name: 'purchaseDetails' },
            { key: STORAGE_KEYS.MOVEMENTS, name: 'movements' }
        ];

        let totalRecords = 0;

        for (const col of collections) {
            const data = getLocal(col.key);
            if (data.length === 0) continue;

            console.log(`Migrando ${data.length} registros a la colección '${col.name}'...`);
            
            // Verificamos si la colección ya tiene datos para no duplicar en caso de múltiples clics
            const snapshot = await getDocs(collection(db, col.name));
            if (!snapshot.empty) {
                console.log(`La colección ${col.name} ya tiene datos. Omitiendo migración para evitar duplicados.`);
                continue;
            }

            // Subimos en lotes (batches) de 500 (límite de Firestore)
            for (let i = 0; i < data.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = data.slice(i, i + 500);
                
                chunk.forEach((item: any) => {
                    // Si el item tiene ID lo usamos, si no autogeneramos
                    const docRef = item.id 
                        ? doc(db, col.name, item.id) 
                        : doc(collection(db, col.name));
                    batch.set(docRef, item);
                });
                
                await batch.commit();
            }
            totalRecords += data.length;
        }

        console.log(`¡Migración completada con éxito! ${totalRecords} registros migrados.`);
        return true;
    } catch (error) {
        console.error("Error durante la migración:", error);
        throw error;
    }
};
