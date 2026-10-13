const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { E } = require('../errors');

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = config.uploadDir;

/** Deteksi tipe berkas dari magic bytes — tidak mempercayai MIME/ekstensi dari klien. */
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
});

/** Middleware: terima field "foto", validasi, simpan ke disk dengan nama acak. Mengisi req.savedFile. */
function receivePhoto(req, res, next) {
  uploader.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(E.validation('Ukuran foto maksimal 5 MB.', { foto: 'Ukuran foto maksimal 5 MB.' }));
      return next(E.validation('Unggahan tidak valid.', { foto: 'Unggahan tidak valid.' }));
    }
    if (!req.file) return next(E.validation('Pilih foto terlebih dahulu.', { foto: 'Foto wajib diisi.' }));
    const kind = sniff(req.file.buffer);
    if (!kind) return next(E.validation('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.', { foto: 'Format tidak didukung.' }));
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const storedName = `${crypto.randomBytes(16).toString('hex')}.${kind.ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), req.file.buffer, { mode: 0o640 });
      req.savedFile = { storedName, mime: kind.mime, size: req.file.size };
      return next();
    } catch {
      return next(E.unavailable('Foto gagal disimpan. Coba lagi.'));
    }
  });
}

const FILE_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const filePath = (name) => (FILE_NAME_RE.test(name) ? path.join(UPLOAD_DIR, name) : null);

module.exports = { receivePhoto, filePath, sniff, MAX_BYTES, UPLOAD_DIR };
