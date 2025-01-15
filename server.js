/****************************************************
 * server.js — Серверная логика (Node.js + Express + PostgreSQL)
 * --------------------------------------------------
 * Предполагается, что в папке public/ лежат ваши
 *   статические файлы (index.html, app.js, style.css, ...)
 * Также предполагается, что в PostgreSQL уже созданы
 *   таблицы: users, warehouses, products, debtors, actions_log.
 ****************************************************/
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Инициализация приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к PostgreSQL
// Настройте строку подключения (DATABASE_URL) под своё окружение или Heroku
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb',
  // ssl: { rejectUnauthorized: false }, // если нужно для Heroku
});

// Мидлвары
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Раздача статического контента из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Упрощённая "авторизация" через заголовок X-Username или query (для логирования)
app.use((req, res, next) => {
  const username = req.headers['x-username'] || req.query.username || 'anonymous';
  req.currentUser = { username };
  next();
});

/************************************************
 * Функция записи действий в журнал (actions_log)
 ************************************************/
async function logAction(username, actionType, description) {
  try {
    await pool.query(
      `INSERT INTO actions_log (username, action_type, description) VALUES ($1, $2, $3)`,
      [username, actionType, description]
    );
  } catch (err) {
    console.error('Ошибка записи в журнал:', err);
  }
}

/************************************************
 * Эндпоинты пользователей (users)
 ************************************************/
// Получить всех пользователей (без паролей — для демо)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, password, role FROM users ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении списка пользователей');
  }
});

// Создать пользователя
app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const q = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;
    const result = await pool.query(q, [username, password, role]);
    await logAction(req.currentUser.username, 'createUser', `Создан пользователь ${username} (role=${role})`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при создании пользователя');
  }
});

/************************************************
 * Эндпоинты складов (warehouses)
 ************************************************/
// Получить все склады
app.get('/api/warehouses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM warehouses ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении складов');
  }
});

// Создать склад
app.post('/api/warehouses', async (req, res) => {
  const { name, description, seller } = req.body;
  try {
    const q = `
      INSERT INTO warehouses (name, description, seller)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(q, [name, description, seller || null]);
    await logAction(req.currentUser.username, 'addWarehouse', `Добавлен склад "${name}" (seller=${seller})`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при создании склада');
  }
});

// Удалить склад
app.delete('/api/warehouses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Проверка товаров на складе
    const prod = await pool.query(`SELECT * FROM products WHERE warehouse_id=$1`, [id]);
    if (prod.rows.length > 0) {
      return res.status(400).send('Невозможно удалить склад с товарами');
    }
    // Удаляем склад
    const delRes = await pool.query(`DELETE FROM warehouses WHERE id=$1 RETURNING *`, [id]);
    if (delRes.rowCount === 0) {
      return res.status(404).send('Склад не найден');
    }
    await logAction(req.currentUser.username, 'deleteWarehouse', `Удалён склад id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при удалении склада');
  }
});

/************************************************
 * Эндпоинты товаров (products)
 ************************************************/
// Получить все товары
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM products ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении товаров');
  }
});

