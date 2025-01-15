// controllers/analyticsController.js
// Тут можно собрать SQL-запросы для подсчёта выручки, популярности товаров и т.д.
// Либо более сложную аналитику. Приведём пример счётчика "сколько продано".

const pool = require('../models/db');

module.exports = {
  async getAnalytics(req, res) {
    // Пример: суммарная выручка
    const revenueQuery = `
      SELECT SUM((oi.price - oi.discount) * oi.quantity) AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid'
    `;
    const revenueResult = await pool.query(revenueQuery);
    const totalRevenue = revenueResult.rows[0].total_revenue || 0;

    // Пример: количество проданных товаров
    const totalSoldQuery = `
      SELECT SUM(oi.quantity) AS total_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid'
    `;
    const totalSoldResult = await pool.query(totalSoldQuery);
    const totalSold = totalSoldResult.rows[0].total_sold || 0;

    // Передаём данные в шаблон
    res.render('analytics', { totalRevenue, totalSold });
  }
};
