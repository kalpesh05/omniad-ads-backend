const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE || '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Generate token pair (access token and refresh token)
const generateTokenPair = (userId) => {
  const payload = { userId };
  
  const accessToken = generateToken(payload, '15m'); // Short-lived access token
  const refreshToken = generateToken(payload, '7d');  // Longer-lived refresh token
  
  return {
    accessToken,
    refreshToken
  };
};

// Extract token from request header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

module.exports = {
  generateToken,
  verifyToken,
  generateTokenPair,
  extractTokenFromHeader
};