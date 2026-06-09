const express = require('express');
const cartModel = require('../models/cart');
const orderModel = require('../models/order');
const productKeyModel = require('../models/productKey');
const authenticate = require('../middleware/auth');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const router = express.Router();

function buildPaymentReference(orderNumber) {
  return `PAY-${orderNumber}`;
}

async function ensureCartStock(cartItems) {
  for (const item of cartItems) {
    const counts = await productKeyModel.countByProduct(item.product_id);
    if (counts.available < item.quantity) {
      throw new AppError(409, `Stock unavailable for ${item.name}`);
    }
  }
}

// POST /api/payments/initiate
// Creates a pending order that your own payment system can settle later.
router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const cartItems = await cartModel.findByUserId(req.user.userId);
    if (!cartItems.length) return next(new AppError(400, 'Cart is empty'));

    await ensureCartStock(cartItems);

    const items = cartItems.map(ci => ({
      productId: ci.product_id,
      productName: ci.name,
      quantity: ci.quantity,
      salePrice: ci.sale_price,
      originalPrice: ci.original_price
    }));

    const { orderId, orderNumber } = await orderModel.create({
      userId: req.user.userId,
      items
    });

    const paymentReference = buildPaymentReference(orderNumber);
    await orderModel.attachPaymentReference({
      id: orderId,
      provider: env.payment.provider,
      reference: paymentReference
    });
    await cartModel.clearByUserId(req.user.userId);

    const order = await orderModel.findById(orderId);
    res.status(201).json({
      orderId,
      orderNumber,
      paymentReference,
      total: order.total,
      currency: env.payment.currency,
      status: order.status
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/confirm
// Intended for your payment backend/server only.
router.post('/confirm', async (req, res, next) => {
  try {
    if (!env.payment.confirmSecret) {
      return next(new AppError(503, 'Payment confirmation is not configured'));
    }

    const providedSecret = req.headers['x-payment-secret'];
    if (providedSecret !== env.payment.confirmSecret) {
      return next(new AppError(401, 'Invalid payment confirmation secret'));
    }

    const { paymentReference, orderId, transactionId } = req.body || {};
    if (!paymentReference && !orderId) {
      return next(new AppError(422, 'paymentReference or orderId is required'));
    }

    const paidOrderId = await orderModel.markPaidFromPayment({
      paymentReference,
      orderId,
      transactionId: transactionId || null
    });
    const order = await orderModel.findById(paidOrderId);

    res.json({ ok: true, orderId: paidOrderId, orderNumber: order.order_number, status: order.status });
  } catch (err) {
    if (err.code === 'NO_KEY_AVAILABLE' || err.code === 'ORDER_NOT_FOUND') {
      return next(new AppError(err.code === 'ORDER_NOT_FOUND' ? 404 : 409, err.message));
    }
    next(err);
  }
});

module.exports = router;
