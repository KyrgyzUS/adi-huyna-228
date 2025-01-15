// routes/products.js
const express = require('express');
const router = express.Router();
const pool = require('../server'); // Подключение к базе данных

// Добавление товара
router.post('/add', async (req, res) => {
  const { article, name, price, color, quantity } = req.body;

  if (!article || !name || !price || !color || !quantity) {
    return res.status(400).send('Все поля обязательны для заполнения.');
  }

  try {
    const query = `
      INSERT INTO products (article, name, price, color, quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [article, name, price, color, quantity];
    const result = await pool.query(query, values);
    res.status(201).send({ message: 'Товар добавлен успешно', product: result.rows[0] });
  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;
