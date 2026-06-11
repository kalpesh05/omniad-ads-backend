const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.role = userData.role || 'user';
    this.is_active = userData.is_active !== undefined ? userData.is_active : true;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Create new user
  static async create(userData) {
    const { username, email, password, role = 'user' } = userData;
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.users.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role
      }
    });

    return new User(user);
  }

  // Find user by ID
  static async findById(id) {
    const user = await prisma.users.findFirst({
      where: {
        id: parseInt(id),
        is_active: true
      }
    });

    return user ? new User(user) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const user = await prisma.users.findFirst({
      where: {
        email,
        is_active: true
      }
    });

    return user ? new User(user) : null;
  }

  // Find user by username
  static async findByUsername(username) {
    const user = await prisma.users.findFirst({
      where: {
        username,
        is_active: true
      }
    });

    return user ? new User(user) : null;
  }

  // Check if email exists
  static async emailExists(email, excludeId = null) {
    const where = {
      email
    };

    if (excludeId) {
      where.id = {
        not: parseInt(excludeId)
      };
    }

    const count = await prisma.users.count({ where });
    return count > 0;
  }

  // Check if username exists
  static async usernameExists(username, excludeId = null) {
    const where = {
      username
    };

    if (excludeId) {
      where.id = {
        not: parseInt(excludeId)
      };
    }

    const count = await prisma.users.count({ where });
    return count > 0;
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['username', 'email', 'role', 'is_active'];
    const data = {};

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        data[key] = updateData[key];
      }
    });

    if (Object.keys(data).length === 0) {
      return this;
    }

    const updatedUser = await prisma.users.update({
      where: {
        id: this.id
      },
      data
    });

    return new User(updatedUser);
  }

  // Get user data without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Get all users (admin only)
  static async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.users.count(),
      prisma.users.findMany({
        orderBy: {
          created_at: 'desc'
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      })
    ]);

    return {
      users: rows.map(row => new User(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Soft delete user
  async delete() {
    await prisma.users.update({
      where: {
        id: this.id
      },
      data: {
        is_active: false
      }
    });
  }
}

module.exports = User;