const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { FILE_UPLOAD } = require('../utils/constants');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), FILE_UPLOAD.UPLOAD_PATH);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FILE_UPLOAD.UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const extname = FILE_UPLOAD.ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
  const mimetype = FILE_UPLOAD.ALLOWED_TYPES.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, DOC, DOCX files are allowed.'));
  }
};

const uploadConfig = {
  storage: storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE
  },
  fileFilter: fileFilter
};

const upload = multer(uploadConfig);

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
};

module.exports = {
  upload,
  handleMulterError
};
