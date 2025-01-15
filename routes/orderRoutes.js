// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Создание заказа
router.post('/create', orderController.createOrder);

// Добавление товара в заказ
router.post('/:orderNumber/add-item', orderController.addItemToOrder);

// Просмотр конкретного заказа
router.get('/:orderNumber', orderController.getOrderPage);

// Подтверждение оплаты
router.post('/:orderNumber/pay', orderController.confirmPayment);

// Просмотр всех неоплаченных заказов
router.get('/unpaid', orderController.getAllUnpaidOrders);

// Удаление неоплаченного заказа
router.post('/unpaid/:orderId/delete', orderController.deleteUnpaidOrder);

module.exports = router;
