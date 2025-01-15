// controllers/orderController.js
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const debtorsModel = require('../models/debtorsModel');

module.exports = {
  async createOrder(req, res) {
    // userId — тот, кто создаёт заказ
    const userId = req.session.user ? req.session.user.id : null;
    if (!userId) {
      return res.redirect('/login');
    }
    // Создаём "черновик" заказа
    const newOrder = await orderModel.createOrder(userId);
    res.redirect(`/order/${newOrder.order_number}`);
  },

  async addItemToOrder(req, res) {
    // Добавление товаров к заказу
    const { orderNumber } = req.params;
    const { article, color, quantity, discount } = req.body;
    
    // Находим заказ
    const order = await orderModel.getOrderByNumber(orderNumber);
    if (!order) {
      return res.send('Заказ не найден');
    }

    // Находим товар
    // Или по id, или по (article, color)
    const product = await productModel.findByArticleAndColor(article, color);
    if (!product) {
      return res.send('Товар не найден');
    }

    // Проверяем наличие на складе (quantity <= product.quantity)
    if (quantity > product.quantity) {
      return res.send('Недостаточное количество на складе');
    }

    const priceWithDiscount = product.price; // цена единицы
    const numericDiscount = discount ? parseFloat(discount) : 0;

    // Добавляем позицию в order_items
    await orderModel.addOrderItem(order.id, product.id, quantity, numericDiscount, priceWithDiscount);

    // Обновляем остатки на складе
    const updatedQuantity = product.quantity - quantity;
    await productModel.updateProduct(product.id, { quantity: updatedQuantity });

    res.redirect(`/order/${orderNumber}`);
  },

  async getOrderPage(req, res) {
    // показать содержимое заказа
    const { orderNumber } = req.params;
    const order = await orderModel.getOrderByNumber(orderNumber);
    if (!order) {
      return res.send('Заказ не найден');
    }
    const items = await orderModel.getOrderItems(order.id);
    res.render('order', { order, items });
  },

  async confirmPayment(req, res) {
    // подтверждение оплаты
    const { orderNumber } = req.params;
    const { paymentMethod } = req.body;
    const order = await orderModel.getOrderByNumber(orderNumber);
    if (!order) {
      return res.send('Заказ не найден');
    }
    
    // Подсчитываем сумму заказа
    const items = await orderModel.getOrderItems(order.id);
    let totalAmount = 0;
    for (let i of items) {
      totalAmount += (i.price - i.discount) * i.quantity;
    }

    if (paymentMethod === 'debt') {
      // накапливаем долг
      const userId = order.user_id;
      await debtorsModel.addDebt(userId, totalAmount);
    }

    await orderModel.updateOrderPayment(order.id, paymentMethod);

    // Результат
    res.send(`Заказ оплачен способом: ${paymentMethod}. Сумма: ${totalAmount}`);
  },

  async getAllUnpaidOrders(req, res) {
    // Только для seller / owner
    const orders = await orderModel.getAllUnpaidOrders();
    res.render('unpaid_orders', { orders });
  },

  async deleteUnpaidOrder(req, res) {
    // Удаление неоплаченного заказа
    const { orderId } = req.params;
    await orderModel.deleteOrder(orderId);
    res.redirect('/orders/unpaid');
  }
};
