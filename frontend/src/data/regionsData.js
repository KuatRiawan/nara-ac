/**
 * Master Data Regional Wilayah Operasional NARA AC (Jabodetabek & Sekitarnya)
 * Menyediakan struktur berjenjang: Provinsi -> Kota/Kabupaten -> Kecamatan -> Kelurahan
 * Lengkap dengan kode pos estimasi untuk mempermudah pengisian alamat presisi.
 */

export const JABODETABEK_REGIONS = [
  {
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Timur',
    districts: [
      { name: 'Cakung', subdistricts: ['Cakung Barat', 'Cakung Timur', 'Rawa Terate', 'Jatinegara Kaum', 'Penggilingan', 'Pulogebang', 'Ujung Menteng'], postalCode: '13910' },
      { name: 'Cipayung', subdistricts: ['Lubang Buaya', 'Ceger', 'Cipayung', 'Munjul', 'Pondok Ranggon', 'Cilangkap', 'Setu', 'Bambu Apus'], postalCode: '13840' },
      { name: 'Ciracas', subdistricts: ['Cibubur', 'Kelapa Dua Wetan', 'Ciracas', 'Susukan', 'Rambutan'], postalCode: '13740' },
      { name: 'Duren Sawit', subdistricts: ['Pondok Bambu', 'Duren Sawit', 'Pondok Kelapa', 'Pondok Kopi', 'Malaka Jaya', 'Malaka Sari', 'Klender'], postalCode: '13440' },
      { name: 'Jatinegara', subdistricts: ['Bali Mester', 'Kampung Melayu', 'Bidaracina', 'Cipinang Cempedak', 'Rawa Bunga', 'Cipinang Besar Utara', 'Cipinang Besar Selatan', 'Cipinang Muara'], postalCode: '13310' },
      { name: 'Kramat Jati', subdistricts: ['Kramat Jati', 'Batu Ampar', 'Balekambang', 'Kampung Tengah', 'Dukuh', 'Cawang', 'Cililitan'], postalCode: '13510' },
      { name: 'Makasar', subdistricts: ['Pinang Ranti', 'Makasar', 'Halim Perdanakusuma', 'Cipinang Melayu', 'Kebon Pala'], postalCode: '13570' },
      { name: 'Matraman', subdistricts: ['Pisangan Baru', 'Utan Kayu Selatan', 'Utan Kayu Utara', 'Kayu Manis', 'Pal Meriam', 'Kebon Manggis'], postalCode: '13110' },
      { name: 'Pasar Rebo', subdistricts: ['Pekayon', 'Kampung Gedong', 'Cijantung', 'Kampung Baru', 'Kalisari'], postalCode: '13710' },
      { name: 'Pulo Gadung', subdistricts: ['Pisangan Timur', 'Cipinang', 'Jatinegara Kaum', 'Rawamangun', 'Kayu Putih', 'Jati', 'Pulo Gadung'], postalCode: '13220' }
    ]
  },
  {
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Selatan',
    districts: [
      { name: 'Cilandak', subdistricts: ['Cipete Selatan', 'Gandaria Selatan', 'Cilandak Barat', 'Lebak Bulus', 'Pondok Labu'], postalCode: '12430' },
      { name: 'Jagakarsa', subdistricts: ['Tanjung Barat', 'Lenteng Agung', 'Jagakarsa', 'Ciganjur', 'Srengseng Sawah', 'Cipedak'], postalCode: '12630' },
      { name: 'Kebayoran Baru', subdistricts: ['Selong', 'Gunung', 'Kramat Pela', 'Gandaria Utara', 'Cipete Utara', 'Pulo', 'Melawai', 'Petogogan', 'Rawa Barat', 'Senayan'], postalCode: '12120' },
      { name: 'Kebayoran Lama', subdistricts: ['Grogol Utara', 'Grogol Selatan', 'Cipulir', 'Kebayoran Lama Utara', 'Kebayoran Lama Selatan', 'Pondok Pinang'], postalCode: '12240' },
      { name: 'Mampang Prapatan', subdistricts: ['Kuningan Barat', 'Pela Mampang', 'Bangka', 'Tegal Parang', 'Mampang Prapatan'], postalCode: '12790' },
      { name: 'Pancoran', subdistricts: ['Kalibata', 'Rawa Jati', 'Duren Tiga', 'Cikoko', 'Pengadegan', 'Pancoran'], postalCode: '12780' },
      { name: 'Pasar Minggu', subdistricts: ['Pejaten Barat', 'Pejaten Timur', 'Pasar Minggu', 'Kebagusan', 'Jati Padang', 'Ragunan', 'Cilandak Timur'], postalCode: '12520' },
      { name: 'Pesanggrahan', subdistricts: ['Ulujami', 'Petukangan Utara', 'Petukangan Selatan', 'Pesanggrahan', 'Bintaro'], postalCode: '12320' },
      { name: 'Setiabudi', subdistricts: ['Setiabudi', 'Karet', 'Karet Semanggi', 'Karet Kuningan', 'Kuningan Timur', 'Menteng Atas', 'Pasar Manggis', 'Guntur'], postalCode: '12920' },
      { name: 'Tebet', subdistricts: ['Tebet Barat', 'Tebet Timur', 'Kebon Baru', 'Bukit Duri', 'Manggarai', 'Manggarai Selatan', 'Menteng Dalam'], postalCode: '12810' }
    ]
  },
  {
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Barat',
    districts: [
      { name: 'Cengkareng', subdistricts: ['Kedaung Kali Angke', 'Kapuk', 'Cengkareng Barat', 'Cengkareng Timur', 'Rawa Buaya', 'Duri Kosambi'], postalCode: '11730' },
      { name: 'Grogol Petamburan', subdistricts: ['Tomang', 'Grogol', 'Jelambar', 'Jelambar Baru', 'Wijaya Kusuma', 'Tanjung Duren Utara', 'Tanjung Duren Selatan'], postalCode: '11470' },
      { name: 'Kalideres', subdistricts: ['Kamal', 'Tegal Alur', 'Pegadungan', 'Kalideres', 'Semanan'], postalCode: '11840' },
      { name: 'Kebon Jeruk', subdistricts: ['Duri Kepa', 'Kedoya Selatan', 'Kedoya Utara', 'Kebon Jeruk', 'Sukabumi Utara', 'Kelapa Dua', 'Sukabumi Selatan'], postalCode: '11530' },
      { name: 'Kembangan', subdistricts: ['Kembangan Utara', 'Kembangan Selatan', 'Meruya Utara', 'Srengseng', 'Joglo', 'Meruya Selatan'], postalCode: '11610' },
      { name: 'Palmerah', subdistricts: ['Slipi', 'Kota Bambu Utara', 'Jati Pulo', 'Palmerah', 'Kemanggisan', 'Kota Bambu Selatan'], postalCode: '11480' },
      { name: 'Taman Sari', subdistricts: ['Pinangsia', 'Glodok', 'Keagungan', 'Krukut', 'Taman Sari', 'Maphar', 'Tangki', 'Mangga Besar'], postalCode: '11150' },
      { name: 'Tambora', subdistricts: ['Tanah Sereal', 'Tambora', 'Roa Malaka', 'Pekojan', 'Jembatan Lima', 'Krendang', 'Duri Utara', 'Duri Selatan', 'Kalianyar', 'Jembatan Besi', 'Angke'], postalCode: '11210' }
    ]
  },
  {
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Pusat',
    districts: [
      { name: 'Cempaka Putih', subdistricts: ['Cempaka Putih Timur', 'Cempaka Putih Barat', 'Rawasari'], postalCode: '10510' },
      { name: 'Gambir', subdistricts: ['Gambir', 'Kebon Kelapa', 'Petojo Selatan', 'Duri Pulo', 'Petojo Utara', 'Cideng'], postalCode: '10130' },
      { name: 'Johar Baru', subdistricts: ['Galur', 'Tanah Tinggi', 'Kampung Rawa', 'Johar Baru'], postalCode: '10560' },
      { name: 'Kemayoran', subdistricts: ['Gunung Sahari Selatan', 'Kemayoran', 'Kebon Kosong', 'Harapan Mulya', 'Cempaka Baru', 'Utan Panjang', 'Sumur Batu', 'Serdang'], postalCode: '10620' },
      { name: 'Menteng', subdistricts: ['Menteng', 'Pegangsaan', 'Cikini', 'Kebon Sirih', 'Gondangdia'], postalCode: '10310' },
      { name: 'Sawah Besar', subdistricts: ['Pasar Baru', 'Gunung Sahari Utara', 'Mangga Dua Selatan', 'Karang Anyar', 'Kartini'], postalCode: '10710' },
      { name: 'Senen', subdistricts: ['Senen', 'Kwitang', 'Kenari', 'Paseban', 'Kramat', 'Bungur'], postalCode: '10410' },
      { name: 'Tanah Abang', subdistricts: ['Bendungan Hilir', 'Karet Tengsin', 'Kebon Melati', 'Kebon Kacang', 'Kampung Bali', 'Petamburan', 'Gelora'], postalCode: '10210' }
    ]
  },
  {
    province: 'DKI Jakarta',
    city: 'Kota Jakarta Utara',
    districts: [
      { name: 'Cilincing', subdistricts: ['Kali Baru', 'Cilincing', 'Semper Barat', 'Semper Timur', 'Sukapura', 'Rorotan', 'Marunda'], postalCode: '14120' },
      { name: 'Kelapa Gading', subdistricts: ['Kelapa Gading Barat', 'Kelapa Gading Timur', 'Pegangsaan Dua'], postalCode: '14240' },
      { name: 'Koja', subdistricts: ['Koja', 'Rawa Badak Utara', 'Rawa Badak Selatan', 'Tugu Utara', 'Tugu Selatan', 'Lagoa'], postalCode: '14220' },
      { name: 'Pademangan', subdistricts: ['Pademangan Timur', 'Pademangan Barat', 'Ancol'], postalCode: '14420' },
      { name: 'Penjaringan', subdistricts: ['Penjaringan', 'Pejagalan', 'Pluit', 'Kapuk Muara', 'Kamal Muara'], postalCode: '14450' },
      { name: 'Tanjung Priok', subdistricts: ['Tanjung Priok', 'Kebon Bawang', 'Sungai Bambu', 'Papanggo', 'Warakas', 'Sunter Agung', 'Sunter Jaya'], postalCode: '14310' }
    ]
  },
  {
    province: 'Jawa Barat',
    city: 'Kota Bekasi',
    districts: [
      { name: 'Bantar Gebang', subdistricts: ['Bantargebang', 'Cikiwul', 'Ciketing Udik', 'Sumur Batu'], postalCode: '17151' },
      { name: 'Bekasi Barat', subdistricts: ['Bintara', 'Bintara Jaya', 'Jakasampurna', 'Kota Baru', 'Kranji'], postalCode: '17135' },
      { name: 'Bekasi Selatan', subdistricts: ['Jakamulya', 'Jakasetia', 'Kayuringin Jaya', 'Marga Jaya', 'Pekayon Jaya'], postalCode: '17148' },
      { name: 'Bekasi Timur', subdistricts: ['Aren Jaya', 'Bekasi Jaya', 'Duren Jaya', 'Margahayu'], postalCode: '17111' },
      { name: 'Bekasi Utara', subdistricts: ['Harapan Baru', 'Harapan Jaya', 'Kaliabang Tengah', 'Marga Mulya', 'Perwira', 'Teluk Pucung'], postalCode: '17121' },
      { name: 'Jatiasih', subdistricts: ['Jatiasih', 'Jatikramat', 'Jatiluhur', 'Jatirasa', 'Jatimekar', 'Jatisari'], postalCode: '17426' },
      { name: 'Jatisampurna', subdistricts: ['Jatisampurna', 'Jatiranggon', 'Jatiraden', 'Jatikarya', 'Jatirangga'], postalCode: '17433' },
      { name: 'Medan Satria', subdistricts: ['Harapan Mulya', 'Kali Baru', 'Medan Satria', 'Pejuang'], postalCode: '17132' },
      { name: 'Mustika Jaya', subdistricts: ['Cimuning', 'Mustikajaya', 'Mustikasari', 'Padurenan'], postalCode: '17158' },
      { name: 'Pondok Gede', subdistricts: ['Jatibening', 'Jatibening Baru', 'Jaticempaka', 'Jatimakmur', 'Jatiwaringin'], postalCode: '17411' },
      { name: 'Pondok Melati', subdistricts: ['Jatimurni', 'Jatirahayu', 'Jatiwarna', 'Jatimelati'], postalCode: '17414' },
      { name: 'Rawalumbu', subdistricts: ['Bojong Menteng', 'Bojong Rawalumbu', 'Pengasinan', 'Sepanjang Jaya'], postalCode: '17116' }
    ]
  },
  {
    province: 'Jawa Barat',
    city: 'Kab. Bekasi',
    districts: [
      { name: 'Babelan', subdistricts: ['Babelan Kota', 'Bahagia', 'Buni Bakti', 'Hurip Jaya', 'Kebalen', 'Kedung Pengawas', 'Kedungjaya'], postalCode: '17610' },
      { name: 'Cibitung', subdistricts: ['Cibuntu', 'Kertamukti', 'Muktiwari', 'Sarimukti', 'Sukajaya', 'Wanajaya', 'Wanasari'], postalCode: '17520' },
      { name: 'Cikarang Barat', subdistricts: ['Danau Indah', 'Gandamekar', 'Gandasari', 'Jatiwangi', 'Kalijaya', 'Mekarwangi', 'Sukadanau', 'Telagamurni', 'Telajung'], postalCode: '17530' },
      { name: 'Cikarang Pusat', subdistricts: ['Cicau', 'Hegarmukti', 'Jayamukti', 'Pasirranji', 'Pasirtanjung', 'Sukamahi'], postalCode: '17530' },
      { name: 'Cikarang Selatan', subdistricts: ['Ciantra', 'Cibatu', 'Pasirsari', 'Sukadami', 'Sukaresmi', 'Serang', 'Sukasejati'], postalCode: '17530' },
      { name: 'Cikarang Timur', subdistricts: ['Cipayung', 'Hegarmanah', 'Jatibaru', 'Jatireja', 'Karangsari', 'Labansari', 'Sertajaya', 'Tanjungbaru'], postalCode: '17530' },
      { name: 'Cikarang Utara', subdistricts: ['Cikarang Kota', 'Harjamekar', 'Karangasih', 'Karangbaru', 'Karangraharja', 'Mekarmukti', 'Pasirgombong', 'Simpangan', 'Tanjungsari', 'Waluya', 'Wangunharja'], postalCode: '17530' },
      { name: 'Setu', subdistricts: ['Burangkeng', 'Cibening', 'Cijengkol', 'Cikarageman', 'Ciledug', 'Kertarahayu', 'Lubangbuaya', 'Muktijaya', 'Ragemukti', 'Taman Rahayu', 'Taman Sari'], postalCode: '17320' },
      { name: 'Tambun Selatan', subdistricts: ['Jatimulya', 'Lambangjaya', 'Lambangsari', 'Mangunjaya', 'Setiadarma', 'Setiamekar', 'Sumberjaya', 'Tambun', 'Tridaya Sakti'], postalCode: '17510' },
      { name: 'Tambun Utara', subdistricts: ['Jejalenjaya', 'Karangsatria', 'Satriajaya', 'Satriamekar', 'Sriamur', 'Srijaya', 'Srimahi', 'Srimukti'], postalCode: '17510' },
      { name: 'Tarumajaya', subdistricts: ['Pahlawan Setia', 'Pantai Makmur', 'Pusaka Rakyat', 'Samudra Jaya', 'Segara Jaya', 'Segaramakmur', 'Setia Asih', 'Setia Mulya'], postalCode: '17210' }
    ]
  },
  {
    province: 'Jawa Barat',
    city: 'Kota Depok',
    districts: [
      { name: 'Beji', subdistricts: ['Beji', 'Beji Timur', 'Kemiri Muka', 'Kukusan', 'Pondok Cina', 'Tanah Baru'], postalCode: '16421' },
      { name: 'Bojongsari', subdistricts: ['Bojongsari', 'Bojongsari Baru', 'Curug', 'Duren Mekar', 'Duren Seribu', 'Pondok Petir', 'Serua'], postalCode: '16516' },
      { name: 'Cilodong', subdistricts: ['Cilodong', 'Jatimulya', 'Kalibaru', 'Kalimulya', 'Sukamaju'], postalCode: '16413' },
      { name: 'Cimanggis', subdistricts: ['Cisalak Pasar', 'Curug', 'Harjamukti', 'Mekarsari', 'Pasir Gunung Selatan', 'Tugu'], postalCode: '16451' },
      { name: 'Cinere', subdistricts: ['Cinere', 'Gandul', 'Pangkalan Jati', 'Pangkalan Jati Baru'], postalCode: '16514' },
      { name: 'Cipayung', subdistricts: ['Bojong Pondok Terong', 'Cipayung', 'Cipayung Jaya', 'Pondok Jaya', 'Ratu Jaya'], postalCode: '16436' },
      { name: 'Limo', subdistricts: ['Grogol', 'Krukut', 'Limo', 'Meruyung'], postalCode: '16515' },
      { name: 'Pancoran Mas', subdistricts: ['Depok', 'Depok Jaya', 'Mampang', 'Pancoran Mas', 'Rangkapan Jaya', 'Rangkapan Jaya Baru'], postalCode: '16436' },
      { name: 'Sawangan', subdistricts: ['Bedahan', 'Cinangka', 'Kedaung', 'Pasir Putih', 'Pengasinan', 'Sawangan', 'Sawangan Baru'], postalCode: '16511' },
      { name: 'Sukmajaya', subdistricts: ['Abadijaya', 'Baktijaya', 'Cisalak', 'Mekar Jaya', 'Sukmajaya', 'Tirtajaya'], postalCode: '16418' },
      { name: 'Tapos', subdistricts: ['Cilangkap', 'Cimpaeun', 'Jatijajar', 'Leuwinanggung', 'Sukamaju Baru', 'Sukatani', 'Tapos'], postalCode: '16457' }
    ]
  },
  {
    province: 'Jawa Barat',
    city: 'Kota Bogor',
    districts: [
      { name: 'Bogor Barat', subdistricts: ['Balungbangjaya', 'Bubulak', 'Cilendek Barat', 'Cilendek Timur', 'Curug', 'Curugmekar', 'Gunungbatu', 'Loji', 'Margajaya', 'Menteng', 'Pasirbatu', 'Pasirjaya', 'Pasirmuda', 'Semplak', 'Sindangbarang', 'Situgede'], postalCode: '16111' },
      { name: 'Bogor Selatan', subdistricts: ['Batutulis', 'Bojongkerta', 'Bondongan', 'Cikaret', 'Cipaku', 'Empang', 'Genteng', 'Harjasari', 'Kertamaya', 'Lawanggintung', 'Muarasari', 'Mulyaharja', 'Pakuan', 'Pamoyanan', 'Rancamaya', 'Ranggamekar'], postalCode: '16132' },
      { name: 'Bogor Tengah', subdistricts: ['Babakan', 'Babakanpasar', 'Cibogor', 'Ciwaringin', 'Gudang', 'Kebonkelapa', 'Pabaton', 'Paledang', 'Panaragan', 'Sempur', 'Tegallega'], postalCode: '16122' },
      { name: 'Bogor Timur', subdistricts: ['Baranangsiang', 'Katulampa', 'Sindangrasa', 'Sindangbarang', 'Sukasari', 'Tajur'], postalCode: '16143' },
      { name: 'Bogor Utara', subdistricts: ['Bantarjati', 'Cibuluh', 'Ciluar', 'Cimahpar', 'Ciparigi', 'Kedunghalang', 'Tanahbaru', 'Tegal Gundil'], postalCode: '16151' },
      { name: 'Tanah Sareal', subdistricts: ['Cibadak', 'Kayumanis', 'Kebonpedes', 'Kedungbadak', 'Kedungjaya', 'Kedungwaringin', 'Kencana', 'Mekarwangi', 'Sukadamai', 'Sukaresmi', 'Tanahsareal'], postalCode: '16161' }
    ]
  },
  {
    province: 'Jawa Barat',
    city: 'Kab. Bogor',
    districts: [
      { name: 'Babakan Madang', subdistricts: ['Babakan Madang', 'Bojong Koneng', 'Cijayanti', 'Cipambuan', 'Citaringgul', 'Kadumangu', 'Karang Tengah', 'Sentul', 'Sumur Batu'], postalCode: '16810' },
      { name: 'Bojonggede', subdistricts: ['Bojong Baru', 'Bojonggede', 'Cimanggis', 'Kedung Waringin', 'Ragajaya', 'Rawa Panjang', 'Susukan', 'Waringin Jaya'], postalCode: '16922' },
      { name: 'Cibinong', subdistricts: ['Cirimekar', 'Ciriung', 'Harapan Jaya', 'Karadenan', 'Nanggewer', 'Nanggewer Mekar', 'Pabuaran', 'Pabuaran Mekar', 'Pakansari', 'Pondok Rajeg', 'Sukahati', 'Tengah'], postalCode: '16911' },
      { name: 'Cileungsi', subdistricts: ['Cileungsi', 'Cileungsi Kidul', 'Cipenjo', 'Cipeucang', 'Dayeuh', 'Gandoang', 'Jatisari', 'Limus Nunggal', 'Mampir', 'Mekarsari', 'Pasir Angin', 'Setu Sari'], postalCode: '16820' },
      { name: 'Citeureup', subdistricts: ['Citeureup', 'Gunungsari', 'Hambalang', 'Karang Asem Barat', 'Karang Asem Timur', 'Leuwinutug', 'Pasir Mukti', 'Puspanegara', 'Puspasari', 'Sanja', 'Sukahati', 'Tajur', 'Tangkil'], postalCode: '16810' },
      { name: 'Gunung Putri', subdistricts: ['Bojong Kulur', 'Bojong Nangka', 'Cikeas Udik', 'Ciangsana', 'Cicadas', 'Gunung Putri', 'Karanggan', 'Nagrak', 'Tlajung Udik', 'Wanaherang'], postalCode: '16961' },
      { name: 'Parung', subdistricts: ['Bojong Indah', 'Bojong Sempu', 'Cogreg', 'Iwul', 'Jabon Mekar', 'Pamagersari', 'Parung', 'Waru', 'Warujaya'], postalCode: '16330' },
      { name: 'Sukaraja', subdistricts: ['Cadas Ngampar', 'Cibanon', 'Cijujung', 'Cikeas', 'Cilebut Barat', 'Cilebut Timur', 'Cimandala', 'Gunung Geulis', 'Nagrak', 'Pasir Jambu', 'Pasirlaja', 'Sukaraja'], postalCode: '16710' }
    ]
  },
  {
    province: 'Banten',
    city: 'Kota Tangerang',
    districts: [
      { name: 'Batuceper', subdistricts: ['Batuceper', 'Batujaya', 'Batusari', 'Kebon Besar', 'Poris Gaga', 'Poris Gaga Baru', 'Poris Jaya'], postalCode: '15122' },
      { name: 'Benda', subdistricts: ['Belendung', 'Benda', 'Jurumudi', 'Jurumudi Baru', 'Pajang'], postalCode: '15125' },
      { name: 'Cibodas', subdistricts: ['Cibodas', 'Cibodasari', 'Cibodas Baru', 'Panunggangan Barat', 'Uwung Jaya'], postalCode: '15138' },
      { name: 'Ciledug', subdistricts: ['Paninggilan', 'Paninggilan Utara', 'Parung Serab', 'Sudimara Barat', 'Sudimara Jaya', 'Sudimara Selatan', 'Sudimara Timur', 'Tajur'], postalCode: '15151' },
      { name: 'Cipondoh', subdistricts: ['Cipondoh', 'Cipondoh Indah', 'Cipondoh Makmur', 'Gondrong', 'Kenanga', 'Ketapang', 'Petir', 'Poris Plawad', 'Poris Plawad Indah', 'Poris Plawad Utara'], postalCode: '15148' },
      { name: 'Jatiuwung', subdistricts: ['Alam Jaya', 'Gandasari', 'Jatake', 'Keroncong', 'Manis Jaya', 'Pasir Jaya'], postalCode: '15134' },
      { name: 'Karangtengah', subdistricts: ['Karang Mulya', 'Karangtengah', 'Karang Timur', 'Parung Jaya', 'Pedurenan', 'Pondok Bahar', 'Pondok Pucung'], postalCode: '15157' },
      { name: 'Karawaci', subdistricts: ['Bojong Jaya', 'Bugel', 'Cimone', 'Cimone Jaya', 'Gerendeng', 'Karawaci', 'Karawaci Baru', 'Koang Jaya', 'Margasari', 'Nambo Jaya', 'Nusa Jaya', 'Pabuaran', 'Pabuaran Tumpeng', 'Pasar Baru', 'Sukajadi', 'Sumur Pacing'], postalCode: '15115' },
      { name: 'Larangan', subdistricts: ['Cipadu', 'Cipadu Jaya', 'Gaga', 'Kreo', 'Kreo Selatan', 'Larangan Indah', 'Larangan Selatan', 'Larangan Utara'], postalCode: '15154' },
      { name: 'Neglasari', subdistricts: ['Karang Anyar', 'Karangsari', 'Kedaung Baru', 'Kedaung Wetan', 'Mekarsari', 'Neglasari', 'Selapajang Jaya'], postalCode: '15129' },
      { name: 'Periuk', subdistricts: ['Gebang Raya', 'Gembor', 'Periuk', 'Periuk Jaya', 'Sangiang Jaya'], postalCode: '15131' },
      { name: 'Pinang', subdistricts: ['Cipete', 'Kunciran', 'Kunciran Indah', 'Kunciran Jaya', 'Nerogtog', 'Pakujan', 'Panunggangan', 'Panunggangan Timur', 'Panunggangan Utara', 'Pinang'], postalCode: '15145' },
      { name: 'Tangerang', subdistricts: ['Babakan', 'Buaran Indah', 'Cikokol', 'Kelapa Indah', 'Sukasari', 'Sukarasa', 'Sukaasih', 'Tanah Tinggi'], postalCode: '15111' }
    ]
  },
  {
    province: 'Banten',
    city: 'Kota Tangerang Selatan',
    districts: [
      { name: 'Ciputat', subdistricts: ['Cipayung', 'Ciputat', 'Jombang', 'Sawah', 'Sawah Baru', 'Serua', 'Serua Indah'], postalCode: '15411' },
      { name: 'Ciputat Timur', subdistricts: ['Cempaka Putih', 'Cireundeu', 'Pisangan', 'Pondok Ranji', 'Rempoa', 'Rengas'], postalCode: '15419' },
      { name: 'Pamulang', subdistricts: ['Bambu Apus', 'Benda Baru', 'Kedaung', 'Pondok Benda', 'Pamulang Barat', 'Pamulang Timur', 'Pondok Cabe Ilir', 'Pondok Cabe Udik'], postalCode: '15417' },
      { name: 'Pondok Aren', subdistricts: ['Jurang Mangu Barat', 'Jurang Mangu Timur', 'Pondok Kacang Barat', 'Pondok Kacang Timur', 'Perigi', 'Perigi Baru', 'Pondok Aren', 'Pondok Betung', 'Pondok Jaya', 'Pondok Karya', 'Pondok Ranji'], postalCode: '15224' },
      { name: 'Serpong', subdistricts: ['Buaran', 'Ciater', 'Cilenggang', 'Lengkong Gudang', 'Lengkong Gudang Timur', 'Lengkong Wetan', 'Rawa Buntu', 'Rawa Mekar Jaya', 'Serpong'], postalCode: '15310' },
      { name: 'Serpong Utara', subdistricts: ['Jelupang', 'Lengkong Karya', 'Pakualam', 'Pakulonan', 'Paku Jaya', 'Pondok Jagung', 'Pondok Jagung Timur'], postalCode: '15326' },
      { name: 'Setu', subdistricts: ['Babakan', 'Bakti Jaya', 'Kademangan', 'Keranggan', 'Muncul', 'Setu'], postalCode: '15314' }
    ]
  },
  {
    province: 'Banten',
    city: 'Kab. Tangerang',
    districts: [
      { name: 'Balaraja', subdistricts: ['Balaraja', 'Cangkudu', 'Gembong', 'Saga', 'Sentul', 'Sukamurni', 'Talagasari', 'Tobat'], postalCode: '15610' },
      { name: 'Cikupa', subdistricts: ['Bunder', 'Cibadak', 'Cikupa', 'Pasir Gadung', 'Pasir Jaya', 'Sukadamai', 'Sukanagara', 'Talaga', 'Talagasari'], postalCode: '15710' },
      { name: 'Cisauk', subdistricts: ['Cibogo', 'Cisauk', 'Dandang', 'Mekar Wangi', 'Sampora', 'Suradita'], postalCode: '15341' },
      { name: 'Curug', subdistricts: ['Cukanggalih', 'Curug Kulon', 'Curug Wetan', 'Kadu', 'Kadu Jaya', 'Sukabakti'], postalCode: '15810' },
      { name: 'Kelapa Dua', subdistricts: ['Bencongan', 'Bencongan Indah', 'Bojong Nangka', 'Curug Sangereng', 'Kelapa Dua', 'Pakulonan Barat'], postalCode: '15810' },
      { name: 'Pagedangan', subdistricts: ['Cicalengka', 'Cihuni', 'Cijantra', 'Jatake', 'Kadu Sirung', 'Karang Tengah', 'Lengkong Kulon', 'Medang', 'Pagedangan', 'Situ Gadung'], postalCode: '15339' },
      { name: 'Pasar Kemis', subdistricts: ['Kuta Baru', 'Kuta Bumi', 'Kuta Jaya', 'Pasar Kemis', 'Sindangsari', 'Sukamantri'], postalCode: '15560' }
    ]
  }
];

// Helper untuk daftar unik kota yang dikelompokkan
export const GROUPED_CITIES = JABODETABEK_REGIONS.reduce((acc, curr) => {
  if (!acc[curr.province]) {
    acc[curr.province] = [];
  }
  acc[curr.province].push(curr.city);
  return acc;
}, {});

// Helper untuk mencari data kota
export const findCityData = (cityName) => {
  return JABODETABEK_REGIONS.find(r => r.city === cityName) || null;
};
