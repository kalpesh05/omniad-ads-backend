const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

class User {
  constructor(userData) {
    this.email = userData.email;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.role = userData.role || ROLES.USER;
    this.profilePicture = null;
  }

  async setPassword(password) {
    const saltRounds = 12;
    this.password = await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  toJSON() {
    const { password, ...userObject } = this;
    return userObject;
  }

  static isValidRole(role) {
    return Object.values(ROLES).includes(role);
  }
}

module.exports = User;
