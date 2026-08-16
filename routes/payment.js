const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.get('/plans', paymentController.getPlans); // public pricing, no auth needed
router.get('/status', authenticate, paymentController.getStatus);
router.get('/usdt-info', paymentController.getUsdtInfo);
router.post('/invoice', authenticate, paymentController.createInvoice);
router.post('/usdt-request', authenticate, paymentController.requestUsdtPayment);

module.exports = router;
