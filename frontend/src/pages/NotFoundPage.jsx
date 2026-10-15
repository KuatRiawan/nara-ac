import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Calendar, Search, ArrowLeft } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import { Button } from '../components/ui/button';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Halaman Tidak Ditemukan | NARA AC';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <CompanyLogo className="h-8 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-blue-600">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center py-12 px-6 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-extrabold shadow-inner">
            404
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            Halaman atau tautan yang Anda cari tidak tersedia, telah dipindahkan, atau alamat URL yang dimasukkan salah.
          </p>

          <div className="flex flex-col gap-3">
            <Link to="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 font-medium shadow-sm">
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/status">
                <Button variant="outline" className="w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Search className="w-4 h-4 text-blue-600" />
                  Cek Status
                </Button>
              </Link>
              <Link to="/booking">
                <Button variant="outline" className="w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Pesan Servis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
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
