import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const StaffLoginPage = lazy(() => import('./pages/StaffLoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard'));
const TechnicianJobDetail = lazy(() => import('./pages/TechnicianJobDetail'));
const CustomerPortal = lazy(() => import('./pages/customer/CustomerPortal'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsConditionsPage = lazy(() => import('./pages/TermsConditionsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Memuat halaman...</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/status/:kode?" element={<StatusPage />} />
          <Route path="/invoice/:kode?" element={<StatusPage initialInvoiceOpen={true} />} />
          <Route path="/invoices/:kode?" element={<StatusPage initialInvoiceOpen={true} />} />
          <Route path="/feedback/:kode" element={<FeedbackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/staff" element={<Navigate to="/staff/login" replace />} />
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route path="/admin/login" element={<StaffLoginPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsConditionsPage />} />
          <Route path="/terms-conditions" element={<TermsConditionsPage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
          <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
          <Route path="/technician/jobs" element={<TechnicianDashboard />} />
          <Route path="/technician/schedule" element={<TechnicianDashboard />} />
          <Route path="/technician/history" element={<TechnicianDashboard />} />
          <Route path="/technician/profile" element={<TechnicianDashboard />} />
          <Route path="/technician/jobs/:id" element={<TechnicianJobDetail />} />
          <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="/customer/*" element={<CustomerPortal />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
