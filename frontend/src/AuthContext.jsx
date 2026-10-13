import { createContext, useState, useEffect, useCallback } from 'react';
import api from './api';

export const AuthContext = createContext();

/**
 * AuthProvider with logout confirmation
 * - Menambahkan state untuk logout confirmation dialog
 * - Logout memerlukan konfirmasi sebelum benar-benar mengakhiri sesi
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // With HttpOnly cookies, we cannot read the token from JS
    // We rely on the backend setting HttpOnly cookies and axios sending them
    // Check if we have user data in sessionStorage (for session persistence)
    const storedUser = sessionStorage.getItem('nara_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    const handleExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  /**
   * Fetch a new CSRF token from the server
   */
  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await api.get('/auth/csrf-token');
      setCsrfToken(res.csrfToken);
      return res.csrfToken;
    } catch (err) {
      console.warn('Failed to fetch CSRF token:', err);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // Token is stored in HttpOnly cookie by backend, not in localStorage
    sessionStorage.setItem('nara_user', JSON.stringify(res.user));
    setUser(res.user);
    // Fetch CSRF token after login
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  /**
   * Confirm logout - tampilkan dialog konfirmasi
   */
  const confirmLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  /**
   * Cancel logout - tutup dialog tanpa melakukan logout
   */
  const cancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  /**
   * Execute logout - benar-benar keluar dari sistem
   */
  const executeLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      // Panggil endpoint logout backend jika tersedia
      try {
        await api.post('/auth/logout');
      } catch (err) {
        // Jika logout endpoint gagal, tetap lanjut dengan logout lokal
        console.warn('Logout endpoint gagal, melanjutkan logout lokal:', err);
      }
      // Hapus user dari sessionStorage
      sessionStorage.removeItem('nara_user');
      setToken(null);
      setUser(null);
      setCsrfToken(null);
      // Kirim event untuk memberitahu komponen lain
      window.dispatchEvent(new Event('auth-logout'));
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }, []);

  /**
   * Logout langsung (tanpa konfirmasi) - untuk kasus khusus
   * Biasanya digunakan setelah token expired
   */
  const forceLogout = useCallback(() => {
    sessionStorage.removeItem('nara_user');
    setToken(null);
    setUser(null);
    setShowLogoutConfirm(false);
    window.dispatchEvent(new Event('auth-logout'));
  }, []);

  // Legacy logout function - redirect to confirmLogout
  const logout = useCallback(() => {
    confirmLogout();
  }, [confirmLogout]);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const next = { ...prev, ...updatedData };
      sessionStorage.setItem('nara_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    user,
    token,
    csrfToken,
    loading,
    login,
    logout,
    confirmLogout,
    cancelLogout,
    executeLogout,
    forceLogout,
    fetchCsrfToken,
    updateUser,
    isLoggingOut,
    showLogoutConfirm,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
