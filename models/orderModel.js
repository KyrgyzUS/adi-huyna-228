// models/orderModel.js
const pool = require('./db');
const { v4: uuidv4 } = require('uuid'); // для генерации номера заказа, можно поставить npm i uuid

module.exports = {
  async createOrder(userId) {
    const orderNumber = uuidv4().slice(0, 8).toUpperCase(); // укоротим uuid, напр.
    const query = `
      INSERT INTO orders (order_number, user_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING *
    `;
    const values = [orderNumber, userId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async addOrderItem(orderId, productId, quantity, discount, price) {
    const query = `
      INSERT INTO order_items (order_id, product_id, quantity, discount, price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [orderId, productId, quantity, discount, price];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getOrderById(orderId) {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const values = [orderId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getOrderByNumber(orderNumber) {
    const query = 'SELECT * FROM orders WHERE order_number = $1';
    const values = [orderNumber];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getOrderItems(orderId) {
    const query = `
      SELECT oi.*, p.name, p.article, p.color
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    const values = [orderId];
    const result = await pool.query(query, values);
    return result.rows;
  },

  async updateOrderPayment(orderId, paymentMethod) {
    const query = `
      UPDATE orders
      SET status = 'paid', payment_method = $1
      WHERE id = $2
      RETURNING *
    `;
    const values = [paymentMethod, orderId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getAllUnpaidOrders() {
    const query = `SELECT * FROM orders WHERE status = 'pending'`;
    const result = await pool.query(query);
    return result.rows;
  },

  async deleteOrder(orderId) {
    // Удаляем связанные order_items
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    // Удаляем сам заказ
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  }
};
