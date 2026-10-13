import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import StatusPage from './pages/StatusPage';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';

import TechnicianDashboard from './pages/TechnicianDashboard';
import TechnicianJobDetail from './pages/TechnicianJobDetail';
import CustomerPortal from './pages/customer/CustomerPortal';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/status/:kode?" element={<StatusPage />} />
        <Route path="/invoice/:kode?" element={<StatusPage initialInvoiceOpen={true} />} />
        <Route path="/invoices/:kode?" element={<StatusPage initialInvoiceOpen={true} />} />
        <Route path="/feedback/:kode" element={<FeedbackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
        <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="/technician/jobs" element={<TechnicianDashboard />} />
        <Route path="/technician/schedule" element={<TechnicianDashboard />} />
        <Route path="/technician/history" element={<TechnicianDashboard />} />
        <Route path="/technician/profile" element={<TechnicianDashboard />} />
        <Route path="/technician/jobs/:id" element={<TechnicianJobDetail />} />
        <Route path="/customer/*" element={<CustomerPortal />} />
      </Routes>
    </Router>
  );
}

export default App;
