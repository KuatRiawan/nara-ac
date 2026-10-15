import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

// Mock AuthContext
vi.mock('../AuthContext', async () => {
  const { createContext } = await import('react');
  const MockAuthContext = createContext({ login: () => {}, logout: () => {}, user: null, loading: false });
  return {
    AuthContext: MockAuthContext,
    useAuth: () => ({ login: vi.fn(), logout: vi.fn(), user: null, loading: false }),
    default: ({ children }) => children,
  };
});

// Mock useBusinessProfile
vi.mock('../hooks/useBusinessProfile', () => ({
  useBusinessProfile: () => ({ whatsappNumber: '6281234567890', profile: { phone: '0812-3456-7890' }, loading: false }),
  buildWhatsAppUrl: (num, msg) => `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`,
  normalizeWhatsAppNumber: (p) => p,
}));

// Mock api
vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  setCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(() => null),
}));

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form with email and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kata Sandi/i)).toBeInTheDocument();
  });

  it('email input has correct id and htmlFor association', () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/Email/i);
    expect(emailInput).toHaveAttribute('id', 'login-email');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
  });

  it('password input has correct id and htmlFor association', () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText(/Kata Sandi/i);
    expect(passwordInput).toHaveAttribute('id', 'login-password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });

  it('renders a submit button', () => {
    renderLoginPage();
    const submitButton = screen.getByRole('button', { name: /Masuk/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('renders a WhatsApp help link with sr-only text', () => {
    renderLoginPage();
    const waLink = screen.getByRole('link', { name: /Bantuan CS/i });
    expect(waLink).toHaveAttribute('target', '_blank');
    expect(waLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    // Check sr-only text is present
    expect(waLink.textContent).toContain('(buka di tab baru)');
  });
});
