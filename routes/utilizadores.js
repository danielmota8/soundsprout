const express = require('express');
const router = express.Router();
const utilizadorController = require('../controllers/utilizadorController');
const authenticateToken = require('../middleware/auth');

router.post('/seguir', authenticateToken, utilizadorController.seguirUtilizador);

module.exports = router;