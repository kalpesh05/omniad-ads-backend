const database = require('../config/database');
const { removePassword, sendResponse, sendError } = require('../utils/helpers');
const { HTTP_STATUS, ROLES } = require('../utils/constants');
const fs = require('fs');
const path = require('path');

const getProfile = (req, res) => {
  try {
    const user = database.findUserById(req.user.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    sendResponse(res, HTTP_STATUS.OK, 'Profile retrieved successfully', removePassword(user));
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

const updateProfile = (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    const updatedUser = database.updateUser(req.user.id, updateData);
    if (!updatedUser) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    sendResponse(res, HTTP_STATUS.OK, 'Profile updated successfully', removePassword(updatedUser));
  } catch (error) {
    console.error('❌ Profile update error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

const uploadProfilePicture = (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No profile picture uploaded');
    }

    const user = database.findUserById(req.user.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPath = path.join(process.cwd(), user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update user profile picture
    const updatedUser = database.updateUser(req.user.id, {
      profilePicture: req.file.path
    });

    sendResponse(res, HTTP_STATUS.OK, 'Profile picture uploaded successfully', {
      profilePicture: req.file.path,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Profile picture upload failed');
  }
};

// Admin routes
const getAllUsers = (req, res) => {
  try {
    const allUsers = database.getAllUsers().map(user => removePassword(user));
    sendResponse(res, HTTP_STATUS.OK, 'Users retrieved successfully', allUsers);
  } catch (error) {
    console.error('❌ Admin users fetch error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

const deleteUser = (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Cannot delete your own account');
    }

    const user = database.findUserById(userId);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Delete profile picture if exists
    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      fs.unlinkSync(user.profilePicture);
    }

    database.deleteUser(userId);
    sendResponse(res, HTTP_STATUS.OK, 'User deleted successfully');

  } catch (error) {
    console.error('❌ User deletion error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  getAllUsers,
  deleteUser
};