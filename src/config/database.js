class Database {
  constructor() {
    this.users = [];
    this.userIdCounter = 1;
  }

  // User operations
  createUser(userData) {
    const user = {
      id: this.userIdCounter++,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  findUserById(id) {
    return this.users.find(user => user.id === id);
  }

  updateUser(id, updateData) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    return this.users[userIndex];
  }

  deleteUser(id) {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    return this.users.splice(userIndex, 1)[0];
  }

  getAllUsers() {
    return this.users;
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
