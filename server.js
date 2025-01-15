require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const pool = require('./models/db');

const { isAuthenticated, isOwner, isSellerOrOwner } = require('./middlewares/roleMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка шаблонизатора EJS или HTML
app.set('view engine', 'ejs');
// Папка с ejs-шаблонами
app.set('views', path.join(__dirname, 'views'));

// Парсер формы
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Настройка сессий в PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: pool, // наш пул
      tableName: 'session' // имя таблицы для хранения сессий, нужно создать отдельно при желании
    }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 час
  })
);

// Роуты авторизации
app.use('/', authRoutes);

// Каталог
app.use('/catalog', catalogRoutes);

// Заказы
app.use('/orders', isAuthenticated, orderRoutes);

// Аналитика (только для owner)
app.use('/analytics', isOwner, analyticsRoutes);

// Главная страница (просто перенаправим на каталог или сделаем свою)
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.redirect('/catalog');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
