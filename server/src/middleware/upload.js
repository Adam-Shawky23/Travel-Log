const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('./errorHandler');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    // Derive the extension from the validated mimetype, not the user-controlled
    // originalname, so a spoofed filename (e.g. "payload.html") can't result in
    // a file being written and served with an attacker-chosen extension.
    const ext = MIME_EXTENSIONS[file.mimetype] || '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new AppError('Only jpeg, png, and webp images are allowed', 400));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { upload };