// Создать товар
app.post('/api/products', async (req, res) => {
  const { name, quantity, price, warehouseId } = req.body;
  try {
    const q = `
      INSERT INTO products (name, quantity, price, warehouse_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(q, [name, quantity, price, warehouseId]);
    await logAction(req.currentUser.username, 'addProduct', `Добавлен товар "${name}" на склад=${warehouseId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при добавлении товара');
  }
});

// Удалить товар
app.delete('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const delRes = await pool.query(`DELETE FROM products WHERE id=$1 RETURNING *`, [id]);
    if (delRes.rowCount === 0) {
      return res.status(404).send('Товар не найден');
    }
    await logAction(req.currentUser.username, 'deleteProduct', `Удалён товар id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при удалении товара');
  }
});

// Продажа товара (учёт скидки)
app.post('/api/products/sell', async (req, res) => {
  const { productId, quantity, discount, paymentMethod, debtorId } = req.body;
  try {
    // Ищем товар
    const productRes = await pool.query(`SELECT * FROM products WHERE id=$1`, [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).send('Товар не найден');
    }
    const product = productRes.rows[0];
    if (Number(product.quantity) < quantity) {
      return res.status(400).send('Недостаточное количество товара');
    }

    // Считаем итоговую стоимость (discount — конкретная сумма)
    const discountNum = discount ? Number(discount) : 0;
    const totalBeforeDiscount = Number(product.price) * quantity;
    let totalCost = totalBeforeDiscount - discountNum;
    if (totalCost < 0) totalCost = 0;

    // Если оплата должником
    if (paymentMethod === 'debtor') {
      if (!debtorId) {
        return res.status(400).send('Не выбран должник');
      }
      const debtorRes = await pool.query(`SELECT * FROM debtors WHERE id=$1`, [debtorId]);
      if (debtorRes.rows.length === 0) {
        return res.status(404).send('Должник не найден');
      }
      const oldDebt = Number(debtorRes.rows[0].debt);
      const newDebt = oldDebt + totalCost;
      await pool.query(`UPDATE debtors SET debt=$1 WHERE id=$2`, [newDebt, debtorId]);
    }

    // Уменьшаем количество товара
    const newQty = Number(product.quantity) - quantity;
    await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [newQty, productId]);

    // Пишем в лог
    await logAction(
      req.currentUser.username,
      'sell',
      `Продажа товара id=${productId}, qty=${quantity}, discount=${discount}, payment=${paymentMethod}`
    );

    res.json({ success: true, totalCost });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при продаже товара');
  }
});

// Перемещение товара
app.post('/api/products/move', async (req, res) => {
  const { productId, fromWarehouse, toWarehouse, moveQuantity } = req.body;
  try {
    if (fromWarehouse === toWarehouse) {
      return res.status(400).send('Исходный и целевой склады должны быть разными');
    }
    // Проверка товара на fromWarehouse
    const productRes = await pool.query(
      `SELECT * FROM products WHERE id=$1 AND warehouse_id=$2`,
      [productId, fromWarehouse]
    );
    if (productRes.rows.length === 0) {
      return res.status(404).send('Товар не найден на исходном складе');
    }
    const product = productRes.rows[0];
    if (Number(product.quantity) < moveQuantity) {
      return res.status(400).send('Недостаточное количество товара');
    }

    // Уменьшаем на исходном
    const newQty = Number(product.quantity) - moveQuantity;
    await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [newQty, productId]);

    // Проверяем, есть ли товар с таким же названием на целевом
    const toRes = await pool.query(
      `SELECT * FROM products WHERE name=$1 AND warehouse_id=$2`,
      [product.name, toWarehouse]
    );
    if (toRes.rows.length > 0) {
      // Уже существует, увеличиваем количество
      const existingProd = toRes.rows[0];
      const updatedQty = Number(existingProd.quantity) + moveQuantity;
      await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [updatedQty, existingProd.id]);
    } else {
      // Создаём новый
      await pool.query(`
        INSERT INTO products (name, quantity, price, warehouse_id)
        VALUES ($1, $2, $3, $4)
      `, [product.name, moveQuantity, product.price, toWarehouse]);
    }

    // Лог
    await logAction(
      req.currentUser.username,
      'move',
      `Перемещение товара id=${productId}, qty=${moveQuantity}, со склада=${fromWarehouse} на склад=${toWarehouse}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при перемещении товара');
  }
});

/************************************************
 * Эндпоинты должников (debtors)
 ************************************************/
app.get('/api/debtors', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM debtors ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении должников');
  }
});

app.post('/api/debtors', async (req, res) => {
  const { name, debt } = req.body;
  try {
    const q = `
      INSERT INTO debtors (name, debt)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(q, [name, debt]);
    await logAction(req.currentUser.username, 'addDebtor', `Добавлен должник "${name}", debt=${debt}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при добавлении должника');
  }
});

// Редактировать должника
app.put('/api/debtors/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, debt } = req.body;
  try {
    const upd = `
      UPDATE debtors
      SET name=$1, debt=$2
      WHERE id=$3
      RETURNING *
    `;
    const result = await pool.query(upd, [name, debt, id]);
    if (result.rowCount === 0) {
      return res.status(404).send('Должник не найден');
    }
    await logAction(req.currentUser.username, 'editDebtor', `Изменён должник id=${id}, name=${name}, debt=${debt}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при редактировании должника');
  }
});

// Удаление должника
app.delete('/api/debtors/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const delRes = await pool.query(`DELETE FROM debtors WHERE id=$1 RETURNING *`, [id]);
    if (delRes.rowCount === 0) {
      return res.status(404).send('Должник не найден');
    }
    await logAction(req.currentUser.username, 'deleteDebtor', `Удалён должник id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при удалении должника');
  }
});

/************************************************
 * Эндпоинты лога действий (actions_log)
 ************************************************/
app.get('/api/actions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM actions_log ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении лога действий');
  }
});

/************************************************
 * Запуск сервера
 ************************************************/
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
