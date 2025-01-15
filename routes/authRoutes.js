// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// формы логина, регистрации
router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);

module.exports = router;
