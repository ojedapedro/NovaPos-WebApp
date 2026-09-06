import { db } from './firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { DataService } from './dataService';

export const migrateDataToFirebase = async () => {
    console.log("Iniciando migración a Firebase...");
    try {
        const collections = [
            { name: 'products',        data: DataService.getProducts() },
            { name: 'clients',         data: DataService.getClients() },
            { name: 'suppliers',       data: DataService.getSuppliers() },
            { name: 'sales',           data: DataService.getSales() },
            { name: 'salesDetails',    data: DataService.getSaleDetails() },
            { name: 'purchases',       data: DataService.getPurchases() },
            { name: 'purchaseDetails', data: DataService.getPurchaseDetails() },
            { name: 'movements',       data: DataService.getMovements() },
            { name: 'creditPayments',  data: DataService.getCreditPayments() },
        ];

        let totalRecords = 0;

        for (const col of collections) {
            const data = col.data;
            if (!data || data.length === 0) {
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

