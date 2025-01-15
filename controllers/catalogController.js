// controllers/catalogController.js
const productModel = require('../models/productModel');

module.exports = {
  async getCatalogPage(req, res) {
    // Можно реализовать фильтрацию по article, сортировки и т.д.
    const { article, color } = req.query;
    let products = await productModel.getAllProducts();

    if (article) {
      products = products.filter(p => p.article.includes(article));
    }
    if (color) {
      products = products.filter(p => p.color && p.color.includes(color));
    }

    // Рендерим ejs или отправляем JSON
    res.render('catalog', { products });
  }
};
