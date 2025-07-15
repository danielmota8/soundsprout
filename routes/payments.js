const express = require('express');
const router = express.Router();
const { json } = require('express');
const auth = require('../middleware/auth');
const stripeCtrl = require('../controllers/stripeController');

// cria sessão de Checkout
router.post(
    '/checkout-session',
    json(),
    auth,
    stripeCtrl.createCheckoutSession
);

// webhook (nota: tem de vir **antes** do express.json())
router.post(
    '/webhooks',
    express.raw({ type: 'application/json' }),
    stripeCtrl.handleWebhook
);

module.exports = router;
