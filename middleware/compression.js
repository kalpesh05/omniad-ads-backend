const compression = require('compression');

// Smart compression middleware
const smartCompression = compression({
  // Only compress responses that are larger than 1kb
  threshold: 1024,
  
  // Compression level (1-9, 6 is default)
  level: 6,
  
  // Only compress these MIME types
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (!req.headers['accept-encoding']) {
      return false;
    }

    // Don't compress images, videos, or already compressed files
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.split(';')[0];
      const skipTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-rar-compressed'
      ];
      
      if (skipTypes.some(skipType => type.startsWith(skipType))) {
        return false;
      }
    }

    // Use default compression filter for other types
    return compression.filter(req, res);
  }
});

module.exports = smartCompression;