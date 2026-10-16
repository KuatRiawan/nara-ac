import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { cn } from '../lib/utils';

export default function OfficialInvoicePaper({ booking, isPaidOverride, paymentSettings }) {
  // Safe extraction of fields from either public booking or admin booking
  const b = booking || {};

  // Bank account payment information — selalu diambil dari API, tidak perlu cache di localStorage (AUD-005)
  const [internalPaymentSettings, setInternalPaymentSettings] = useState({
    accounts: [
      { id: '1', bank_name: 'BCA', account_number: '8720-9182-33', account_holder: 'CV NARA TEKNINDOTAMA' },
      { id: '2', bank_name: 'Mandiri', account_number: '137-00-9821-4451', account_holder: 'CV NARA TEKNINDOTAMA' },
    ],
    instruction_note: '*Tersedia juga opsi pembayaran tunai / QRIS langsung kepada teknisi setelah pekerjaan selesai di lokasi.'
  });

  useEffect(() => {
    if (paymentSettings) {
      setInternalPaymentSettings(paymentSettings);
      return;
    }
    let isMounted = true;
    api.get('/settings/payment-accounts')
      .then(res => {
        const data = (res && Array.isArray(res.accounts)) ? res : (res?.data?.accounts ? res.data : (res?.data?.data?.accounts ? res.data.data : null));
        if (isMounted && data && Array.isArray(data.accounts)) {
          setInternalPaymentSettings(data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [paymentSettings]);

  const activePayment = paymentSettings || internalPaymentSettings;
  
  const kodeBooking = b.kode_booking || (b.id ? `AC-${b.id}` : 'AC-0000');

  // Format nomor invoice standar profesional: INV/NARA/{TAHUN}/{NOMOR_URUT}
  const invNumber = useMemo(() => {
    if (b.invNo) return b.invNo;
    if (b.inv_no) return b.inv_no;
    const year = new Date().getFullYear();
    const rawId = b.id || b.booking_id || b.data?.id;
    if (rawId) {
      return `INV/NARA/${year}/${String(rawId).padStart(5, '0')}`;
    }
    // Jika hanya ada kode_booking panjang, ambil bagian uniknya agar ringkas dan rapi
    if (typeof kodeBooking === 'string' && kodeBooking !== 'AC-0000') {
      const parts = kodeBooking.split('-');
      // Contoh: NARA-AC115815102026-98E76EC... -> AC1158151020
      if (parts.length >= 2) {
        return `INV/NARA/${year}/${parts[1].slice(0, 12)}`;
      }
      return `INV/NARA/${year}/${kodeBooking.slice(0, 10)}`;
    }
    return `INV/NARA/${year}/00001`;
  }, [b.invNo, b.inv_no, b.id, b.booking_id, b.data, kodeBooking]);
  
  const customerNama = b.customer_nama || 
    (typeof b.customer?.nama === 'string' ? b.customer.nama : '') || 
    (typeof b.nama === 'string' ? b.nama : '') || 
    (typeof b.nama_customer === 'string' ? b.nama_customer : '') || 
    'Pelanggan NARA AC';

  const customerKontak = (typeof b.kontak === 'string' ? b.kontak : '') || 
    (typeof b.customer?.kontak === 'string' ? b.customer.kontak : '') || 
    '-';

  const customerAlamat = (typeof b.alamat === 'string' ? b.alamat : '') || 
    (typeof b.customer?.alamat === 'string' ? b.customer.alamat : '') || 
    '-';

  const keluhan = typeof b.keluhan === 'string' ? b.keluhan : '';

  const jadwalMulai = b.jadwal_mulai;
  const teknisiNama = (typeof b.teknisi_lengkap === 'string' ? b.teknisi_lengkap : '') || 
    (typeof b.teknisi?.nama === 'string' ? b.teknisi.nama : '') || 
    (typeof b.teknisi === 'string' ? b.teknisi : '') || 
    'Teknisi Berlisensi NARA AC';

  const namaLayanan = (typeof b.layanan === 'string' ? b.layanan : '') || 
    (typeof b.layanan?.nama === 'string' ? b.layanan.nama : '') || 
    (typeof b.layanan?.nama_layanan === 'string' ? b.layanan.nama_layanan : '') || 
    (typeof b.nama_layanan === 'string' ? b.nama_layanan : '') || 
    'Cuci AC Standard';

  const basePrice = Number(b.harga || b.layanan?.harga || b.basePrice || 75000);

  const invoiceItems = useMemo(() => {
    if (Array.isArray(b.items) && b.items.length > 0) {
      return b.items.map((it) => ({
        nama: it.nama_layanan || it.nama || namaLayanan,
        units: Number(it.jumlah_unit || 1),
        hargaSatuan: Number(it.harga_satuan || it.harga || basePrice),
        subtotal: Number(it.subtotal != null ? it.subtotal : (Number(it.harga_satuan || it.harga || basePrice) * Number(it.jumlah_unit || 1))),
        catatan: it.catatan || '',
      }));
    }
    const defaultUnits = Number(b.jumlah_unit || b.unit || 1);
    return [{
      nama: namaLayanan,
      units: defaultUnits,
      hargaSatuan: basePrice,
      subtotal: basePrice * defaultUnits,
      catatan: '',
    }];
  }, [b.items, b.jumlah_unit, b.unit, b.harga, b.layanan, b.basePrice, namaLayanan, basePrice]);

  const units = useMemo(() => {
    if (b.units !== undefined) return Number(b.units);
    if (b.jumlah_unit !== undefined) return Number(b.jumlah_unit);
    return invoiceItems.reduce((acc, it) => acc + it.units, 0);
  }, [b.units, b.jumlah_unit, invoiceItems]);

  // Determine membership status (BR-01, BR-02, BR-03)
  const isMember = Boolean(b.is_member || b.customer?.is_member || b.customer_is_member);

  // Subtotals: split service items and spare parts (BR-02, BR-03, BR-39, BR-40)
  const subtotalJasa = useMemo(() => {
    if (b.subtotal_jasa !== undefined) return Number(b.subtotal_jasa);
    return invoiceItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [b.subtotal_jasa, invoiceItems]);

  const sparepartItems = useMemo(() => {
    if (Array.isArray(b.sparepart_items)) return b.sparepart_items;
    if (Array.isArray(b.pemakaian_inventory)) {
      return b.pemakaian_inventory.map(p => ({
        nama: p.nama_item || 'Spare Part / Material',
        qty: Number(p.jumlah || 1),
        hargaSatuan: Number(p.harga_jual || p.harga_satuan || 0),
        subtotal: Number(p.total_harga || (Number(p.jumlah || 1) * Number(p.harga_jual || 0))),
      }));
    }
    return [];
  }, [b.sparepart_items, b.pemakaian_inventory]);

  const subtotalSparepart = useMemo(() => {
    if (b.subtotal_sparepart !== undefined) return Number(b.subtotal_sparepart);
    return sparepartItems.reduce((acc, it) => acc + (Number(it.subtotal) || (Number(it.qty || 1) * Number(it.hargaSatuan || 0))), 0);
  }, [b.subtotal_sparepart, sparepartItems]);

  const subtotal = subtotalJasa + subtotalSparepart;

  // Discount calculation:
  // BR-02: Member gets 10% discount on service labor only.
  // Non-member: Diskon eksklusif hanya untuk member (0% untuk non-member).
  // BR-03: Spare parts never get discount.
  const { discount, discountLabel } = useMemo(() => {
    if (b.discount !== undefined && b.discount_label) {
      return { discount: Number(b.discount), discountLabel: b.discount_label };
    }
    if (isMember) {
      const disc = Math.round(subtotalJasa * 0.1);
      return { discount: disc, discountLabel: 'Diskon Spesial Membership (10% Biaya Jasa)' };
    }
    return { discount: 0, discountLabel: '' };
  }, [subtotalJasa, isMember, b.discount, b.discount_label]);

  const total = b.total !== undefined ? Number(b.total) : (subtotal - discount);

  // Financial reconciliation: initial vs final, balance due vs refund (BR-39, BR-40, BR-41)
  const invoiceType = b.invoice_type || (b.status === 'done' || subtotalSparepart > 0 ? 'final' : 'initial');
  const invoiceTypeLabel = b.invoice_type_label || (invoiceType === 'final' ? 'Invoice Final (Penyelesaian Pekerjaan)' : 'Invoice Awal (Estimasi Booking)');
  const totalDibayar = Number(b.total_dibayar || (b.isPaid || b.status_pembayaran === 'paid' ? total : 0));
  const balanceDue = Number(b.balance_due != null ? b.balance_due : Math.max(0, total - totalDibayar));
  const refundAmount = Number(b.refund_amount != null ? b.refund_amount : Math.max(0, totalDibayar - total));

  // Warranty duration text
  const warrantyText = useMemo(() => {
    if (b.garansi) return b.garansi;
    if (b.warrantyText) return b.warrantyText;
    const sName = namaLayanan.toLowerCase();
    if (sName.includes('freon') && sName.includes('core')) {
      return '45 Hari Penuh Garansi Dingin';
    } else if (sName.includes('core')) {
      return '30 Hari Penuh Garansi Pengerjaan';
    } else if (sName.includes('bongkar')) {
      return '30 Hari Kalender Garansi Instalasi';
    }
    return '14 Hari Kalender Garansi Pengerjaan';
  }, [namaLayanan, b.garansi, b.warrantyText]);

  // Is Paid status
  const isPaid = isPaidOverride !== undefined 
    ? Boolean(isPaidOverride) 
    : (b.isPaid !== undefined 
        ? Boolean(b.isPaid) 
        : (b.status_pembayaran ? b.status_pembayaran === 'paid' : b.status === 'done'));

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      id="printable-invoice" 
      className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:overflow-visible print:w-full print:border-none print:shadow-none"
    >
      {/* ============================================================== */}
      {/* 1. KOP SURAT RESMI CV. NARA TEKNINDOTAMA                       */}
      {/* ============================================================== */}
      <div className="pb-3 border-b-2 border-slate-950">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Left: Official Logo & Legal Information */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <img
              src="/images/logo.png"
              alt="Logo Resmi CV. Nara Teknindotama"
              className="h-14 sm:h-16 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 
                  className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight leading-none"
                  style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}
                >
                  CV. NARA TEKNINDOTAMA
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-wider border border-blue-200">
                  24 HOUR SERVICE
                </span>
              </div>
              <p className="text-xs font-bold text-blue-700 tracking-wider uppercase mt-1">
                Layanan Spesialis Perawatan & Reparasi Pendingin Udara (AC)
              </p>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-snug mt-1">
                <strong>Alamat:</strong> Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat<br />
                <strong>Kontak:</strong> WhatsApp: 0813-8529-3137 | Email: narateknindotama@gmail.com | Web: www.narateknindotama.com<br />
                <strong>Legalitas:</strong> NIB: 2805250066735 | NPWP: 10.000.000.0-258.288 | AHU-0045403-AH.01.14 Tahun 2025
              </p>
            </div>
          </div>

          {/* Right: Invoice Tag & Metadata */}
          <div className="text-left md:text-right shrink-0 w-full md:w-auto max-w-full md:max-w-xs">
            <div className="inline-block w-full px-3.5 py-2 rounded-xl bg-slate-900 text-white text-left md:text-right shadow-xs">
              <div className="flex items-center justify-between md:justify-end gap-1.5 mb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-sky-400">
                  {invoiceTypeLabel}
                </span>
                {isMember && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[8px] uppercase tracking-wider">
                    ★ Member
                  </span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-mono font-black tracking-wider block">
                {invNumber}
              </span>
              {kodeBooking && (
                <div className="mt-1 pt-1 border-t border-slate-700/80 flex flex-wrap items-center justify-start md:justify-end gap-1 text-[10px] text-slate-300">
                  <span className="text-slate-400">Kode Tiket:</span>
                  <span className="font-mono font-bold text-sky-300 break-all">{kodeBooking}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Terbit: {todayStr}
            </p>
            <span className={cn(
              "inline-block mt-1 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
              isPaid 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                : "bg-sky-50 text-blue-800 border-blue-300"
            )}>
              {isPaid ? '✓ LUNAS (PAID)' : 'TAGIHAN TERJADWAL'}
            </span>
          </div>
        </div>

        {/* Standard Official Double Line */}
        <div className="mt-2.5 border-b-2 border-slate-950" />
        <div className="mt-0.5 border-b border-slate-700" />
      </div>

      {/* ============================================================== */}
      {/* 2. INFORMASI PELANGGAN & JADWAL TEKNISI                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3.5 border-b border-slate-200 text-xs">
        {/* Left: Ditujukan Kepada */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            DITUJUKAN KEPADA (PELANGGAN):
          </span>
          <p className="font-black text-slate-950 text-sm">
            {customerNama}
          </p>
          <p className="text-slate-600 mt-0.5 font-mono text-xs">
            WhatsApp / Kontak: {customerKontak}
          </p>
          <p className="text-slate-700 mt-1 leading-snug">
            <strong>Alamat Servis:</strong> {customerAlamat}
          </p>
          {keluhan && (
            <p className="text-slate-500 mt-1 text-xs italic">
              Keluhan Awal: &ldquo;{keluhan}&rdquo;
            </p>
          )}
        </div>

        {/* Right: Rincian Jadwal & Teknisi */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-left sm:text-right">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            RINCIAN JADWAL & TEKNISI BERTUGAS:
          </span>
          <p className="text-slate-800 text-xs">
            Hari, Tanggal: <strong>{jadwalMulai ? formatDate(jadwalMulai) : todayStr}</strong>
          </p>
          <p className="text-slate-800 mt-0.5 text-xs">
            Waktu Kunjungan: <strong>Pukul {jadwalMulai ? formatTime(jadwalMulai) : '09:00'} WIB</strong>
          </p>
          <p className="text-slate-800 mt-0.5 text-xs">
            Teknisi Penanggung Jawab: <strong>{teknisiNama}</strong>
          </p>
          <p className="text-blue-700 mt-1 text-xs font-bold">
            Standar SOP 7 Langkah Pembersihan & Keselamatan Kerja
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TABEL ITEM LAYANAN SERVIS & MULTI-UNIT                      */}
      {/* ============================================================== */}
      <div className="py-3.5 border-b border-slate-200">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs min-w-[500px]">
          <thead>
            <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-xs">
              <th className="py-2 px-2 text-center w-10">No</th>
              <th className="py-2 px-2">Deskripsi Layanan Servis</th>
              <th className="py-2 px-2 text-center w-16">Unit</th>
              <th className="py-2 px-2 text-right w-28">Tarif Satuan</th>
              <th className="py-2 px-2 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoiceItems.map((item, idx) => (
              <tr key={`svc-${idx}`}>
                <td className="py-2.5 px-2 text-center font-mono font-bold">{idx + 1}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">Jasa</span>
                    <p className="font-bold text-slate-900 text-xs">{item.nama}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.catatan ? `Catatan: ${item.catatan} — ` : ''}
                    Pembersihan evaporator, kondensor, blower indoor, drainase air, pengecekan kelistrikan & tekanan freon (SOP 7 Langkah NARA AC)
                  </p>
                </td>
                <td className="py-2.5 px-2 text-center font-bold font-mono">{item.units}</td>
                <td className="py-2.5 px-2 text-right font-mono">Rp {item.hargaSatuan.toLocaleString('id-ID')}</td>
                <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-950">
                  Rp {item.subtotal.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}

            {/* Spare Part / Material Items (BR-03, BR-05, BR-39) */}
            {sparepartItems.map((item, idx) => (
              <tr key={`part-${idx}`} className="bg-slate-50/50">
                <td className="py-2.5 px-2 text-center font-mono font-bold">{invoiceItems.length + idx + 1}</td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold uppercase">Spare Part / Material</span>
                    <p className="font-bold text-slate-900 text-xs">{item.nama}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Komponen pengganti resmi dengan standar mutu NARA AC
                  </p>
                </td>
                <td className="py-2.5 px-2 text-center font-bold font-mono">{item.qty || 1}</td>
                <td className="py-2.5 px-2 text-right font-mono">Rp {Number(item.hargaSatuan || 0).toLocaleString('id-ID')}</td>
                <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-950">
                  Rp {Number(item.subtotal || (Number(item.qty || 1) * Number(item.hargaSatuan || 0))).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}

            {discount > 0 && (
              <tr className="bg-emerald-50 text-emerald-900 font-medium">
                <td className="py-2 px-2 text-center font-mono">{invoiceItems.length + sparepartItems.length + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{discountLabel}</span>
                    {isMember && (
                      <span className="text-[10px] text-emerald-700 italic">
                        (Berlaku khusus jasa pengerjaan teknisi)
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-center">-</td>
                <td className="py-2 px-2 text-right font-mono">-</td>
                <td className="py-2 px-2 text-right font-bold font-mono text-emerald-700">
                  -Rp {discount.toLocaleString('id-ID')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. TOTALS & INSTRUKSI PEMBAYARAN RESMI                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3.5 border-b border-slate-200 text-xs avoid-page-break">
        {/* Left: Instruksi Pembayaran Rekening Perusahaan */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="font-bold text-slate-900 text-xs block mb-1">
            Instruksi Pembayaran Resmi CV. Nara Teknindotama:
          </span>
          <p className="text-slate-600 text-xs mb-2 leading-tight">
            Pembayaran non-tunai sah hanya ditujukan ke rekening perusahaan resmi:
          </p>
          <div className="space-y-1 font-mono text-xs bg-white p-2 rounded-lg border border-slate-200">
            {activePayment?.accounts && activePayment.accounts.length > 0 ? (
              activePayment.accounts.map((acc, idx) => (
                <div key={acc.id || idx} className="flex justify-between items-center gap-2">
                  <span><strong>Bank {acc.bank_name}:</strong> {acc.account_number}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">a.n {acc.account_holder}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center">
                <span><strong>Bank BCA:</strong> 8720-9182-33</span>
                <span className="text-xs text-slate-500">a.n CV NARA TEKNINDOTAMA</span>
              </div>
            )}
          </div>
          {activePayment?.instruction_note ? (
            <p className="text-xs text-slate-500 mt-1.5 italic leading-tight">
              {activePayment.instruction_note}
            </p>
          ) : null}
        </div>

        {/* Right: Perhitungan Total */}
        <div className="space-y-1.5 text-left sm:text-right self-center pr-0 sm:pr-2">
          <div className="flex justify-between text-slate-600 text-xs">
            <span>Subtotal Jasa Servis:</span>
            <span className="font-mono">Rp {subtotalJasa.toLocaleString('id-ID')}</span>
          </div>

          {subtotalSparepart > 0 && (
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Subtotal Spare Part &amp; Material:</span>
              <span className="font-mono">Rp {subtotalSparepart.toLocaleString('id-ID')}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700 text-xs">
              <span>{discountLabel}:</span>
              <span className="font-mono font-bold">-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}

          <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline text-slate-950">
            <span className="font-black text-xs uppercase tracking-wider">TOTAL TAGIHAN:</span>
            <span className="text-xl font-black text-blue-700 font-mono">
              Rp {total.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Balance Due / Refund Reconciliation (BR-41) */}
          {totalDibayar > 0 && (
            <div className="pt-1 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Sudah Dibayar:</span>
                <span className="font-mono font-bold text-slate-800">Rp {totalDibayar.toLocaleString('id-ID')}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                  <span>Sisa Kekurangan Bayar:</span>
                  <span className="font-mono">Rp {balanceDue.toLocaleString('id-ID')}</span>
                </div>
              )}
              {refundAmount > 0 && (
                <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  <span>Kelebihan Bayar (Refund):</span>
                  <span className="font-mono">Rp {refundAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Harga sudah termasuk biaya operasional & alat SOP teknisi.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. GARANSI STRIP & PENGESAHAN DOKUMEN                         */}
      {/* ============================================================== */}
      <div className="pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs avoid-page-break">
        {/* Left: Garansi & Tanda Terima Pelanggan */}
        <div>
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 mb-3">
            <span className="font-bold text-sky-900 text-xs block mb-0.5">
              Jaminan Garansi Resmi NARA AC:
            </span>
            <p className="text-sky-800 text-xs leading-relaxed">
              Layanan ini dilindungi garansi <strong>{warrantyText}</strong>. Jika terjadi kendala dingin atau bocor pasca-servis, klaim mudah via WhatsApp <strong>0813-8529-3137</strong> dengan melampirkan nomor tiket <strong className="font-mono break-all">{kodeBooking}</strong>.
            </p>
          </div>

          <div className="text-center w-48">
            <p className="text-xs text-slate-600 mb-8">Tanda Terima Pelanggan,</p>
            <div className="border-b border-slate-400 w-full pb-1 text-xs font-bold text-slate-800">
              ( {customerNama || 'Pelanggan'} )
            </div>
          </div>
        </div>

        {/* Right: Pengesahan CV. NARA TEKNINDOTAMA */}
        <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
          <p className="text-xs text-slate-600 mb-0.5">
            Kab. Bogor, {todayStr}
          </p>
          <p className="text-xs font-black text-slate-900 mb-1.5">
            CV. NARA TEKNINDOTAMA
          </p>
          
          {/* Stempel & QR Verifikasi Box */}
          <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg border border-blue-200 bg-blue-50/50 max-w-[280px]">
            <div className="w-9 h-9 rounded bg-white border border-blue-300 flex items-center justify-center text-[8px] font-mono text-blue-700 font-bold shrink-0 shadow-2xs">
              QR-OK
            </div>
            <div className="text-left text-[9px] text-blue-900 leading-tight min-w-0">
              <p className="font-bold">VERIFIKASI DIGITAL</p>
              <p className="text-[8px] text-slate-500 font-mono break-all">{kodeBooking}</p>
            </div>
          </div>

          <div className="border-b border-slate-900 w-44 text-center font-bold text-slate-900 pb-1 text-xs">
            ( Administrasi & Operasional )
          </div>
          <span className="text-[9px] text-slate-500 uppercase mt-0.5">
            Dokumen Elektronik Resmi & Sah
          </span>
        </div>
      </div>

    </div>
  );
}
