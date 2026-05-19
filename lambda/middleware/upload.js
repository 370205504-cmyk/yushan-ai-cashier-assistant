const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(__dirname, '../uploads');

const FILE_SIGNATURES = {
  'jpeg': {
    signatures: [
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE0] },
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE1] },
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE8] }
    ],
    mime: 'image/jpeg'
  },
  'jpg': {
    signatures: [
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE0] },
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE1] },
      { offset: 0, bytes: [0xFF, 0xD8, 0xFF, 0xE8] }
    ],
    mime: 'image/jpeg'
  },
  'png': {
    signatures: [
      { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
    ],
    mime: 'image/png'
  },
  'gif': {
    signatures: [
      { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
      { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }
    ],
    mime: 'image/gif'
  },
  'webp': {
    signatures: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }
    ],
    mime: 'image/webp'
  }
};

function verifyFileSignature(filePath, expectedExtension) {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    const ext = expectedExtension.toLowerCase().replace('.', '');
    const signatureInfo = FILE_SIGNATURES[ext];

    if (!signatureInfo) {
      return false;
    }

    for (const sig of signatureInfo.signatures) {
      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buffer[sig.offset + i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (ext === 'webp') {
          if (buffer[8] !== 0x57 || buffer[9] !== 0x45 || buffer[10] !== 0x42 || buffer[11] !== 0x50) {
            continue;
          }
        }
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

const sanitizeFilename = (filename) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.substring(0, 100);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    const baseName = sanitizeFilename(path.basename(file.originalname, ext));
    const filename = `${Date.now()}_${randomString}_${baseName}${safeExt}`;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      const safeFilename = `${Date.now()}_${randomString}.jpg`;
      cb(null, safeFilename);
    } else {
      cb(null, filename);
    }
  }
});

const fileFilter = function (req, file, cb) {
  const mimeType = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(new Error('只允许上传图片文件'));
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('不支持的文件格式'));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5
  }
});

const validateUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({ success: false, message: '请选择要上传的文件' });
  }
  next();
};

const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('image');

  uploadSingle(req, res, async (err) => {
    if (err) {
      if (!err.message?.includes('只允许上传') && !err.message?.includes('不支持的')) {
        return next(err);
      }
    }

    if (req.file) {
      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (!verifyFileSignature(filePath, ext)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {}
        return res.status(400).json({ success: false, message: '文件内容验证失败，请上传真实的图片文件' });
      }

      req.filePath = `/uploads/${req.file.filename}`;
    }
    next();
  });
};

const uploadSingle = (fieldName) => [
  upload.single(fieldName),
  validateUpload
];

const uploadMultiple = (fieldName, count = 5) => [
  upload.array(fieldName, count),
  validateUpload
];

const uploadFields = (fields) => [
  upload.fields(fields),
  validateUpload
];

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateUpload,
  handleUpload,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  verifyFileSignature,
  FILE_SIGNATURES
};
