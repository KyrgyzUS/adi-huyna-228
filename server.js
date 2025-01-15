/******************************************************
 * server.js — Приложение Node.js + Express для Heroku
 * Имя приложения: adi-huyna-228
 ******************************************************/
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Инициализация приложения
const app = express();

// Порт слушаем из переменной окружения или 3000
const PORT = process.env.PORT || 3000;

// Настройка подключения к PostgreSQL через переменную окружения
// Если запущено локально, можно указать свой адрес PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL 
    || 'postgres://postgres:postgres@localhost:5432/mydb', 
  // ssl: { rejectUnauthorized: false } // Раскомментируйте для Heroku, если нужно
});

// Мидлвары
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Упрощённая "авторизация" для логирования
app.use((req, res, next) => {
  const username = req.headers['x-username'] || req.query.username || 'anonymous';
  req.currentUser = { username };
  next();
});

/******************************************************
 * Функция записи действий в actions_log
 ******************************************************/
async function logAction(username, actionType, description) {
  try {
    await pool.query(`
      INSERT INTO actions_log (username, action_type, description)
      VALUES ($1, $2, $3)
    `, [username, actionType, description]);
  } catch (err) {
    console.error('Ошибка записи в actions_log:', err);
  }
}

/******************************************************
 * Пример эндпоинтов: пользователи, склады, товары
 * должники, продажа, перемещение и т.д.
 ******************************************************/
// 1) Пример: Получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, password, role FROM users ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при получении списка пользователей');
  }
});

// 2) Пример: Добавить пользователя
app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const sql = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;
    const result = await pool.query(sql, [username, password, role]);
    await logAction(req.currentUser.username, 'createUser', `Создан пользователь ${username} (role=${role})`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при создании пользователя');
  }
});

// 3) Пример: Получить все склады
app.get('/api/warehouses', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM warehouses ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при получении складов');
  }
});

// 4) Пример: Добавить склад
app.post('/api/warehouses', async (req, res) => {
  const { name, description, seller } = req.body;
  try {
    const sql = `
      INSERT INTO warehouses(name, description, seller)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(sql, [name, description, seller || null]);
    await logAction(req.currentUser.username, 'addWarehouse', `Добавлен склад "${name}" (seller=${seller})`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при создании склада');
  }
});

// 5) Пример: Удалить склад
app.delete('/api/warehouses/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const prodRes = await pool.query(`SELECT * FROM products WHERE warehouse_id=$1`, [id]);
    if (prodRes.rows.length > 0) {
      return res.status(400).send('Невозможно удалить склад с товарами');
    }
    const delRes = await pool.query(`DELETE FROM warehouses WHERE id=$1 RETURNING *`, [id]);
    if (delRes.rowCount === 0) {
      return res.status(404).send('Склад не найден');
    }
    await logAction(req.currentUser.username, 'deleteWarehouse', `Удалён склад id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при удалении склада');
  }
});

// -- И т.д. (Товары, Должники, Продажа, Перемещение) --

// 6) Пример: Получить все товары
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM products ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при получении товаров');
  }
});

// 7) Пример: Добавить товар
app.post('/api/products', async (req, res) => {
  const { name, quantity, price, warehouseId } = req.body;
  try {
    const sql = `
      INSERT INTO products (name, quantity, price, warehouse_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(sql, [name, quantity, price, warehouseId]);
    await logAction(req.currentUser.username, 'addProduct', `Добавлен товар "${name}" на склад=${warehouseId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при добавлении товара');
  }
});

// 8) Пример: Продажа товара (с учётом скидки)
app.post('/api/products/sell', async (req, res) => {
  const { productId, quantity, discount, paymentMethod, debtorId } = req.body;
  try {
    const productRes = await pool.query(`SELECT * FROM products WHERE id=$1`, [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).send('Товар не найден');
    }
    const product = productRes.rows[0];
    if (Number(product.quantity) < quantity) {
      return res.status(400).send('Недостаточное количество товара');
    }

    const disc = discount ? Number(discount) : 0;
    const totalBeforeDiscount = Number(product.price) * quantity;
    let totalCost = totalBeforeDiscount - disc;
    if (totalCost < 0) totalCost = 0;

    // Если должник
    if (paymentMethod === 'debtor') {
      if (!debtorId) return res.status(400).send('Не выбран должник');
      const debRes = await pool.query(`SELECT * FROM debtors WHERE id=$1`, [debtorId]);
      if (debRes.rows.length === 0) return res.status(404).send('Должник не найден');
      const oldDebt = Number(debRes.rows[0].debt);
      const newDebt = oldDebt + totalCost;
      await pool.query(`UPDATE debtors SET debt=$1 WHERE id=$2`, [newDebt, debtorId]);
    }

    // Уменьшаем количество
    const newQty = Number(product.quantity) - quantity;
    await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [newQty, productId]);

    // Логирование
    await logAction(
      req.currentUser.username,
      'sell',
      `Продажа товара id=${productId}, qty=${quantity}, discount=${disc}, payment=${paymentMethod}`
    );
    res.json({ success: true, totalCost });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при продаже товара');
  }
});

// 9) Пример: Перемещение товара
app.post('/api/products/move', async (req, res) => {
  const { productId, fromWarehouse, toWarehouse, moveQuantity } = req.body;
  try {
    if (fromWarehouse === toWarehouse) {
      return res.status(400).send('Исходный и целевой склады должны быть разными');
    }
    // Проверяем товар на исходном складе
    const productRes = await pool.query(`
      SELECT * FROM products
      WHERE id=$1 AND warehouse_id=$2
    `, [productId, fromWarehouse]);
    if (productRes.rows.length === 0) {
      return res.status(404).send('Товар не найден на исходном складе');
    }
    const product = productRes.rows[0];
    if (Number(product.quantity) < moveQuantity) {
      return res.status(400).send('Недостаточное количество товара');
    }

    // Уменьшаем на from
    const newQty = Number(product.quantity) - moveQuantity;
    await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [newQty, productId]);

    // Проверяем, есть ли на toWarehouse товар с таким же именем
    const toRes = await pool.query(`
      SELECT * FROM products
      WHERE name=$1 AND warehouse_id=$2
    `, [product.name, toWarehouse]);
    if (toRes.rows.length > 0) {
      // Товар уже есть, увеличиваем
      const existProd = toRes.rows[0];
      const newQ = Number(existProd.quantity) + moveQuantity;
      await pool.query(`UPDATE products SET quantity=$1 WHERE id=$2`, [newQ, existProd.id]);
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
      `Перемещение товара id=${productId}, qty=${moveQuantity}, склад:${fromWarehouse}->${toWarehouse}`
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при перемещении товара');
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
    res.status(500).send('Ошибка при получении должников');
  }
});

app.post('/api/debtors', async (req, res) => {
  const { name, debt } = req.body;
  try {
    const insert = `
      INSERT INTO debtors (name, debt)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(insert, [name, debt]);
    await logAction(req.currentUser.username, 'addDebtor', `Добавлен должник "${name}", debt=${debt}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при добавлении должника');
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
    res.status(500).send('Ошибка при редактировании должника');
  }
});

// Удалить должника
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
    res.status(500).send('Ошибка при удалении должника');
  }
});

/************************************************
 * Лог (actions_log)
 ************************************************/
app.get('/api/actions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM actions_log ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка при получении журнала действий');
  }
});

/************************************************
 * Запуск сервера
 ************************************************/
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
