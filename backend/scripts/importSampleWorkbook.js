const path = require('path');
const readExcelFile = require('read-excel-file/node');
const { pool } = require('../src/db/pool');

const DEFAULT_FILE = path.resolve(__dirname, '../../../Dummy Data Pelanggan & Service.xlsx');
const REQUIRED_SHEETS = ['Pelanggan', 'Layanan', 'Item', 'Transaksi', 'Pemakaian'];
const ALLOWED_STATUSES = new Set(['scheduled', 'on process', 'done']);
const SERVICE_CATEGORY = {
  Cuci: 'cuci',
  Maintenance: 'lainnya',
  Freon: 'perbaikan',
  Paket: 'lainnya',
  Instalasi: 'instalasi',
  Perbaikan: 'perbaikan',
  Diagnosa: 'lainnya',
};
const SERVICE_DURATION = {
  S01: 60,
  S02: 120,
  S03: 90,
  S04: 60,
  S05: 120,
  S06: 120,
  S07: 120,
  S08: 120,
  S09: 60,
  S10: 60,
};

function toRecords(rows, name) {
  if (!rows?.length) throw new Error(`Sheet wajib kosong atau tidak ditemukan: ${name}`);
  const names = rows[0].map(value => String(value || '').trim());
  return rows.slice(1)
    .filter(row => row.some(value => value !== null && value !== undefined && value !== ''))
    .map(row => Object.fromEntries(names.map((header, index) => [header, row[index]])));
}

function text(value) {
  return String(value ?? '').trim();
}

