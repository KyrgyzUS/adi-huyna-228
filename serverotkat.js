// server.js

require('dotenv').config(); // Загрузка переменных окружения

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const DBSOURCE = process.env.DBSOURCE || 'warehouse.db';

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Обслуживание статических файлов

// Подключение к базе данных SQLite
let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Ошибка при подключении к базе данных:", err.message);
    throw err;
  }
  console.log("Подключено к базе данных SQLite.");

  // Инициализация таблиц, если они не существуют
  const initializeTables = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('owner', 'seller')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      name TEXT,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_warehouses (
      user_id INTEGER,
      warehouse_id INTEGER,
      PRIMARY KEY (user_id, warehouse_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );
  `;

  db.exec(initializeTables, (err) => {
    if (err) {
      console.error("Ошибка при инициализации таблиц:", err.message);
      throw err;
    }
    console.log("Таблицы инициализированы.");

    // Добавление начальных данных, если таблица users пуста
    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
      if (err) {
        console.error("Ошибка при проверке пользователей:", err.message);
        throw err;
      }

      if (row.count === 0) {
        // Хеширование паролей
        const ownerPassword = bcrypt.hashSync("ownerpass", 10);
        const seller1Password = bcrypt.hashSync("seller1pass", 10);
        const seller2Password = bcrypt.hashSync("seller2pass", 10);

        // Вставка пользователей
        const insertUsers = `
          INSERT INTO users (username, password, role) VALUES
            ('owner', '${ownerPassword}', 'owner'),
            ('seller1', '${seller1Password}', 'seller'),
            ('seller2', '${seller2Password}', 'seller');
        `;
        db.run(insertUsers, (err) => {
          if (err) {
            console.error("Ошибка при добавлении пользователей:", err.message);
            throw err;
          }
          console.log("Пользователи успешно добавлены.");

          // Вставка складов
          const insertWarehouses = `
            INSERT INTO warehouses (name, description) VALUES
              ('Склад 1', 'Описание склада 1'),
              ('Склад 2', 'Описание склада 2');
          `;
          db.run(insertWarehouses, function(err) {
            if (err) {
              console.error("Ошибка при добавлении складов:", err.message);
              throw err;
            }
            console.log("Склады успешно добавлены.");

            // Вставка связей между продавцами и складами
            const insertUserWarehouses = `
              INSERT INTO user_warehouses (user_id, warehouse_id) VALUES
                (2, 1), -- seller1 к Склад 1
                (3, 2); -- seller2 к Склад 2
            `;
            db.run(insertUserWarehouses, (err) => {
              if (err) {
                console.error("Ошибка при добавлении связей user_warehouses:", err.message);
                throw err;
              }
              console.log("Связи между пользователями и складами успешно добавлены.");

              // Вставка начальных продуктов
              const insertProducts = `
                INSERT INTO products (warehouse_id, name, quantity, price) VALUES
                  (1, 'Продукт A', 100, 50.5),
                  (1, 'Продукт B', 200, 75.0),
                  (2, 'Продукт C', 150, 60.0);
              `;
              db.run(insertProducts, (err) => {
                if (err) {
                  console.error("Ошибка при добавлении продуктов:", err.message);
                  throw err;
                }
                console.log("Продукты успешно добавлены.");
              });
            });
          });
        });
      }
    });
  });
});

// --------------------- Аутентификация и Авторизация ---------------------

// Маршрут для входа
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    console.warn('Попытка входа без указания логина или пароля');
    return res.status(400).send('Логин и пароль обязательны');
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Ошибка при поиске пользователя:', err);
      return res.status(500).send('Ошибка сервера');
    }
    if (!user) {
      console.warn(`Попытка входа с несуществующим пользователем: ${username}`);
      return res.status(400).send('Неверный логин или пароль');
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      console.warn(`Неверный пароль для пользователя: ${username}`);
      return res.status(400).send('Неверный логин или пароль');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('Отсутствует токен авторизации');
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('Ошибка проверки токена:', err);
      return res.sendStatus(403); // Forbidden
    }
    req.user = user;
    next();
  });
}

// Middleware для проверки роли владельца
function authorizeOwner(req, res, next) {
  if (req.user.role !== 'owner') {
    console.warn(`Доступ запрещён. Пользователь ID: ${req.user.id}, роль: ${req.user.role}`);
    return res.sendStatus(403); // Forbidden
  }
  next();
}

// --------------------- Маршруты Управления Пользователями ---------------------

// Получение списка пользователей по роли (например, продавцов) - только для владельцев
app.get('/users', authenticateToken, authorizeOwner, (req, res) => {
  const { role } = req.query;

  if (!role) {
    console.warn('Параметр role не предоставлен');
    return res.status(400).send('Параметр role обязателен');
  }

  db.all('SELECT id, username FROM users WHERE role = ?', [role], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении пользователей:', err);
      return res.status(500).send('Ошибка сервера');
    }
    res.json(rows);
  });
});

// --------------------- Маршруты Управления Складами ---------------------

// Создание нового склада - только для владельцев
app.post('/warehouses', authenticateToken, authorizeOwner, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    console.warn('Попытка создания склада без названия');
    return res.status(400).send('Название склада обязательно');
  }

  db.run('INSERT INTO warehouses (name, description) VALUES (?, ?)', [name, description], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.warn(`Попытка создания склада с существующим названием: ${name}`);
        return res.status(400).send('Склад с таким названием уже существует');
      }
      console.error('Ошибка при создании склада:', err);
      return res.status(500).send('Ошибка сервера');
    }
    res.json({ id: this.lastID, name, description });
  });
});

// Получение списка всех складов - только для владельцев
app.get('/warehouses', authenticateToken, authorizeOwner, (req, res) => {
  db.all('SELECT * FROM warehouses', [], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении складов:', err);
      return res.status(500).send('Ошибка сервера');
    }
    res.json(rows);
  });
});

// Удаление склада - только для владельцев
app.delete('/warehouses/:id', authenticateToken, authorizeOwner, (req, res) => {
  const warehouseId = req.params.id;

  db.run('DELETE FROM warehouses WHERE id = ?', [warehouseId], function(err) {
    if (err) {
      console.error('Ошибка при удалении склада:', err);
      return res.status(500).send('Ошибка сервера');
    }
    if (this.changes === 0) {
      console.warn(`Попытка удаления несуществующего склада ID: ${warehouseId}`);
      return res.status(404).send('Склад не найден');
    }
    res.sendStatus(200); // OK
  });
});

// Получение текущего назначенного продавца для склада - только для владельцев
app.get('/warehouses/:id/seller', authenticateToken, authorizeOwner, (req, res) => {
  const warehouseId = req.params.id;

  db.get(
    `SELECT u.id, u.username 
     FROM user_warehouses uw 
     JOIN users u ON uw.user_id = u.id 
     WHERE uw.warehouse_id = ?`,
    [warehouseId],
    (err, row) => {
      if (err) {
        console.error('Ошибка при получении продавца для склада:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (!row) return res.json({ seller: null });
      res.json({ seller: row });
    }
  );
});

// Назначение или изменение продавца для склада - только для владельцев
app.put('/warehouses/:id/assign-seller', authenticateToken, authorizeOwner, (req, res) => {
  const warehouseId = req.params.id;
  const { sellerId } = req.body;

  if (!sellerId) {
    console.warn('Необходимо предоставить sellerId для назначения продавца');
    return res.status(400).send('Необходимо предоставить sellerId');
  }

  // Проверка, существует ли продавец и имеет ли он роль 'seller'
  db.get('SELECT * FROM users WHERE id = ? AND role = ?', [sellerId, 'seller'], (err, seller) => {
    if (err) {
      console.error('Ошибка при проверке продавца:', err);
      return res.status(500).send('Ошибка сервера');
    }

    if (!seller) {
      console.warn(`Продавец с ID: ${sellerId} не найден или не имеет роли 'seller'`);
      return res.status(400).send('Продавец не найден или не имеет роли "seller"');
    }

    // Удаление всех текущих назначений продавцов к этому складу
    db.run('DELETE FROM user_warehouses WHERE warehouse_id = ?', [warehouseId], function(err) {
      if (err) {
        console.error('Ошибка при удалении текущих назначений продавцов:', err);
        return res.status(500).send('Ошибка сервера');
      }

      // Назначение нового продавца
      db.run('INSERT INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)', [sellerId, warehouseId], function(err) {
        if (err) {
          console.error('Ошибка при назначении нового продавца:', err);
          return res.status(500).send('Ошибка сервера');
        }

        console.log(`Продавец ID: ${sellerId} назначен к складу ID: ${warehouseId}`);
        res.sendStatus(200);
      });
    });
  });
});

// --------------------- Маршруты Получения Склада Пользователем ---------------------

// Получение складов, к которым имеет доступ пользователь
app.get('/my-warehouses', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  if (userRole === 'owner') {
    // Владелец видит все склады
    db.all('SELECT * FROM warehouses', [], (err, rows) => {
      if (err) {
        console.error('Ошибка при получении складов владельцем:', err);
        return res.status(500).send('Ошибка сервера');
      }
      res.json(rows);
    });
  } else if (userRole === 'seller') {
    // Продавец видит только свои склады
    db.all(
      `SELECT w.* FROM warehouses w
       JOIN user_warehouses uw ON w.id = uw.warehouse_id
       WHERE uw.user_id = ?`,
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Ошибка при получении складов продавцом:', err);
          return res.status(500).send('Ошибка сервера');
        }
        res.json(rows);
      }
    );
  } else {
    res.sendStatus(403); // Forbidden
  }
});

// --------------------- Маршруты Управления Продуктами ---------------------

// Получение продуктов для конкретного склада
app.get('/warehouses/:id/products', authenticateToken, (req, res) => {
  const warehouseId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (userRole === 'seller') {
    // Проверка, имеет ли продавец доступ к этому складу
    db.get('SELECT * FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?', [userId, warehouseId], (err, row) => {
      if (err) {
        console.error('Ошибка при проверке доступа продавца к складу:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (!row) return res.sendStatus(403); // Forbidden

      // Если доступ есть, вернуть продукты
      db.all('SELECT * FROM products WHERE warehouse_id = ?', [warehouseId], (err, rows) => {
        if (err) {
          console.error('Ошибка при получении продуктов:', err);
          return res.status(500).send('Ошибка сервера');
        }
        res.json(rows);
      });
    });
  } else if (userRole === 'owner') {
    // Владелец имеет доступ ко всем складам
    db.all('SELECT * FROM products WHERE warehouse_id = ?', [warehouseId], (err, rows) => {
      if (err) {
        console.error('Ошибка при получении продуктов владельцем:', err);
        return res.status(500).send('Ошибка сервера');
      }
      res.json(rows);
    });
  } else {
    res.sendStatus(403); // Forbidden
  }
});

// Добавление продукта к складу
app.post('/warehouses/:id/products', authenticateToken, (req, res) => {
  const warehouseId = req.params.id;
  const { name, quantity, price } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!name || quantity == null || price == null) {
    console.warn('Попытка добавления продукта без необходимых полей');
    return res.status(400).send('Необходимо предоставить название, количество и цену продукта');
  }

  if (userRole === 'seller') {
    // Проверка доступа продавца к складу
    db.get('SELECT * FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?', [userId, warehouseId], (err, row) => {
      if (err) {
        console.error('Ошибка при проверке доступа продавца к складу для добавления продукта:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (!row) return res.sendStatus(403); // Forbidden

      // Добавление продукта
      db.run(
        'INSERT INTO products (warehouse_id, name, quantity, price) VALUES (?, ?, ?, ?)',
        [warehouseId, name, quantity, price],
        function(err) {
          if (err) {
            console.error('Ошибка при добавлении продукта продавцом:', err);
            return res.status(500).send('Ошибка сервера');
          }
          res.json({ id: this.lastID, name, quantity, price });
        }
      );
    });
  } else if (userRole === 'owner') {
    // Владелец может добавлять продукты к любому складу
    db.run(
      'INSERT INTO products (warehouse_id, name, quantity, price) VALUES (?, ?, ?, ?)',
      [warehouseId, name, quantity, price],
      function(err) {
        if (err) {
          if (err.message.includes('FOREIGN KEY constraint failed')) {
            console.warn(`Попытка добавления продукта к несуществующему складу ID: ${warehouseId}`);
            return res.status(400).send('Склад не существует');
          }
          console.error('Ошибка при добавлении продукта владельцем:', err);
          return res.status(500).send('Ошибка сервера');
        }
        res.json({ id: this.lastID, name, quantity, price });
      }
    );
  } else {
    res.sendStatus(403); // Forbidden
  }
});

// Обновление продукта
app.put('/warehouses/:warehouseId/products/:productId', authenticateToken, (req, res) => {
  const { warehouseId, productId } = req.params;
  const { name, quantity, price } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!name || quantity == null || price == null) {
    console.warn('Попытка обновления продукта без необходимых полей');
    return res.status(400).send('Необходимо предоставить название, количество и цену продукта');
  }

  if (userRole === 'seller') {
    // Проверка доступа продавца к складу
    db.get('SELECT * FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?', [userId, warehouseId], (err, row) => {
      if (err) {
        console.error('Ошибка при проверке доступа продавца к складу для обновления продукта:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (!row) return res.sendStatus(403); // Forbidden

      // Обновление продукта
      db.run(
        'UPDATE products SET name = ?, quantity = ?, price = ? WHERE id = ? AND warehouse_id = ?',
        [name, quantity, price, productId, warehouseId],
        function(err) {
          if (err) {
            console.error('Ошибка при обновлении продукта продавцом:', err);
            return res.status(500).send('Ошибка сервера');
          }
          if (this.changes === 0) {
            console.warn(`Продукт ID: ${productId} в складе ID: ${warehouseId} не найден`);
            return res.status(404).send('Продукт не найден');
          }
          res.sendStatus(200); // OK
        }
      );
    });
  } else if (userRole === 'owner') {
    // Владелец может обновлять продукты любого склада
    db.run(
      'UPDATE products SET name = ?, quantity = ?, price = ? WHERE id = ? AND warehouse_id = ?',
      [name, quantity, price, productId, warehouseId],
      function(err) {
        if (err) {
          console.error('Ошибка при обновлении продукта владельцем:', err);
          return res.status(500).send('Ошибка сервера');
        }
        if (this.changes === 0) {
          console.warn(`Продукт ID: ${productId} в складе ID: ${warehouseId} не найден`);
          return res.status(404).send('Продукт не найден');
        }
        res.sendStatus(200); // OK
      }
    );
  } else {
    res.sendStatus(403); // Forbidden
  }
});

// Удаление продукта
app.delete('/warehouses/:warehouseId/products/:productId', authenticateToken, (req, res) => {
  const { warehouseId, productId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (userRole === 'seller') {
    // Проверка доступа продавца к складу
    db.get('SELECT * FROM user_warehouses WHERE user_id = ? AND warehouse_id = ?', [userId, warehouseId], (err, row) => {
      if (err) {
        console.error('Ошибка при проверке доступа продавца к складу для удаления продукта:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (!row) return res.sendStatus(403); // Forbidden

      // Удаление продукта
      db.run('DELETE FROM products WHERE id = ? AND warehouse_id = ?', [productId, warehouseId], function(err) {
        if (err) {
          console.error('Ошибка при удалении продукта продавцом:', err);
          return res.status(500).send('Ошибка сервера');
        }
        if (this.changes === 0) {
          console.warn(`Продукт ID: ${productId} в складе ID: ${warehouseId} не найден`);
          return res.status(404).send('Продукт не найден');
        }
        res.sendStatus(200); // OK
      });
    });
  } else if (userRole === 'owner') {
    // Владелец может удалять продукты любого склада
    db.run('DELETE FROM products WHERE id = ? AND warehouse_id = ?', [productId, warehouseId], function(err) {
      if (err) {
        console.error('Ошибка при удалении продукта владельцем:', err);
        return res.status(500).send('Ошибка сервера');
      }
      if (this.changes === 0) {
        console.warn(`Продукт ID: ${productId} в складе ID: ${warehouseId} не найден`);
        return res.status(404).send('Продукт не найден');
      }
      res.sendStatus(200); // OK
    });
  } else {
    res.sendStatus(403); // Forbidden
  }
});

// --------------------- Перемещение Продуктов Между Складами ---------------------

// Перемещение продукта между складами - только для владельцев
app.post('/warehouses/move-product', authenticateToken, authorizeOwner, (req, res) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;

  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
    console.warn('Недостаточно данных для перемещения продукта');
    return res.status(400).send('Необходимо предоставить productId, fromWarehouseId, toWarehouseId и quantity');
  }

  if (fromWarehouseId === toWarehouseId) {
    console.warn('Исходный и целевой склады совпадают');
    return res.status(400).send('Исходный и целевой склады не могут быть одинаковыми');
  }

  db.serialize(() => {
    // Проверка наличия продукта на исходном складе
    db.get(
      'SELECT quantity FROM products WHERE id = ? AND warehouse_id = ?',
      [productId, fromWarehouseId],
      (err, row) => {
        if (err) {
          console.error('Ошибка при проверке наличия продукта на исходном складе:', err);
          return res.status(500).send('Ошибка сервера');
        }

        if (!row) {
          console.warn(`Продукт ID: ${productId} не найден на складе ID: ${fromWarehouseId}`);
          return res.status(404).send('Продукт не найден на исходном складе');
        }

        if (row.quantity < quantity) {
          console.warn(`Недостаточно товара для перемещения: имеющееся количество ${row.quantity}, запрашиваемое ${quantity}`);
          return res.status(400).send('Недостаточно товара для перемещения');
        }

        // Начало транзакции
        db.run('BEGIN TRANSACTION');

        // Уменьшаем количество товара на исходном складе
        db.run(
          'UPDATE products SET quantity = quantity - ? WHERE id = ? AND warehouse_id = ?',
          [quantity, productId, fromWarehouseId],
          function(err) {
            if (err) {
              console.error('Ошибка при уменьшении количества товара на исходном складе:', err);
              db.run('ROLLBACK');
              return res.status(500).send('Ошибка сервера');
            }

            // Проверяем, существует ли продукт на целевом складе
            db.get(
              'SELECT quantity FROM products WHERE id = ? AND warehouse_id = ?',
              [productId, toWarehouseId],
              (err, targetRow) => {
                if (err) {
                  console.error('Ошибка при проверке наличия продукта на целевом складе:', err);
                  db.run('ROLLBACK');
                  return res.status(500).send('Ошибка сервера');
                }

                if (targetRow) {
                  // Если продукт уже существует на целевом складе, увеличиваем его количество
                  db.run(
                    'UPDATE products SET quantity = quantity + ? WHERE id = ? AND warehouse_id = ?',
                    [quantity, productId, toWarehouseId],
                    function(err) {
                      if (err) {
                        console.error('Ошибка при увеличении количества товара на целевом складе:', err);
                        db.run('ROLLBACK');
                        return res.status(500).send('Ошибка сервера');
                      }

                      // Завершаем транзакцию
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('Ошибка при коммите транзакции:', err);
                          db.run('ROLLBACK');
                          return res.status(500).send('Ошибка сервера');
                        }

                        console.log(`Товар ID: ${productId} успешно перемещён с склада ID: ${fromWarehouseId} на склад ID: ${toWarehouseId}`);
                        res.sendStatus(200);
                      });
                    }
                  );
                } else {
                  // Если продукта нет на целевом складе, создаём новую запись
                  db.run(
                    'INSERT INTO products (warehouse_id, name, quantity, price) SELECT ?, name, ?, price FROM products WHERE id = ? AND warehouse_id = ?',
                    [toWarehouseId, quantity, productId, fromWarehouseId],
                    function(err) {
                      if (err) {
                        console.error('Ошибка при добавлении продукта на целевом складе:', err);
                        db.run('ROLLBACK');
                        return res.status(500).send('Ошибка сервера');
                      }

                      // Завершаем транзакцию
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('Ошибка при коммите транзакции:', err);
                          db.run('ROLLBACK');
                          return res.status(500).send('Ошибка сервера');
                        }

                        console.log(`Товар ID: ${productId} успешно перемещён с склада ID: ${fromWarehouseId} на склад ID: ${toWarehouseId}`);
                        res.sendStatus(200);
                      });
                    }
                  );
                }
              }
            );
          }
        );
      }
    );
  });
});

// --------------------- Запуск Сервера ---------------------

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
