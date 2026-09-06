import { API_CONFIG } from './config';

/**
 * Servicio de comunicación con Google Apps Script
 * Utiliza fetch para enviar y recibir datos JSON.
 */

// Google Apps Script a veces tiene problemas con CORS y preflight requests (OPTIONS).
// Enviando 'text/plain' a menudo evita el preflight estricto, aunque el contenido sea JSON.
const CONTENT_TYPE = 'text/plain;charset=utf-8';

export const ApiService = {
  /**
   * Descarga toda la base de datos (GET)
   */
  async fetchDatabase() {
    if (!API_CONFIG.GOOGLE_SCRIPT_URL || API_CONFIG.GOOGLE_SCRIPT_URL.includes('TU_URL')) {
      console.warn('API URL no configurada. Usando modo offline/mock.');
      return null;
    }

    try {
      const response = await fetch(API_CONFIG.GOOGLE_SCRIPT_URL);
      if (!response.ok) throw new Error('Error de red al obtener datos');
      return await response.json();
    } catch (error) {
      console.error('Error fetching database:', error);
      throw error;
    }
  },

  /**
   * Envía una acción al backend (POST)
   * Incluye el token de autenticación en cada petición (SEC-04).
   * @param action Nombre de la acción (SAVE_SALE, SAVE_PURCHASE, SAVE_CLIENT, etc)
   * @param payload Datos a enviar
   */
  async sendAction(action: string, payload: any) {
    if (!API_CONFIG.GOOGLE_SCRIPT_URL || API_CONFIG.GOOGLE_SCRIPT_URL.includes('TU_URL')) return;

    try {
      const body = JSON.stringify({
        action,
        payload,
        token: API_CONFIG.API_TOKEN, // Token de autenticación — validado en el backend (SEC-04)
      });

      const response = await fetch(API_CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPE,
        },
        body: body
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Error en el servidor');
      }
      return result;
    } catch (error) {
      console.error(`Error enviando acción ${action}:`, error);
      // Cola de reintentos pendiente para soporte offline real
      throw error;
    }
  }
};