// routes/historico.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { getRecentHistorico } = require('../controllers/historicoController');
const { logHistoricoMusica, logHistoricoPlaylist, logHistoricoUsuario} = require('../queries/queries');

// Exemplo:
// GET /api/historico/:username/musica?limit=20
router.get('/:username/:tipo', authenticateToken, getRecentHistorico);

module.exports = router;
