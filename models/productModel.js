// models/productModel.js
const pool = require('./db');

module.exports = {
  async getAllProducts() {
    const query = 'SELECT * FROM products ORDER BY id DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(productId) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const values = [productId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findByArticleAndColor(article, color) {
    const query = `
      SELECT * FROM products WHERE article = $1 AND color = $2 LIMIT 1
    `;
    const values = [article, color];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async createProduct(article, name, price, color, quantity) {
    const query = `
      INSERT INTO products (article, name, price, color, quantity)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const values = [article, name, price, color, quantity];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async updateProduct(productId, fieldsToUpdate) {
    // динамическая генерация SQL
    const setClauses = [];
    const values = [];
    let index = 1;

    for (const key in fieldsToUpdate) {
      setClauses.push(`${key} = $${index}`);
      values.push(fieldsToUpdate[key]);
      index++;
    }

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;
    values.push(productId);
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteProduct(productId) {
    const query = 'DELETE FROM products WHERE id = $1';
    const values = [productId];
    await pool.query(query, values);
  },

  // другие методы...
};
