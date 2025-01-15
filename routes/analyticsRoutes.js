// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Для owner
router.get('/', analyticsController.getAnalytics);

module.exports = router;