function number(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} harus berupa angka.`);
  return parsed;
}

function dateOnly(value, label) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new Error(`${label} bukan tanggal yang valid.`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizePhone(value) {
  return text(value).replace(/\D/g, '');
}

function slug(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function assertUnique(rows, field, label, normalize = text) {
  const seen = new Set();
  for (const row of rows) {
    const key = normalize(row[field]);
    if (!key) throw new Error(`${label} kosong pada kolom ${field}.`);
    if (seen.has(key)) throw new Error(`${label} duplikat: ${key}`);
    seen.add(key);
  }
}

function validateDataset(data) {
  const { customers, services, items, transactions, usage } = data;
  assertUnique(customers, 'ID_Pelanggan', 'ID pelanggan');
  assertUnique(customers, 'No_HP', 'Nomor telepon', normalizePhone);
  assertUnique(services, 'ID_Layanan', 'ID layanan');
  assertUnique(items, 'ID_Item', 'ID item');
  assertUnique(transactions, 'ID_Transaksi', 'ID transaksi');
  assertUnique(usage, 'ID_Pemakaian', 'ID pemakaian');

  const customerMap = new Map(customers.map(row => [text(row.ID_Pelanggan), row]));
  const serviceMap = new Map(services.map(row => [text(row.ID_Layanan), row]));
  const itemMap = new Map(items.map(row => [text(row.ID_Item), row]));
  const transactionMap = new Map(transactions.map(row => [text(row.ID_Transaksi), row]));

  for (const row of customers) {
    if (!text(row.Nama) || !normalizePhone(row.No_HP) || !text(row.Alamat)) {
      throw new Error(`Pelanggan ${text(row.ID_Pelanggan)} memiliki data wajib yang kosong.`);
    }
    dateOnly(row.Tanggal_Daftar, `Tanggal daftar ${text(row.ID_Pelanggan)}`);
  }

  for (const row of services) {
    if (!SERVICE_CATEGORY[text(row.Kategori)]) throw new Error(`Kategori layanan tidak dikenal: ${text(row.Kategori)}`);
    if (number(row.Harga_Satuan, `Harga ${text(row.ID_Layanan)}`) < 0) throw new Error(`Harga layanan negatif: ${text(row.ID_Layanan)}`);
  }

  for (const row of transactions) {
    const id = text(row.ID_Transaksi);
    const customer = customerMap.get(text(row.ID_Pelanggan));
    const service = serviceMap.get(text(row.ID_Layanan));
    if (!customer) throw new Error(`${id} mengacu ke pelanggan yang tidak ada.`);
    if (!service) throw new Error(`${id} mengacu ke layanan yang tidak ada.`);
    if (!ALLOWED_STATUSES.has(text(row.Status))) throw new Error(`${id} memiliki status tidak dikenal: ${text(row.Status)}`);
    if (text(row.Nama_Pelanggan) !== text(customer.Nama)) throw new Error(`${id} memiliki nama pelanggan yang tidak konsisten.`);
    if (text(row.Nama_Layanan) !== text(service.Nama_Layanan)) throw new Error(`${id} memiliki nama layanan yang tidak konsisten.`);
    const quantity = number(row.Qty_Unit, `Qty ${id}`);
    const price = number(row.Harga_Satuan, `Harga ${id}`);
    const total = number(row.Total, `Total ${id}`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error(`Qty ${id} di luar batas aplikasi.`);
    if (price !== number(service.Harga_Satuan, `Harga master ${id}`) || total !== quantity * price) {
      throw new Error(`Harga atau total ${id} tidak konsisten.`);
    }
    dateOnly(row.Tanggal, `Tanggal ${id}`);
  }

  for (const row of usage) {
    const id = text(row.ID_Pemakaian);
    const transaction = transactionMap.get(text(row.ID_Transaksi));
    const item = itemMap.get(text(row.ID_Item));
    if (!transaction) throw new Error(`${id} mengacu ke transaksi yang tidak ada.`);
    if (!item) throw new Error(`${id} mengacu ke item yang tidak ada.`);
    if (text(row.Nama_Item) !== text(item.Nama_Item) || text(row.Satuan) !== text(item.Satuan)) {
      throw new Error(`${id} memiliki master item yang tidak konsisten.`);
    }
    const quantity = number(row.Qty, `Qty ${id}`);
    const price = number(row.Harga_Satuan, `Harga ${id}`);
    const subtotal = number(row.Subtotal, `Subtotal ${id}`);
    if (quantity <= 0 || price !== number(item.Harga_Satuan, `Harga master ${id}`) || Math.abs(subtotal - quantity * price) > 0.001) {
      throw new Error(`Qty, harga, atau subtotal ${id} tidak konsisten.`);
    }
    if (dateOnly(row.Tanggal, `Tanggal ${id}`) !== dateOnly(transaction.Tanggal, `Tanggal transaksi ${id}`)) {
      throw new Error(`Tanggal ${id} tidak sama dengan tanggal transaksinya.`);
    }
  }
}

async function bulkInsert(client, prefix, rows, suffix = '', chunkSize = 200) {
  if (!rows.length) return;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const params = [];
    let index = 1;
    const values = chunk.map(row => {
      const placeholders = row.map(value => {
        params.push(value);
        return `$${index++}`;
      });
      return `(${placeholders.join(',')})`;
    });
    await client.query(`${prefix} VALUES ${values.join(',')} ${suffix}`, params);
  }
}

async function selectMap(client, table, keyColumn, valueColumn, keys) {
  const result = new Map();
  for (let offset = 0; offset < keys.length; offset += 500) {
    const chunk = keys.slice(offset, offset + 500);
    const rows = (await client.query(`SELECT ${keyColumn}, ${valueColumn} FROM ${table} WHERE ${keyColumn} IN ($1)`, [chunk])).rows;
    for (const row of rows) result.set(String(row[keyColumn]), row[valueColumn]);
  }
  return result;
}

function address(customer) {
  const street = text(customer.Alamat);
  const city = text(customer.Kota);
  return city && !street.toLowerCase().includes(city.toLowerCase()) ? `${street}, ${city}` : street;
}

function addMinutes(date, minutes) {
  const [year, month, day] = date.split('-').map(Number);
  const total = 8 * 60 + minutes;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

async function importWorkbook(filePath) {
  const sheets = await readExcelFile(filePath);
  const sheetByName = new Map(sheets.map(sheet => [sheet.sheet, sheet.data]));
  for (const name of REQUIRED_SHEETS) if (!sheetByName.has(name)) throw new Error(`Sheet wajib tidak ditemukan: ${name}`);

  const data = {
    customers: toRecords(sheetByName.get('Pelanggan'), 'Pelanggan'),
    services: toRecords(sheetByName.get('Layanan'), 'Layanan'),
    items: toRecords(sheetByName.get('Item'), 'Item'),
    transactions: toRecords(sheetByName.get('Transaksi'), 'Transaksi'),
    usage: toRecords(sheetByName.get('Pemakaian'), 'Pemakaian'),
  };
  validateDataset(data);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await bulkInsert(client,
      `INSERT INTO service_catalog (kode,nama_layanan,kategori,deskripsi,harga,durasi_menit,aktif,is_synthetic,bahan_dibutuhkan)`,
      data.services.map(row => [
        text(row.ID_Layanan), text(row.Nama_Layanan), SERVICE_CATEGORY[text(row.Kategori)], text(row.Keterangan),
        number(row.Harga_Satuan, `Harga ${text(row.ID_Layanan)}`), SERVICE_DURATION[text(row.ID_Layanan)] || 60,
        true, true, JSON.stringify(text(row.Item_Consumable) === '-' ? [] : text(row.Item_Consumable).split(',').map(item => item.trim())),
      ]),
      `ON DUPLICATE KEY UPDATE nama_layanan=VALUES(nama_layanan),kategori=VALUES(kategori),deskripsi=VALUES(deskripsi),harga=VALUES(harga),durasi_menit=VALUES(durasi_menit),aktif=true,is_synthetic=true,bahan_dibutuhkan=VALUES(bahan_dibutuhkan)`);

    await bulkInsert(client,
      `INSERT INTO inventory (nama,kategori,stok,satuan,min_stok,aktif,is_synthetic)`,
      data.items.map(row => [
        text(row.Nama_Item), text(row.ID_Item) === 'I03' ? 'freon' : 'komponen',
        number(row.Stok_Awal, `Stok ${text(row.ID_Item)}`), text(row.Satuan), 0, true, true,
      ]),
      `ON DUPLICATE KEY UPDATE kategori=VALUES(kategori),stok=VALUES(stok),satuan=VALUES(satuan),aktif=true,is_synthetic=true`);

    const technicianNames = [...new Set(data.transactions.map(row => text(row.Teknisi)))];
    for (const name of technicianNames) {
      const contact = `sample-tech-${slug(name)}`;
      const existing = (await client.query('SELECT id FROM technicians WHERE kontak=$1 LIMIT 1', [contact])).rows[0];
      if (existing) {
        await client.query('UPDATE technicians SET nama=$1,aktif=true,is_synthetic=true,catatan=$2 WHERE id=$3', [name, 'Teknisi dari dataset awal Excel.', existing.id]);
      } else {
        await client.query('INSERT INTO technicians (nama,kontak,aktif,is_synthetic,catatan) VALUES ($1,$2,true,true,$3)', [name, contact, 'Teknisi dari dataset awal Excel.']);
      }
    }

    const contacts = data.customers.map(row => normalizePhone(row.No_HP));
    const existingCustomers = [];
    for (let offset = 0; offset < contacts.length; offset += 500) {
      existingCustomers.push(...(await client.query('SELECT kontak,nama,is_synthetic FROM customers WHERE kontak IN ($1)', [contacts.slice(offset, offset + 500)])).rows);
    }
    const sourceByContact = new Map(data.customers.map(row => [normalizePhone(row.No_HP), row]));
    for (const existing of existingCustomers) {
      const source = sourceByContact.get(existing.kontak);
      if (!existing.is_synthetic && text(existing.nama) !== text(source.Nama)) {
        throw new Error(`Nomor ${existing.kontak} sudah dipakai pelanggan non-sample ${existing.nama}.`);
      }
    }

    await bulkInsert(client,
      `INSERT INTO customers (nama,kontak,alamat,catatan_umum,aktif,is_synthetic,created_at)`,
      data.customers.map(row => [
        text(row.Nama), normalizePhone(row.No_HP), address(row),
        `[sample:${text(row.ID_Pelanggan)}] Sumber: ${text(row.Sumber) || '-'}`,
        true, true, `${dateOnly(row.Tanggal_Daftar, `Tanggal ${text(row.ID_Pelanggan)}`)} 00:00:00`,
      ]),
      `ON DUPLICATE KEY UPDATE nama=VALUES(nama),alamat=VALUES(alamat),catatan_umum=VALUES(catatan_umum),aktif=true,is_synthetic=true,created_at=VALUES(created_at)`);

    const customerIdByContact = await selectMap(client, 'customers', 'kontak', 'id', contacts);
    const serviceIdByCode = await selectMap(client, 'service_catalog', 'kode', 'id', data.services.map(row => text(row.ID_Layanan)));
    const inventoryIdByName = await selectMap(client, 'inventory', 'nama', 'id', data.items.map(row => text(row.Nama_Item)));
    const technicianRows = (await client.query('SELECT id,nama FROM technicians WHERE kontak LIKE $1', ['sample-tech-%'])).rows;
    const technicianIdByName = new Map(technicianRows.map(row => [row.nama, row.id]));
    const customerBySourceId = new Map(data.customers.map(row => [text(row.ID_Pelanggan), row]));
    const serviceBySourceId = new Map(data.services.map(row => [text(row.ID_Layanan), row]));

    const nextMinuteByTechnicianAndDate = new Map();
    const preparedTransactions = data.transactions.map(row => {
      const sourceId = text(row.ID_Transaksi);
      const date = dateOnly(row.Tanggal, `Tanggal ${sourceId}`);
      const serviceCode = text(row.ID_Layanan);
      const duration = SERVICE_DURATION[serviceCode] || 60;
      const scheduleKey = `${date}:${text(row.Teknisi)}`;
      const startMinute = nextMinuteByTechnicianAndDate.get(scheduleKey) || 0;
      // The workbook only stores dates. Assign deterministic hourly slots so
      // imported visits remain inside the local operating day.
      nextMinuteByTechnicianAndDate.set(scheduleKey, startMinute + 60);
      const start = addMinutes(date, startMinute);
      const end = addMinutes(date, startMinute + duration);
      const status = text(row.Status);
      const customer = customerBySourceId.get(text(row.ID_Pelanggan));
      const service = serviceBySourceId.get(serviceCode);
      return {
        source: row,
        start,
        end,
        status,
        customer,
        service,
        customerId: customerIdByContact.get(normalizePhone(customer.No_HP)),
        serviceId: serviceIdByCode.get(serviceCode),
        technicianId: technicianIdByName.get(text(row.Teknisi)),
        quantity: number(row.Qty_Unit, `Qty ${sourceId}`),
        price: number(row.Harga_Satuan, `Harga ${sourceId}`),
        total: number(row.Total, `Total ${sourceId}`),
      };
    });

    await bulkInsert(client,
      `INSERT INTO bookings (kode_booking,customer_id,layanan_id,jadwal_mulai,jadwal_selesai,alamat,keluhan,kontak,status,teknisi_id,created_by,is_synthetic,created_at,updated_at,mulai_aktual,selesai_aktual,jumlah_unit,status_pembayaran,skema_pembayaran,metode_pembayaran,status_verifikasi_pembayaran,total_dibayar)`,
      preparedTransactions.map(item => {
        const done = item.status === 'done';
        const inProgress = item.status === 'on process';
        return [
          text(item.source.ID_Transaksi), item.customerId, item.serviceId, item.start, item.end,
          address(item.customer), text(item.service.Keterangan), normalizePhone(item.customer.No_HP), item.status,
          item.technicianId, 'sample_import', true, item.start, item.start,
          done || inProgress ? item.start : null, done ? item.end : null, item.quantity,
          done ? 'paid' : 'pending', 'pay_after_service', 'tunai', done ? 'diverifikasi' : 'belum_ada_bukti', done ? item.total : 0,
        ];
      }),
      `ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id),layanan_id=VALUES(layanan_id),jadwal_mulai=VALUES(jadwal_mulai),jadwal_selesai=VALUES(jadwal_selesai),alamat=VALUES(alamat),keluhan=VALUES(keluhan),kontak=VALUES(kontak),status=VALUES(status),teknisi_id=VALUES(teknisi_id),created_by=VALUES(created_by),is_synthetic=true,created_at=VALUES(created_at),updated_at=VALUES(updated_at),mulai_aktual=VALUES(mulai_aktual),selesai_aktual=VALUES(selesai_aktual),jumlah_unit=VALUES(jumlah_unit),status_pembayaran=VALUES(status_pembayaran),skema_pembayaran=VALUES(skema_pembayaran),metode_pembayaran=VALUES(metode_pembayaran),status_verifikasi_pembayaran=VALUES(status_verifikasi_pembayaran),total_dibayar=VALUES(total_dibayar)`,
      100);

    const bookingCodes = preparedTransactions.map(item => text(item.source.ID_Transaksi));
    const bookingIdByCode = await selectMap(client, 'bookings', 'kode_booking', 'id', bookingCodes);
    for (let offset = 0; offset < bookingCodes.length; offset += 500) {
      const ids = bookingCodes.slice(offset, offset + 500).map(code => bookingIdByCode.get(code));
      await client.query('DELETE FROM booking_items WHERE booking_id IN ($1)', [ids]);
      await client.query('DELETE FROM inventory_usage WHERE booking_id IN ($1)', [ids]);
      await client.query("DELETE FROM status_log WHERE booking_id IN ($1) AND diubah_oleh='sample_import'", [ids]);
    }

    await bulkInsert(client,
      `INSERT INTO booking_items (booking_id,layanan_id,jumlah_unit,harga_satuan,subtotal,catatan,created_at)`,
      preparedTransactions.map(item => [
        bookingIdByCode.get(text(item.source.ID_Transaksi)), item.serviceId, item.quantity, item.price, item.total,
        `[sample:${text(item.source.ID_Transaksi)}]`, item.start,
      ]), '', 300);

    await bulkInsert(client,
      `INSERT INTO status_log (booking_id,status_lama,status_baru,diubah_oleh,catatan,waktu)`,
      preparedTransactions.map(item => [
        bookingIdByCode.get(text(item.source.ID_Transaksi)), null, item.status, 'sample_import',
        `Status awal dari dataset ${text(item.source.ID_Transaksi)}.`, item.start,
      ]), '', 300);

    const transactionByCode = new Map(preparedTransactions.map(item => [text(item.source.ID_Transaksi), item]));
    const itemBySourceId = new Map(data.items.map(row => [text(row.ID_Item), row]));
    await bulkInsert(client,
      `INSERT INTO inventory_usage (booking_id,item_id,jumlah,teknisi_id,catatan,waktu)`,
      data.usage.map(row => {
        const transaction = transactionByCode.get(text(row.ID_Transaksi));
        const item = itemBySourceId.get(text(row.ID_Item));
        return [
          bookingIdByCode.get(text(row.ID_Transaksi)), inventoryIdByName.get(text(item.Nama_Item)),
          number(row.Qty, `Qty ${text(row.ID_Pemakaian)}`), transaction.technicianId,
          `[sample:${text(row.ID_Pemakaian)}] Harga sumber Rp${number(row.Harga_Satuan, `Harga ${text(row.ID_Pemakaian)}`)}; subtotal Rp${number(row.Subtotal, `Subtotal ${text(row.ID_Pemakaian)}`)}.`,
          transaction.start,
        ];
      }), '', 300);

    await client.query(
      `INSERT INTO audit_logs (actor,role,action,entity,metadata) VALUES ($1,$2,$3,$4,$5)`,
      ['sample_import', 'system', 'import_sample_workbook', 'dataset', JSON.stringify({
        file: path.basename(filePath),
        customers: data.customers.length,
        services: data.services.length,
        items: data.items.length,
        transactions: data.transactions.length,
        usage: data.usage.length,
      })],
    );

    await client.query('COMMIT');
    return {
      customers: data.customers.length,
      services: data.services.length,
      inventoryItems: data.items.length,
      technicians: technicianNames.length,
      bookings: data.transactions.length,
      bookingItems: data.transactions.length,
      inventoryUsage: data.usage.length,
      sourceRevenue: data.transactions.reduce((sum, row) => sum + number(row.Total, 'Total'), 0),
      sourceUsageCost: data.usage.reduce((sum, row) => sum + number(row.Subtotal, 'Subtotal'), 0),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const filePath = path.resolve(process.argv[2] || DEFAULT_FILE);
  console.log(`Memvalidasi dan mengimpor ${filePath}`);
  const result = await importWorkbook(filePath);
  console.log('Impor dataset awal selesai:', result);
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('Impor dataset gagal:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { importWorkbook, validateDataset };
