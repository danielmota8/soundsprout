const express = require('express');
const router = express.Router();
const musicaController = require('../controllers/musicaController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, musicaController.publicarMusica);
router.get('/utilizador/:username', musicaController.listarMusicasPorUtilizador);
router.post('/visualizar', musicaController.incrementarVisualizacoes);
router.post('/like', authenticateToken, musicaController.darLikeMusica);
router.get('/trending', authenticateToken, musicaController.obterMusicasTrending);

module.exports = router;