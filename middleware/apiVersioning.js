// API versioning middleware
const apiVersioning = (req, res, next) => {
  // Get version from header, query param, or URL
  let version = req.headers['api-version'] || 
                req.query.version || 
                req.url.match(/^\/api\/v(\d+)/)?.[1];

  // Default to v1 if no version specified
  version = version || '1';

  // Validate version
  const supportedVersions = ['1'];
  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      success: false,
      message: `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`
    });
  }

  req.apiVersion = version;
  res.set('API-Version', version);
  next();
};

// Deprecation warning middleware
const deprecationWarning = (version, message) => {
  return (req, res, next) => {
    if (req.apiVersion === version) {
      res.set('Deprecation', 'true');
      res.set('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()); // 90 days
      res.set('Link', '</api/v2>; rel="successor-version"');
      
      // Log deprecation usage
      const { logger } = require('./logging');
      logger.warn('Deprecated API version used', {
        version,
        endpoint: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        message
      });
    }
    next();
  };
};

module.exports = {
  apiVersioning,
  deprecationWarning
};