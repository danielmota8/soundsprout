const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacaoController');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, notificacaoController.listarNotificacoesPorUtilizador);

module.exports = router;