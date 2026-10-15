import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import { AuthContext } from '../AuthContext';

// Mock api
vi.mock('../api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('/admin/notifications')) {
        return Promise.resolve({ data: [], meta: { total: 3 } });
      }
      if (url.includes('/bookings')) {
        return Promise.resolve({ data: [], meta: { total: 0 } });
      }
      if (url.includes('/technicians')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    }),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  }
}));

import { ToastProvider } from '../components/ui/toast';

describe('AdminDashboard smoke test', () => {
  it('mounts without throwing ReferenceError or TDZ errors', async () => {
    const mockUser = { id: 1, role: 'admin', nama: 'Administrator' };
    
    expect(() => {
      render(
        <ToastProvider>
          <AuthContext.Provider value={{ user: mockUser, loading: false }}>
            <MemoryRouter initialEntries={['/admin']}>
              <AdminDashboard />
            </MemoryRouter>
          </AuthContext.Provider>
        </ToastProvider>
      );
    }).not.toThrow();
  });
});
