import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, Phone } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

export default function TermsConditionsPage() {
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
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-blue-950 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-600/30 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-blue-200 backdrop-blur-sm">
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Perjanjian Layanan & Ketentuan Garansi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Syarat & Ketentuan Layanan
          </h1>
          <p className="text-slate-200 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Pedoman hak, kewajiban, transparansi harga, serta ketentuan garansi resmi pengerjaan servis AC oleh CV. Nara Teknindotama.
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Terakhir diperbarui: 15 Oktober 2026 &bull; Mengikat bagi setiap pemesan layanan NARA AC
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
              <h2 className="text-xl font-bold tracking-tight">Ketentuan Umum & Definisi</h2>
            </div>
            <div className="pl-11 space-y-2 text-sm sm:text-base text-slate-600">
              <p>
                Dengan mengakses situs web <strong>NARA AC</strong> atau membuat pesanan (booking) layanan servis, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Syarat dan Ketentuan ini.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Kami / NARA AC:</strong> Merujuk pada badan usaha CV. Nara Teknindotama beserta staf dan teknisi resmi yang ditunjuk.</li>
                <li><strong>Pelanggan:</strong> Individu atau instansi yang memesan jasa cuci, perbaikan, isi freon, atau bongkar pasang pendingin ruangan (AC).</li>
                <li><strong>Teknisi Resmi:</strong> Tenaga ahli berstandar SOP yang ditugaskan resmi oleh NARA AC dan dilengkapi surat tugas / bukti pemesanan digital.</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                2
              </div>
              <h2 className="text-xl font-bold tracking-tight">Prosedur Pemesanan & Penjadwalan</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                Pelanggan wajib memberikan informasi alamat, patokan, nomor kontak aktif, dan rincian keluhan unit AC secara benar dan akurat guna kelancaran kunjungan.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Toleransi Waktu Kedatangan:</strong> Teknisi kami berkomitmen hadir tepat waktu sesuai sesi yang dipilih. Namun demikian, terdapat toleransi keterlambatan 30–60 menit yang diakibatkan oleh kondisi cuaca ekstrem (hujan deras), kendala kemacetan lalu lintas, atau penyelesaian unit di pelanggan sebelumnya.
                </li>
                <li>
                  <strong>Perubahan Jadwal (Reschedule):</strong> Perubahan jadwal kedatangan dapat dilakukan tanpa biaya tambahan jika dikonfirmasikan paling lambat 2 (dua) jam sebelum jam kunjungan yang disepakati.
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
              <h2 className="text-xl font-bold tracking-tight">Keamanan Area Kerja & Akses Lokasi</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>Untuk keselamatan bersama teknisi dan aset pelanggan:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Pelanggan wajib menyediakan akses yang aman menuju unit indoor maupun outdoor (misalnya tersedianya akses tangga, balkon aman, atau tidak membahayakan keselamatan kerja K3).
                </li>
                <li>
                  Pelanggan berhak memeriksa identitas teknisi, surat tugas digital, atau mencocokkan nama teknisi dengan informasi pada notifikasi resmi NARA AC sebelum mengizinkan teknisi masuk ke dalam rumah.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 - Kebijakan Garansi */}
          <section className="space-y-4 bg-emerald-50/70 border border-emerald-200/80 p-6 sm:p-8 rounded-3xl">
            <div className="flex items-center gap-3 text-emerald-950">
              <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-xl font-bold tracking-tight">Ketentuan Garansi Resmi NARA AC</h2>
                <p className="text-xs text-emerald-700 font-medium">Jaminan mutu dan kepuasan pelanggan atas pengerjaan teknisi</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  14 HARI
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Garansi Cuci AC</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Menjamin kebocoran air (water leak atau menetes) atau suara getar tidak wajar pada unit yang sama pasca pencucian.
                </p>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  30 HARI
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Garansi Pengisian Freon</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Berlaku apabila terjadi penurunan tekanan freon yang bersumber dari sambungan kran/nepel yang dikerjakan oleh teknisi kami.
                </p>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full mb-2">
                  30 HARI
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Garansi Ganti Part</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Meliputi kerusakan ulang pada komponen suku cadang baru yang diganti teknisi (contoh: kapasitor, sensor suhu, motor fan).
                </p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Syarat Klaim Garansi:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Menunjukkan kode booking atau lembar faktur digital (invoice resmi) asli NARA AC.</li>
                <li>Unit belum pernah dibongkar atau diperbaiki oleh teknisi pihak ketiga non-NARA AC selama masa garansi.</li>
                <li>Garansi tidak mencakup kerusakan akibat tegangan listrik PLN yang anjlok/korsleting atau bencana alam (banjir/petir).</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                5
              </div>
              <h2 className="text-xl font-bold tracking-tight">Tarif Layanan & Transparansi Biaya</h2>
            </div>
            <div className="pl-11 space-y-3 text-sm sm:text-base text-slate-600">
              <p>
                Seluruh tarif jasa servis AC mengacu pada daftar harga resmi yang tertera pada platform NARA AC.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Persetujuan Biaya Tambahan:</strong> Apabila saat pemeriksaan fisik di lapangan ditemukan kerusakan komponen tambahan (misal: kebocoran pipa, kerusakan kapasitor), teknisi <strong>wajib menjelaskan dan meminta persetujuan pelanggan terlebih dahulu</strong> sebelum melakukan pengerjaan atau penggantian suku cadang.
                </li>
                <li>
                  <strong>Pembayaran:</strong> Dilakukan setelah seluruh pekerjaan selesai dan unit diuji dingin, melalui transfer bank, scan QRIS resmi, atau tunai kepada teknisi dengan tanda bukti faktur sistem.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                6
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pembatalan Sepihak (Cancellation Policy)</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 pl-11">
              Jika teknisi telah tiba di lokasi sesuai jadwal yang disepakati, namun pelanggan membatalkan pesanan secara mendadak atau rumah dalam kondisi kosong tanpa konfirmasi sebelumnya, maka pelanggan dapat dikenakan biaya penggantian transportasi teknisi sebesar Rp 30.000 &ndash; Rp 50.000 sesuai jarak tempuh.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                7
              </div>
              <h2 className="text-xl font-bold tracking-tight">Hukum yang Berlaku & Penyelesaian Sengketa</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 pl-11">
              Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Kesatuan Republik Indonesia. Setiap perselisihan yang timbul akan diselesaikan terlebih dahulu melalui musyawarah untuk mencapai mufakat secara kekeluargaan.
            </p>
          </section>

          {/* Kontak Dukungan Pelanggan */}
          <section className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Punya Pertanyaan Mengenai Ketentuan Ini?</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Tim layanan pelanggan NARA AC siap melayani konsultasi operasional Anda setiap hari (08:00 &ndash; 18:00 WIB).</p>
            </div>
            <a
              href="https://wa.me/6281299887766?text=Halo%20NARA%20AC,%20saya%20ingin%20bertanya%20mengenai%20syarat%20dan%20garansi%20servis."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0 shadow-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Hubungi Customer Care</span>
            </a>
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
