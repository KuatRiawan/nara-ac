import { useState, useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import { LogOut, Loader2 } from 'lucide-react';
import CustomerDashboard from './CustomerDashboard';
import CustomerAcUnits from './CustomerAcUnits';
import CustomerHistory from './CustomerHistory';
import LogoutConfirmationDialog from '../../components/ui/LogoutConfirmation';

export default function CustomerPortal() {
  const { user, loading: authLoading, logout, confirmLogout, cancelLogout, executeLogout, showLogoutConfirm, isLoggingOut } = useContext(AuthContext);
  const navigate = useNavigate();

  // Handle auth-logout event to redirect
  useEffect(() => {
    const handleLogout = () => {
      navigate('/login');
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [navigate]);

  if (authLoading) return null;

  if (!user || user.role !== 'customer') {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <nav className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/customer/dashboard" className="text-xl font-bold text-blue-600">
                  Nara AC Customer
                </Link>
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <Link to="/customer/dashboard" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600">Dashboard</Link>
                  <Link to="/customer/ac-units" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600">My AC</Link>
                  <Link to="/customer/history" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600">Riwayat</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 hidden md:block">Halo, {user.nama}</span>
                <button 
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
                >
                  {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/ac-units" element={<CustomerAcUnits />} />
            <Route path="/history" element={<CustomerHistory />} />
          </Routes>
        </main>
      </div>

      {/* LOGOUT CONFIRMATION DIALOG */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirm}
        onConfirm={executeLogout}
        onCancel={cancelLogout}
        message="Apakah Anda yakin ingin mengakhiri sesi sekarang?"
      />
    </>
  );
}
