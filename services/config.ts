// CONFIGURACIÓN DE CONEXIÓN
// La URL y el token se leen desde variables de entorno (.env)
// Nunca escribas credenciales directamente en este archivo.
//
// Para configurar: copia .env.example como .env y rellena los valores.
export const API_CONFIG = {
  GOOGLE_SCRIPT_URL: import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'TU_URL_AQUI',
  API_TOKEN: import.meta.env.VITE_API_TOKEN || '',
};