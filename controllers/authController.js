// controllers/authController.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

module.exports = {
  getLoginPage(req, res) {
    res.render('login'); // или res.sendFile(...)
  },

  async postLogin(req, res) {
    const { username, password } = req.body;
    const user = await userModel.findByUsername(username);
    if (!user) {
      return res.send('Пользователь не найден!');
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.send('Неверный пароль!');
    }
    // Сохраняем данные пользователя в сессии
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    res.redirect('/'); 
  },

  getRegisterPage(req, res) {
    res.render('register');
  },

  async postRegister(req, res) {
    const { username, password, role } = req.body;
    // Проверяем, не занят ли username
    const existingUser = await userModel.findByUsername(username);
    if (existingUser) {
      return res.send('Имя пользователя уже занято!');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await userModel.createUser(username, passwordHash, role);
    res.redirect('/login');
  },

  logout(req, res) {
    req.session.destroy();
    res.redirect('/login');
  }
};
