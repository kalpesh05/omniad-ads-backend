const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateToken } = require('../utils/jwt');
const {
  successResponse,
  errorResponse,
  conflictResponse,
  unauthorizedResponse,
  notFoundResponse
} = require('../utils/response');

class AuthController {
  // User registration
  static async register(req, res) {
    try {
      const { username, email, password, role } = req.body;

      // Check if user already exists
      const existingEmail = await User.emailExists(email);
      if (existingEmail) {
        return conflictResponse(res, 'Email already registered');
      }

      const existingUsername = await User.usernameExists(username);
      if (existingUsername) {
        return conflictResponse(res, 'Username already taken');
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password,
        role: role || 'user'
      });

      // Generate JWT token
      const token = generateToken({ userId: user.id });

      // Create refresh token
      const refreshToken = await RefreshToken.create(user.id);

      successResponse(res, {
        user: user.toJSON(),
        token,
        refreshToken: refreshToken.token
      }, 'User registered successfully', 201);

    } catch (error) {
      console.error('Registration error:', error);
      errorResponse(res, 'Registration failed');
    }
  }

  // User login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return unauthorizedResponse(res, 'Invalid email or password');
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return unauthorizedResponse(res, 'Invalid email or password');
      }

      // Generate JWT token
      const token = generateToken({ userId: user.id });

      // Create refresh token
      const refreshToken = await RefreshToken.create(user.id);

      successResponse(res, {
        user: user.toJSON(),
        token,
        refreshToken: refreshToken.token
      }, 'Login successful');

    } catch (error) {
      console.error('Login error:', error);
      errorResponse(res, 'Login failed');
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return unauthorizedResponse(res, 'Refresh token required');
      }

      // Find refresh token
      const tokenRecord = await RefreshToken.findByToken(refreshToken);
      if (!tokenRecord) {
        return unauthorizedResponse(res, 'Invalid refresh token');
      }

      // Check if token is expired
      if (tokenRecord.isExpired()) {
        await tokenRecord.delete();
        return unauthorizedResponse(res, 'Refresh token expired');
      }

      // Find user
      const user = await User.findById(tokenRecord.user_id);
      if (!user) {
        return unauthorizedResponse(res, 'User not found');
      }

      // Generate new tokens
      const newToken = generateToken({ userId: user.id });
      const newRefreshToken = await RefreshToken.create(user.id);

      successResponse(res, {
        token: newToken,
        refreshToken: newRefreshToken.token
      }, 'Token refreshed successfully');

    } catch (error) {
      console.error('Token refresh error:', error);
      errorResponse(res, 'Token refresh failed');
    }
  }

  // User logout
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      // Delete refresh token if provided
      if (refreshToken) {
        await RefreshToken.deleteByToken(refreshToken);
      }

      // Delete all refresh tokens for the user
      await RefreshToken.deleteByUserId(userId);

      successResponse(res, null, 'Logout successful');

    } catch (error) {
      console.error('Logout error:', error);
      errorResponse(res, 'Logout failed');
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user;

      successResponse(res, {
        user: user.toJSON()
      }, 'Profile retrieved successfully');

    } catch (error) {
      console.error('Get profile error:', error);
      errorResponse(res, 'Failed to retrieve profile');
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username, email } = req.body;

      // Check if email is being updated and already exists
      if (email) {
        const existingEmail = await User.emailExists(email, userId);
        if (existingEmail) {
          return conflictResponse(res, 'Email already registered');
        }
      }

      // Check if username is being updated and already exists
      if (username) {
        const existingUsername = await User.usernameExists(username, userId);
        if (existingUsername) {
          return conflictResponse(res, 'Username already taken');
        }
      }

      // Update user
      const updatedUser = await req.user.update({ username, email });

      successResponse(res, {
        user: updatedUser.toJSON()
      }, 'Profile updated successfully');

    } catch (error) {
      console.error('Update profile error:', error);
      errorResponse(res, 'Failed to update profile');
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Verify current password
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        return unauthorizedResponse(res, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await user.update({ password: hashedPassword });

      // Delete all refresh tokens to force re-login
      await RefreshToken.deleteByUserId(user.id);

      successResponse(res, null, 'Password changed successfully');

    } catch (error) {
      console.error('Change password error:', error);
      errorResponse(res, 'Failed to change password');
    }
  }
}

module.exports = AuthController;