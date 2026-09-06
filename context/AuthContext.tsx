import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// =====================================================
// AUTENTICACIÓN FIREBASE — NovaPOS
// =====================================================

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string;
  login: (user: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  currentUser: '',
  login: async () => false,
  logout: async () => {},
});

const VALID_PIN = import.meta.env.VITE_APP_PIN || '1234';
const VALID_USER = import.meta.env.VITE_APP_USER || 'admin';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Escuchar cambios de estado en Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        setCurrentUser(VALID_USER);
      } else {
        setIsAuthenticated(false);
        setCurrentUser('');
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (user: string, pin: string): Promise<boolean> => {
    if (user.toLowerCase() === VALID_USER.toLowerCase() && pin === VALID_PIN) {
      const email = `admin_${VALID_USER.toLowerCase()}@novapos.com`;
      const password = `NovaPOS_${pin}`;
      
      try {
        // Intenta iniciar sesión
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (error: any) {
        // Si el usuario no existe, lo creamos automáticamente (primera vez)
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            return true;
          } catch (createError) {
            console.error("Error creando cuenta admin en Firebase:", createError);
            return false;
          }
        } else {
          console.error("Error iniciando sesión en Firebase:", error);
          return false;
        }
      }
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando sesión segura...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
