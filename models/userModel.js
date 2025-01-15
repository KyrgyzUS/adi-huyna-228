// models/userModel.js
const pool = require('./db');

module.exports = {
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const values = [username];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async createUser(username, passwordHash, role) {
    const query = `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3) RETURNING *
    `;
    const values = [username, passwordHash, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // другие методы...
};
