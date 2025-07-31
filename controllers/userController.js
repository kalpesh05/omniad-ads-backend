const User = require('../models/User');
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  conflictResponse
} = require('../utils/response');

class UserController {
  // Get all users (Admin only)
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await User.findAll(page, limit);

      successResponse(res, result, 'Users retrieved successfully');

    } catch (error) {
      console.error('Get all users error:', error);
      errorResponse(res, 'Failed to retrieve users');
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return notFoundResponse(res, 'User');
      }

      successResponse(res, {
        user: user.toJSON()
      }, 'User retrieved successfully');

    } catch (error) {
      console.error('Get user by ID error:', error);
      errorResponse(res, 'Failed to retrieve user');
    }
  }

  // Update user (Admin/Moderator)
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, role, is_active } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return notFoundResponse(res, 'User');
      }

      // Check role permissions
      const currentUser = req.user;
      
      // Only admins can change roles and active status
      if ((role !== undefined || is_active !== undefined) && currentUser.role !== 'admin') {
        return errorResponse(res, 'Only admins can change user roles and status', 403);
      }

      // Prevent users from changing their own role or status unless they are admin
      if (currentUser.id === parseInt(id) && currentUser.role !== 'admin') {
        if (role !== undefined || is_active !== undefined) {
          return errorResponse(res, 'Cannot change your own role or status', 403);
        }
      }

      // Check if email is being updated and already exists
      if (email && email !== user.email) {
        const existingEmail = await User.emailExists(email, id);
        if (existingEmail) {
          return conflictResponse(res, 'Email already registered');
        }
      }

      // Check if username is being updated and already exists
      if (username && username !== user.username) {
        const existingUsername = await User.usernameExists(username, id);
        if (existingUsername) {
          return conflictResponse(res, 'Username already taken');
        }
      }

      // Update user
      const updateData = { username, email, role, is_active };
      const updatedUser = await user.update(updateData);

      successResponse(res, {
        user: updatedUser.toJSON()
      }, 'User updated successfully');

    } catch (error) {
      console.error('Update user error:', error);
      errorResponse(res, 'Failed to update user');
    }
  }

  // Delete user (Admin only)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Prevent users from deleting themselves
      if (currentUser.id === parseInt(id)) {
        return errorResponse(res, 'Cannot delete your own account', 403);
      }

      const user = await User.findById(id);
      if (!user) {
        return notFoundResponse(res, 'User');
      }

      // Soft delete the user
      await user.delete();

      successResponse(res, null, 'User deleted successfully');

    } catch (error) {
      console.error('Delete user error:', error);
      errorResponse(res, 'Failed to delete user');
    }
  }

  // Get user statistics (Admin/Moderator)
  static async getUserStats(req, res) {
    try {
      // This would typically involve more complex queries
      // For now, we'll return basic user count by role
      const allUsers = await User.findAll(1, 1000); // Get all users

      const stats = {
        total: allUsers.users.length,
        active: allUsers.users.filter(user => user.is_active).length,
        inactive: allUsers.users.filter(user => !user.is_active).length,
        byRole: {
          admin: allUsers.users.filter(user => user.role === 'admin').length,
          moderator: allUsers.users.filter(user => user.role === 'moderator').length,
          user: allUsers.users.filter(user => user.role === 'user').length
        }
      };

      successResponse(res, stats, 'User statistics retrieved successfully');

    } catch (error) {
      console.error('Get user stats error:', error);
      errorResponse(res, 'Failed to retrieve user statistics');
    }
  }
}

module.exports = UserController;