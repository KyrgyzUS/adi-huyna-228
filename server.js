// server.js
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5432;
const productsRoutes = require('./routes/products');

app.use('/products', productsRoutes);


// Подключение к базе данных Heroku PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Проверка подключения к базе данных
pool.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
  } else {
    console.log('Успешное подключение к базе данных');
  }
});

// Пример базового маршрута
app.get('/', (req, res) => {
  res.send('Магазин работает! Добро пожаловать.');
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

module.exports = pool;
