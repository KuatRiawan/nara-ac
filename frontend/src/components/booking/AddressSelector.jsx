import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, Building2, Navigation, Compass, CheckCircle2, 
  HelpCircle, Sparkles, ChevronDown, Edit3, Globe
} from 'lucide-react';
import { JABODETABEK_REGIONS, GROUPED_CITIES, findCityData } from '../../data/regionsData';

/**
 * Komponen Input Alamat Terstruktur Berjenjang (Cascading Address Selector)
 * Mengelompokkan alamat menjadi:
 * 1. Kota / Kabupaten (Jabodetabek / Lainnya)
 * 2. Kecamatan (Tersaring otomatis berdasarkan Kota yang dipilih)
 * 3. Kelurahan / Desa (Tersaring otomatis berdasarkan Kecamatan yang dipilih)
 * 4. Detail Jalan, No. Rumah, RT/RW, Blok
 * 5. Patokan Lokasi / Catatan Akses Rumah
 * 6. Kode Pos (Estimasi otomatis)
 */
export default function AddressSelector({ 
  value = '', 
  onChange, 
  error = '', 
  required = true,
  className = ''
}) {
  const [mode, setMode] = useState('structured'); // 'structured' | 'manual'

  // Structured fields
  const [kota, setKota] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [customKelurahan, setCustomKelurahan] = useState('');
  const [detailJalan, setDetailJalan] = useState('');
  const [patokan, setPatokan] = useState('');
  const [kodePos, setKodePos] = useState('');
  const [manualText, setManualText] = useState(value || '');

  // Flag to avoid feedback loop between assembleAddress and incoming value
  const isInternalUpdate = useRef(false);

  // Cari data kota aktif
  const cityData = useMemo(() => findCityData(kota), [kota]);

  // Daftar kecamatan untuk kota yang dipilih
  const availableDistricts = useMemo(() => {
    return cityData?.districts || [];
  }, [cityData]);

  // Data kecamatan yang dipilih
  const districtData = useMemo(() => {
    return availableDistricts.find(d => d.name === kecamatan) || null;
  }, [availableDistricts, kecamatan]);

  // Daftar kelurahan untuk kecamatan yang dipilih
  const availableSubdistricts = useMemo(() => {
    return districtData?.subdistricts || [];
  }, [districtData]);

  // Reset kecamatan & kelurahan jika kota berubah
  const handleKotaChange = (e) => {
    const newKota = e.target.value;
    setKota(newKota);
    setKecamatan('');
    setKelurahan('');
    setCustomKelurahan('');
    setKodePos('');
  };

  // Reset kelurahan jika kecamatan berubah & set estimasi kode pos
  const handleKecamatanChange = (e) => {
    const newKec = e.target.value;
    setKecamatan(newKec);
    setKelurahan('');
    setCustomKelurahan('');
    const d = availableDistricts.find(item => item.name === newKec);
    if (d && d.postalCode) {
      setKodePos(d.postalCode);
    }
  };

  // Assemble full address string
  const assembleAddress = () => {
    if (mode === 'manual') {
      return manualText.trim();
    }

    const parts = [];

    // 1. Detail jalan & nomor rumah
    if (detailJalan.trim()) {
      parts.push(detailJalan.trim());
    }

    // 2. Patokan lokasi (dalam kurung jika ada)
    if (patokan.trim()) {
      parts.push(`(Patokan: ${patokan.trim()})`);
    }

    // 3. Kelurahan
    const activeKel = kelurahan === 'OTHER' ? customKelurahan.trim() : kelurahan.trim();
    if (activeKel) {
      parts.push(`Kel. ${activeKel}`);
    }

    // 4. Kecamatan
    if (kecamatan.trim()) {
      parts.push(`Kec. ${kecamatan.trim()}`);
    }

    // 5. Kota / Kabupaten
    if (kota.trim()) {
      parts.push(kota.trim());
    }

    // 6. Provinsi (diambil dari data kota)
    if (cityData?.province) {
      parts.push(cityData.province);
    }

    // 7. Kode Pos
    if (kodePos.trim()) {
      parts.push(kodePos.trim());
    }

    return parts.join(', ');
  };

  // Sync internal changes to parent onChange
  useEffect(() => {
    isInternalUpdate.current = true;
    const formatted = assembleAddress();
    if (onChange) {
      onChange(formatted, {
        kota,
        kecamatan,
        kelurahan: kelurahan === 'OTHER' ? customKelurahan : kelurahan,
        detailJalan,
        patokan,
        kodePos,
        mode
      });
    }
  }, [mode, kota, kecamatan, kelurahan, customKelurahan, detailJalan, patokan, kodePos, manualText]);

  // Inisialisasi awal jika ada value dari luar yang belum diurai
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (value && !detailJalan && !kota && !manualText) {
      setManualText(value);
      // Cek apakah ada nama kota Jabodetabek yang cocok di string
      const matchedCity = JABODETABEK_REGIONS.find(r => value.includes(r.city));
      if (matchedCity) {
        setKota(matchedCity.city);
        const matchedDist = matchedCity.districts.find(d => value.includes(d.name));
        if (matchedDist) {
          setKecamatan(matchedDist.name);
          const matchedSub = matchedDist.subdistricts.find(s => value.includes(s));
          if (matchedSub) {
            setKelurahan(matchedSub);
          }
        }
      }
      setDetailJalan(value);
    }
  }, [value]);

  const fullPreview = assembleAddress();
  const isComplete = kota && kecamatan && detailJalan.trim();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Alamat Lokasi Servis {required && <span className="text-rose-500">*</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-0.5 rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => setMode('structured')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'structured' 
                ? 'bg-white text-blue-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pilih Wilayah (Jabodetabek)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              if (!manualText && fullPreview) setManualText(fullPreview);
            }}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              mode === 'manual' 
                ? 'bg-white text-blue-600 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tulis Bebas / Wilayah Lain
          </button>
        </div>
      </div>

      {mode === 'structured' ? (
        <div className="space-y-3.5 bg-slate-50/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
          {/* Row 1: Kota & Kecamatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kota / Kabupaten */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                1. Kota / Kabupaten <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={kota}
                  onChange={handleKotaChange}
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Kota / Kabupaten --</option>
                  {Object.entries(GROUPED_CITIES).map(([province, cities]) => (
                    <optgroup key={province} label={`--- ${province} ---`}>
                      {cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Kecamatan (Cascading berdasarkan Kota) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                2. Kecamatan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={kecamatan}
                  onChange={handleKecamatanChange}
                  disabled={!kota}
                  className={`w-full h-11 px-3.5 pr-8 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                    !kota 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-900 border-slate-200 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!kota ? '← Pilih Kota terlebih dahulu' : '-- Pilih Kecamatan --'}
                  </option>
                  {availableDistricts.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Kelurahan & Kode Pos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Kelurahan */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                3. Kelurahan / Desa
              </label>
              <div className="relative">
                <select
                  value={kelurahan}
                  onChange={e => setKelurahan(e.target.value)}
                  disabled={!kecamatan}
                  className={`w-full h-11 px-3.5 pr-8 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                    !kecamatan 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-900 border-slate-200 cursor-pointer'
                  }`}
                >
                  <option value="">
                    {!kecamatan ? '← Pilih Kecamatan dahulu' : '-- Pilih Kelurahan (Opsional) --'}
                  </option>
                  {availableSubdistricts.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="OTHER">+ Ketik Kelurahan Lainnya...</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Input custom jika kelurahan tidak di daftar */}
              {kelurahan === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Ketik nama kelurahan Anda..."
                  value={customKelurahan}
                  onChange={e => setCustomKelurahan(e.target.value)}
                  className="w-full mt-2 h-10 px-3.5 rounded-xl border border-blue-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Kode Pos */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Kode Pos (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 13440"
                value={kodePos}
                onChange={e => setKodePos(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Nama Jalan, No Rumah, RT/RW */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              4. Nama Jalan, No. Rumah, RT/RW, Blok / Unit <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={detailJalan}
              onChange={e => setDetailJalan(e.target.value)}
              placeholder="Contoh: Jl. Pahlawan Revolusi No. 45, RT 03/RW 04, Blok B No. 7..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
            />
          </div>

          {/* Row 4: Patokan Lokasi */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              5. Patokan Lokasi / Petunjuk Akses (Sangat Dianjurkan)
            </label>
            <div className="relative">
              <Compass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={patokan}
                onChange={e => setPatokan(e.target.value)}
                placeholder="Contoh: Pagar hitam seberang Masjid Al-Falah, samping Alfamart, masuk gang ke-2..."
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Membantu teknisi NARA AC menemukan lokasi Anda tanpa tersesat dan tiba tepat waktu.
            </p>
          </div>
        </div>
      ) : (
        /* Manual Full Text Mode */
        <div className="space-y-2">
          <textarea
            rows={4}
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Tuliskan alamat lengkap Anda: Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten, dan Patokan Rumah..."
            className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
          />
          <p className="text-[11px] text-slate-400">
            Pastikan menyertakan Kecamatan dan Kota agar sistem penugasan teknisi berjalan akurat.
          </p>
        </div>
      )}

      {/* Live Formatted Address Preview Card */}
      {fullPreview && (
        <div className={`p-3.5 rounded-xl border transition-all ${
          isComplete || mode === 'manual' 
            ? 'bg-blue-50/50 border-blue-100 text-slate-800' 
            : 'bg-amber-50/50 border-amber-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" /> Preview Format Alamat Resmi
            </span>
            {isComplete && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Struktur Lengkap
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed font-sans">
            {fullPreview}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
