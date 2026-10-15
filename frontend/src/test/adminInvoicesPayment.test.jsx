import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminInvoices from '../pages/admin/AdminInvoices';
import api from '../api';
import * as toastModule from '../components/ui/toast';

// Mock api
vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock toast
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.spyOn(toastModule, 'useToast').mockReturnValue({
  success: mockShowSuccess,
  error: mockShowError,
  toast: vi.fn(),
});

describe('Admin Invoices Payment Status Persistence (UX-003)', () => {
  const mockBookings = [
    {
      id: 101,
      kode_booking: 'AC-101A',
      status: 'scheduled',
      status_pembayaran: 'pending',
      customer: { nama: 'Andi Pratama', kontak: '081234567890' },
      layanan: { nama: 'Cuci AC Standard', harga: 75000 },
      jumlah_unit: 1,
      total_biaya: 75000,
      jadwal_mulai: '2026-10-15T09:00:00Z',
    },
    {
      id: 102,
      kode_booking: 'AC-102B',
      status: 'done',
      status_pembayaran: 'paid',
      customer: { nama: 'Budi Santoso', kontak: '081987654321' },
      layanan: { nama: 'Service Besar AC', harga: 150000 },
      jumlah_unit: 2,
      total_biaya: 285000,
      jadwal_mulai: '2026-10-14T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.get.mockImplementation((url) => {
      if (url === '/bookings') {
        return Promise.resolve(mockBookings);
      }
      if (url === '/settings/payment-accounts') {
        return Promise.resolve({
          accounts: [
            { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' }
          ],
          instruction_note: 'Note'
        });
      }
      return Promise.resolve([]);
    });
  });

  it('loads persistent payment status from backend API data directly', async () => {
    render(<AdminInvoices />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Andi Pratama')).toBeInTheDocument();
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    // #101 has status_pembayaran: 'pending' -> should show "Tandai Lunas"
    // #102 has status_pembayaran: 'paid' -> should show "Batal Lunas"
    expect(screen.getByText('Tandai Lunas')).toBeInTheDocument();
    expect(screen.getByText('Batal Lunas')).toBeInTheDocument();
  });

  it('calls backend API patch when toggling payment status and updates UI', async () => {
    api.patch.mockResolvedValueOnce({
      id: 101,
      status_pembayaran: 'paid',
      message: 'Status pembayaran berhasil diperbarui menjadi Lunas.'
    });

    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getByText('Tandai Lunas')).toBeInTheDocument();
    });

    const markPaidBtn = screen.getByText('Tandai Lunas');
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/bookings/101/payment-status', {
        status_pembayaran: 'paid'
      });
      expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('Lunas'));
    });
  });

  it('shows error toast when payment status patch fails', async () => {
    api.patch.mockRejectedValueOnce({
      error: { message: 'Database connection error' }
    });

    render(<AdminInvoices />);

    await waitFor(() => {
      expect(screen.getByText('Tandai Lunas')).toBeInTheDocument();
    });

    const markPaidBtn = screen.getByText('Tandai Lunas');
    fireEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Database connection error'));
    });
  });
});
