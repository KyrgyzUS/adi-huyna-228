-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL
);

-- Таблица складов
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  seller VARCHAR(50)
);

-- Таблица продуктов
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  warehouse_id INT REFERENCES warehouses(id)
);

-- Таблица должников
CREATE TABLE IF NOT EXISTS debtors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  debt NUMERIC(10,2) NOT NULL
);

-- Таблица логов действий
CREATE TABLE IF NOT EXISTS actions_log (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,    -- кто совершил действие
  action_type VARCHAR(50) NOT NULL, -- например 'sell', 'move', 'delete', 'edit', ...
  description TEXT,                 -- произвольное описание
  created_at TIMESTAMP DEFAULT NOW()
);
