import { createContext, useContext, useMemo, useState } from 'react';
import api from './api.js';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('carepoint-user')); } catch { return null; } });
  const signIn = async (path, details) => {
    const { data } = await api.post(`/auth/${path}`, details);
    localStorage.setItem('carepoint-token', data.token); localStorage.setItem('carepoint-user', JSON.stringify(data.user)); setUser(data.user); return data.user;
  };
  const signOut = () => { localStorage.removeItem('carepoint-token'); localStorage.removeItem('carepoint-user'); setUser(null); };
  const value = useMemo(() => ({ user, signIn, signOut, setUser }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
