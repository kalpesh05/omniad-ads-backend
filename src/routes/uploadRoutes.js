const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

router.post('/upload', authenticateToken, upload.single('file'), handleMulterError, uploadFile);

module.exports = router;
