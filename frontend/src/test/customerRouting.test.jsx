import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import CustomerPortal from '../pages/customer/CustomerPortal';

// Mock sub-pages
vi.mock('../pages/customer/CustomerDashboard', () => ({
  default: () => <div data-testid="customer-dashboard">Customer Dashboard Content</div>,
}));

vi.mock('../pages/customer/CustomerAcUnits', () => ({
  default: () => <div data-testid="customer-ac-units">Customer AC Units Content</div>,
}));

vi.mock('../pages/customer/CustomerHistory', () => ({
  default: () => <div data-testid="customer-history">Customer History Content</div>,
}));

vi.mock('../components/CompanyLogo', () => ({
  default: () => <div data-testid="company-logo">Logo</div>,
}));

const mockCustomerAuth = {
  user: { id: 1, name: 'Budi Pelanggan', role: 'customer' },
  loading: false,
  confirmLogout: vi.fn(),
  cancelLogout: vi.fn(),
  executeLogout: vi.fn(),
  showLogoutConfirm: false,
  isLoggingOut: false,
};

const mockUnauthAuth = {
  user: null,
  loading: false,
  confirmLogout: vi.fn(),
  cancelLogout: vi.fn(),
  executeLogout: vi.fn(),
  showLogoutConfirm: false,
  isLoggingOut: false,
};

describe('Customer Routing (UX-001)', () => {
  it('redirects unauthenticated user to /login', () => {
    render(
      <AuthContext.Provider value={mockUnauthAuth}>
        <MemoryRouter initialEntries={['/customer/dashboard']}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="/customer/*" element={<CustomerPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders dashboard when accessing /customer/dashboard as customer', () => {
    render(
      <AuthContext.Provider value={mockCustomerAuth}>
        <MemoryRouter initialEntries={['/customer/dashboard']}>
          <Routes>
            <Route path="/customer/*" element={<CustomerPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
  });

  it('redirects /customer to /customer/dashboard without blank screen', () => {
    render(
      <AuthContext.Provider value={mockCustomerAuth}>
        <MemoryRouter initialEntries={['/customer']}>
          <Routes>
            <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="/customer/*" element={<CustomerPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
  });

  it('redirects invalid sub-route /customer/unknown to /customer/dashboard', () => {
    render(
      <AuthContext.Provider value={mockCustomerAuth}>
        <MemoryRouter initialEntries={['/customer/unknown-page']}>
          <Routes>
            <Route path="/customer/*" element={<CustomerPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('customer-dashboard')).toBeInTheDocument();
  });
});
