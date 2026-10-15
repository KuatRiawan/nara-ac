import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TrackerCard from '../components/landing/TrackerCard';
import HeroInteractiveCard from '../components/landing/HeroInteractiveCard';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('Tracker Booking Validation & Microcopy (UX-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TrackerCard', () => {
    it('displays aligned label and placeholder asking for booking code only', () => {
      render(
        <BrowserRouter>
          <TrackerCard />
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/kode booking layanan/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Contoh: AC-WXYZ atau BK-20261014-0001/i)).toBeInTheDocument();
      expect(screen.queryByText(/nomor hp \/ kode booking/i)).not.toBeInTheDocument();
    });

    it('rejects phone numbers with helpful privacy warning', () => {
      render(
        <BrowserRouter>
          <TrackerCard />
        </BrowserRouter>
      );

      const input = screen.getByLabelText(/kode booking layanan/i);
      fireEvent.change(input, { target: { value: '08123456789' } });
      fireEvent.click(screen.getByRole('button', { name: /cek status sekarang/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/pencarian publik hanya mendukung kode booking/i);
      expect(mockedNavigate).not.toHaveBeenCalled();
    });

    it('navigates with uppercase code when valid booking code is entered', () => {
      render(
        <BrowserRouter>
          <TrackerCard />
        </BrowserRouter>
      );

      const input = screen.getByLabelText(/kode booking layanan/i);
      fireEvent.change(input, { target: { value: 'ac-abcd' } });
      fireEvent.click(screen.getByRole('button', { name: /cek status sekarang/i }));

      expect(mockedNavigate).toHaveBeenCalledWith('/status/AC-ABCD');
    });
  });

  describe('HeroInteractiveCard Tracker Tab', () => {
    it('rejects phone numbers with privacy warning in Hero interactive tracker', async () => {
      render(
        <BrowserRouter>
          <HeroInteractiveCard />
        </BrowserRouter>
      );

      // Switch to tracker tab
      fireEvent.click(screen.getByRole('button', { name: /lacak status tiket/i }));

      const input = await screen.findByLabelText(/kode booking layanan/i);
      fireEvent.change(input, { target: { value: '085712345678' } });
      fireEvent.click(screen.getByRole('button', { name: /cek status sekarang/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/pencarian publik hanya mendukung kode booking/i);
      expect(mockedNavigate).not.toHaveBeenCalled();
    });
  });
});
