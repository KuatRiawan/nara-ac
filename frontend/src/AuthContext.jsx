import { createContext, useState, useEffect, useCallback } from 'react';
import api, { setCsrfToken } from './api';

export const AuthContext = createContext();

/**
 * AuthProvider with logout confirmation.
 * Tidak menyimpan data user di sessionStorage/localStorage (AUD-005).
 * Setiap page load, user data diambil fresh dari /auth/me via HttpOnly cookie.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Ambil user fresh dari server via HttpOnly cookie (AUD-005)
    // Tidak lagi membaca dari sessionStorage untuk menghindari kebocoran data via XSS
    let isMounted = true;

    api.get('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        const userData = res?.user || res?.data?.user || res;
        if (userData && userData.id) {
          setUser(userData);
          // Fetch CSRF token setelah berhasil validasi sesi
          api.get('/auth/csrf-token')
            .then((csrfRes) => {
              if (!isMounted) return;
              setCsrfToken(csrfRes.csrfToken);
              setCsrfTokenState(csrfRes.csrfToken);
            })
            .catch(() => { /* CSRF token akan di-fetch ulang saat dibutuhkan */ });
        }
      })
      .catch(() => {
        // 401 atau network error — user memang belum login, tidak perlu apa-apa
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setCsrfToken(null);
      setCsrfTokenState(null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-expired', handleExpired);
    };
  }, []);

  /**
   * Fetch a new CSRF token from the server
   */
  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await api.get('/auth/csrf-token');
      setCsrfToken(res.csrfToken);
      setCsrfTokenState(res.csrfToken);
      return res.csrfToken;
    } catch (err) {
      console.warn('Failed to fetch CSRF token:', err);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // Token is stored in HttpOnly cookie by backend, not in localStorage/sessionStorage
    setUser(res.user);
    // Fetch CSRF token after login
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const staffLogin = useCallback(async (email, password) => {
    const res = await api.post('/auth/staff/login', { email, password });
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const requestCustomerOtp = useCallback(async (kontak) => {
    const res = await api.post('/auth/customer/request-otp', { kontak });
    return res;
  }, []);

  const verifyCustomerOtp = useCallback(async (kontak, otp) => {
    const res = await api.post('/auth/customer/verify-otp', { kontak, otp });
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const registerMember = useCallback(async (formData) => {
    const res = await api.post('/auth/register', formData);
    setUser(res.user);
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
      setToken(null);
      setUser(null);
      setCsrfToken(null);       // clear module-level token di api.js
      setCsrfTokenState(null);  // clear state lokal
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
    setToken(null);
    setUser(null);
    setCsrfToken(null);
    setCsrfTokenState(null);
    setShowLogoutConfirm(false);
    window.dispatchEvent(new Event('auth-logout'));
  }, []);

  // Legacy logout function - redirect to confirmLogout
  const logout = useCallback(() => {
    confirmLogout();
  }, [confirmLogout]);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  }, []);

  const value = {
    user,
    token,
    csrfToken,
    loading,
    login,
    staffLogin,
    requestCustomerOtp,
    verifyCustomerOtp,
    registerMember,
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
