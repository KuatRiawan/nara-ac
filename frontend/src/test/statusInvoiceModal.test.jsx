import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StatusPage from '../pages/StatusPage';
import { ToastProvider } from '../components/ui/toast';
import api from '../api';

vi.mock('../api', () => ({
  default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

const booking = {
  id: 1,
  kode_booking: 'AC-GAYX',
  status: 'scheduled',
  status_pembayaran: 'pending',
  customer_nama: 'Budi Santoso',
  kontak: '08222222222',
  alamat: 'Jl. Kenangan No. 1',
  layanan: 'Cuci AC Core (Deep Clean)',
  jumlah_unit: 1,
  jadwal_mulai: '2026-10-16T11:00:00+07:00',
  total: 120000,
};

describe('StatusPage invoice modal (customer invoice regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.endsWith('/invoice')) return Promise.resolve({ total: 120000, subtotal: 120000, discount: 0 });
      if (url.startsWith('/public/bookings/')) return Promise.resolve(booking);
      return Promise.resolve([]);
    });
  });

  it('renders the invoice modal in the DOM after clicking "Cetak Invoice Resmi"', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/status/AC-GAYX']}>
          <Routes>
            <Route path="/status/:kode" element={<StatusPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    const btn = await screen.findByRole('button', { name: /cetak invoice resmi/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(document.getElementById('invoice-print-portal')).not.toBeNull();
    });
    expect(screen.getByText(/pratinjau e-invoice resmi/i)).toBeInTheDocument();
  });
});
