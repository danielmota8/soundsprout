const express = require('express');
const router = express.Router();
const musicaController = require('../controllers/musicaController');
const authenticateToken = require('../middleware/auth');

const upload = require('../middleware/upload');

// POST /api/musicas/
// — autentica, faz upload do campo ‘audio’, e depois publica
router.post(
    '/',
    authenticateToken,
    upload.single('audio'),
    musicaController.publicarMusica
);

// GET /api/musicas/stream/:features/:titulo/:username
router.get(
    '/stream/:features/:titulo/:username',
    musicaController.streamMusica
);

router.get('/utilizador/:username', musicaController.listarMusicasPorUtilizador);
router.post('/visualizar', musicaController.incrementarVisualizacoes);
router.post('/like', authenticateToken, musicaController.darLikeMusica);
router.get('/trending', authenticateToken, musicaController.obterMusicasTrending);

module.exports = router;