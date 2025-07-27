const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: /jpeg|jpg|png|gif|pdf|doc|docx/,
  UPLOAD_PATH: 'uploads/'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = {
  ROLES,
  FILE_UPLOAD,
  HTTP_STATUS
};