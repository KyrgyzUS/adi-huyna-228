// models/debtorsModel.js
const pool = require('./db');

module.exports = {
  async getAllDebtors() {
    const query = 'SELECT d.*, u.username FROM debtors d JOIN users u ON d.user_id = u.id';
    const result = await pool.query(query);
    return result.rows;
  },

  async createDebtor(userId, amount) {
    const query = `
      INSERT INTO debtors (user_id, total_debt)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [userId, amount];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async updateDebtor(debtorId, amount) {
    const query = `
      UPDATE debtors
      SET total_debt = $1
      WHERE id = $2
      RETURNING *
    `;
    const values = [amount, debtorId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteDebtor(debtorId) {
    const query = 'DELETE FROM debtors WHERE id = $1';
    await pool.query(query, [debtorId]);
  },

  async addDebt(userId, amount) {
    // Проверяем, есть ли уже должник
    const querySelect = 'SELECT * FROM debtors WHERE user_id = $1';
    const resultSelect = await pool.query(querySelect, [userId]);
    if (resultSelect.rows.length > 0) {
      // Обновляем
      const debtor = resultSelect.rows[0];
      const newDebt = parseFloat(debtor.total_debt) + parseFloat(amount);
      await pool.query('UPDATE debtors SET total_debt = $1 WHERE user_id = $2', [newDebt, userId]);
    } else {
      // Создаём
      await pool.query('INSERT INTO debtors (user_id, total_debt) VALUES ($1, $2)', [userId, amount]);
    }
  }
};
