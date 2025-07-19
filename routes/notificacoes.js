const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacaoController');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, notificacaoController.listarNotificacoesPorUtilizador);
router.put('/marcar-vistas', authenticateToken, notificacaoController.marcarTodasComoVistas);
router.get('/novas', authenticateToken, notificacaoController.listarNotificacoesNaoVistas);

module.exports = router;