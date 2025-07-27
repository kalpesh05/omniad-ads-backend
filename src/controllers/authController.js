const User = require('../models/User');
const database = require('../config/database');
const { generateToken, removePassword, sendResponse, sendError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = database.findUserByEmail(email);
    if (existingUser) {
      return sendError(res, HTTP_STATUS.CONFLICT, 'User with this email already exists');
    }

    // Create new user
    const user = new User({ email, firstName, lastName, role });
    await user.setPassword(password);
    
    const savedUser = database.createUser(user);

    // Generate JWT token
    const token = generateToken({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role
    });

    sendResponse(res, HTTP_STATUS.CREATED, 'User registered successfully', {
      user: removePassword(savedUser),
      token
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = database.findUserByEmail(email);
    if (!user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    // Create User instance to access comparePassword method
    const userInstance = Object.assign(new User({}), user);
    const isPasswordValid = await userInstance.comparePassword(password);
    
    if (!isPasswordValid) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    sendResponse(res, HTTP_STATUS.OK, 'Login successful', {
      user: removePassword(user),
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
};

module.exports = {
  signup,
  login
};
