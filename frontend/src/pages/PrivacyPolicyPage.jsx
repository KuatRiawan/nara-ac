import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CheckCircle2, Phone, Mail, Building2 } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo dark={false} iconSize="h-9 sm:h-10" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-700/60 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-100 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kepatuhan UU PDP No. 27 Tahun 2022</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Kebijakan Privasi
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Komitmen CV. Nara Teknindotama dalam menjaga kerahasiaan, keamanan, dan integritas data pribadi Anda saat menggunakan layanan servis dan pemesanan AC kami.
          </p>
          <p className="text-xs text-blue-300 font-medium">
            Terakhir diperbarui: 15 Oktober 2026 &bull; Berlaku untuk seluruh pengguna situs dan pelanggan NARA AC
          </p>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 space-y-10 text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                1
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pendahuluan & Komitmen Privasi</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 pl-11">
              Selamat datang di <strong>NARA AC</strong>, platform digital penyedia layanan pemesanan dan pengingat servis pendingin ruangan (AC) yang dikelola oleh <strong>CV. Nara Teknindotama</strong> (&ldquo;Kami&rdquo;, &ldquo;NARA AC&rdquo;). Kami berkomitmen tinggi untuk melindungi hak privasi pelanggan kami sesuai dengan ketentuan <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong> serta peraturan perundang-undangan terkait lainnya.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                2
              </div>
              <h2 className="text-xl font-bold tracking-tight">Data Pribadi yang Kami Kumpulkan</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>Untuk memproses pemesanan servis AC dan memastikan kunjungan teknisi tepat sasaran, kami mengumpulkan data berikut:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Data Identitas & Kontak:</strong> Nama lengkap, nomor telepon (WhatsApp), dan alamat email aktif.
                </li>
                <li>
                  <strong>Data Alamat & Lokasi Kunjungan:</strong> Alamat lengkap rumah/kantor, patokan jalan, RT/RW, kelurahan/kecamatan, dan wilayah domisili untuk keperluan navigasi teknisi.
                </li>
                <li>
                  <strong>Informasi Unit AC & Layanan:</strong> Merk AC, tipe unit (Split, Inverter, Cassette), kapasitas (PK), keluhan teknis (contoh: tidak dingin, bau, menetes air), dan tanggal permintaan kunjungan.
                </li>
                <li>
                  <strong>Data Transaksi & Pembayaran:</strong> Riwayat pemesanan, kode booking, faktur (invoice resmi), metode pembayaran yang dipilih (Tunai, Transfer, QRIS), dan status pembayaran. Kami <em>tidak menyimpan</em> data kredensial perbankan atau PIN kartu Anda.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                3
              </div>
              <h2 className="text-xl font-bold tracking-tight">Tujuan Pemrosesan Data Pribadi</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>Data pribadi yang Anda berikan diproses secara sah untuk tujuan-tujuan berikut:</p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Penjadwalan & Kunjungan</h3>
                  <p className="text-xs text-slate-600 mt-1">Menugaskan teknisi resmi NARA AC ke lokasi alamat Anda sesuai waktu yang Anda tentukan.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Konfirmasi & Notifikasi</h3>
                  <p className="text-xs text-slate-600 mt-1">Mengirimkan kode booking, status teknisi menuju lokasi, serta faktur resmi via WhatsApp/Email.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Pengingat Cerdas Berkala</h3>
                  <p className="text-xs text-slate-600 mt-1">Memberikan pengingat jadwal cuci AC berkala (interval 3 bulan) demi menjaga kesehatan udara & efisiensi daya AC Anda.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                  <h3 className="font-bold text-slate-900 text-sm">Klaim Garansi & Faktur</h3>
                  <p className="text-xs text-slate-600 mt-1">Memvalidasi hak klaim garansi servis 14 hari serta riwayat pemeliharaan unit AC Anda.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                4
              </div>
              <h2 className="text-xl font-bold tracking-tight">Kerahasiaan & Keamanan Data (Anti-Leak)</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                NARA AC menerapkan standar rekayasa keamanan perangkat lunak mutakhir untuk mencegah kebocoran data (data breach):
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Penyamaran PII Publik (Data Masking):</strong> Pada halaman lacak status servis publik, nama pelanggan, nomor kontak, dan alamat disamarkan secara ketat (contoh: <code>B••• D•••</code>, <code>0812-••••-7890</code>) sehingga tidak dapat disalahgunakan pihak ketiga.
                </li>
                <li>
                  <strong>Enkripsi Komunikasi:</strong> Seluruh pertukaran data antara browser Anda dan peladen NARA AC diamankan dengan enkripsi Transport Layer Security (HTTPS/TLS).
                </li>
                <li>
                  <strong>Pembatasan Hak Akses:</strong> Hanya teknisi yang ditugaskan secara resmi yang dapat melihat detail rute alamat pemesanan yang bersangkutan.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                5
              </div>
              <h2 className="text-xl font-bold tracking-tight">Tidak Ada Penjualan Data ke Pihak Ketiga</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 pl-11">
              <strong>Kami tidak pernah dan tidak akan pernah menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak ketiga</strong> untuk tujuan pemasaran komersial atau periklanan eksternal di luar operasional langsung NARA AC.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                6
              </div>
              <h2 className="text-xl font-bold tracking-tight">Hak-Hak Pemilik Data Pribadi</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <p>Sesuai dengan UU PDP, Anda sebagai pemilik data berhak untuk:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Meminta informasi dan salinan data riwayat servis unit AC Anda.</li>
                <li>Meminta pembaruan atau perbaikan data jika terdapat nomor kontak atau alamat yang keliru.</li>
                <li>Menarik persetujuan notifikasi pengingat servis otomatis kapan saja melalui konfirmasi kepada staf kami.</li>
                <li>Meminta penghapusan data akun Anda dari basis data aktif kami.</li>
              </ul>
            </div>
          </section>

          {/* Section 7 - Kontak DPO */}
          <section className="space-y-3 bg-blue-50/60 border border-blue-200/80 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-blue-900">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-bold">Kontak Petugas Pelindungan Data (DPO)</h2>
            </div>
            <p className="text-sm text-slate-600">
              Jika Anda memiliki pertanyaan, keberatan, atau ingin menggunakan hak-hak pelindungan data pribadi Anda, silakan hubungi tim resmi kami:
            </p>
            <div className="pt-2 space-y-2 text-sm text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>CV. Nara Teknindotama</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <a href="mailto:narateknindotama@gmail.com" className="text-blue-600 underline hover:text-blue-700">narateknindotama@gmail.com</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp: 0812-9988-7766</span>
              </div>
              <div className="text-xs text-slate-500 pt-1">
                Alamat: Jl. Teluk Langsa RT.002 RW.016, Ciangsana, Kec. Gunung Putri, Kab. Bogor, Jawa Barat.
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
