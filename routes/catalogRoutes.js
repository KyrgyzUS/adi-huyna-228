// routes/catalogRoutes.js
const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Каталог товаров (доступен всем - user, seller, owner)
router.get('/', catalogController.getCatalogPage);

module.exports = router;
