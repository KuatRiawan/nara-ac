import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

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
  default: { get: vi.fn(() => Promise.resolve({ data: [] })), post: vi.fn() },
  setCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(() => null),
}));

import LoginPage from '../pages/LoginPage';

describe('LoginPage Accessibility', () => {
  it('has no critical accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    const results = await axe(container, {
      rules: {
        // Focus on form-related a11y rules
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'color-contrast': { enabled: false }, // Tailwind colors may not pass in jsdom
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('all form inputs have associated labels', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    // Every input should be findable by its label
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Kata Sandi/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('external links have rel="noopener noreferrer"', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    const externalLinks = screen.getAllByRole('link').filter(link =>
      link.getAttribute('target') === '_blank'
    );
    externalLinks.forEach(link => {
      const rel = link.getAttribute('rel') || '';
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });
  });

  it('external links have sr-only text indicating new tab', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    const externalLinks = screen.getAllByRole('link').filter(link =>
      link.getAttribute('target') === '_blank'
    );
    externalLinks.forEach(link => {
      expect(link.textContent).toContain('(buka di tab baru)');
    });
  });
});
