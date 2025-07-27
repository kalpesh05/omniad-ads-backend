const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  uploadProfilePicture, 
  getAllUsers, 
  deleteUser 
} = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { profileUpdateValidation, handleValidationErrors } = require('../middleware/validation');
const { upload, handleMulterError } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// User profile routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, profileUpdateValidation, handleValidationErrors, updateProfile);
router.post('/profile-picture', authenticateToken, upload.single('profilePicture'), handleMulterError, uploadProfilePicture);

// Admin routes
router.get('/admin/users', authenticateToken, authorizeRoles(ROLES.ADMIN), getAllUsers);
router.delete('/admin/users/:id', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), deleteUser);

module.exports = router;
