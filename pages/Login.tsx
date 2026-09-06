import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 5;
  const isBlocked = attempts >= MAX_ATTEMPTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;
    if (!username.trim() || !pin.trim()) {
      setError('Por favor ingresa usuario y PIN.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Pequeño delay para simular verificación y prevenir fuerza bruta
    await new Promise(resolve => setTimeout(resolve, 600));

    const success = await login(username.trim(), pin.trim());

    if (!success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      if (newAttempts >= MAX_ATTEMPTS) {
        setError(`Demasiados intentos fallidos. Recarga la página para reintentar.`);
      } else {
        setError(`Usuario o PIN incorrecto. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}`);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200 mb-6">
            <span className="text-white font-black text-4xl">N</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">NovaPOS</h1>
          <p className="text-gray-500 mt-2 font-medium">Sistema de Gestión Comercial</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Iniciar Sesión</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Usuario */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="Ej: admin"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800"
                    autoFocus
                    disabled={isBlocked || isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  PIN / Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => { setPin(e.target.value); setError(''); }}
                    placeholder="••••••"
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800"
                    disabled={isBlocked || isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 animate-fade-in">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isBlocked || isLoading || !username.trim() || !pin.trim()}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-100 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              NovaPOS v1.1 · Sistema protegido — Solo personal autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
