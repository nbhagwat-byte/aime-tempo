import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  getCurrentUser,
  setCurrentUser as saveCurrentUser,
  type User,
} from '@/app/utils/dataManager';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    saveCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
