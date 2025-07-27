const { sendResponse, sendError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No file uploaded');
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    sendResponse(res, HTTP_STATUS.OK, 'File uploaded successfully', fileInfo);

  } catch (error) {
    console.error('❌ File upload error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'File upload failed');
  }
};

module.exports = {
  uploadFile
};