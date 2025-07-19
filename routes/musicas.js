const express = require('express');
const router = express.Router();
const musicaController = require('../controllers/musicaController');
const authenticateToken = require('../middleware/auth');

const upload = require('../middleware/upload');
const multer = require("multer");
// para a letra em memória
const uploadLyric = multer({ storage: multer.memoryStorage() });
const { listarMusicasPorGeneroEspecifico } = require('../controllers/musicaController');

router.get('/stream/:id', musicaController.streamMusica);

// POST /api/musicas/
// — autentica, faz upload do campo ‘audio’, e depois publica
router.post(
    '/',
    authenticateToken,
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'foto',  maxCount: 1 },
        { name: 'lyric', maxCount: 1 }
    ]),
    musicaController.publicarMusica
);
router.get('/recommended', authenticateToken, musicaController.obterMusicasRecomendadas);
// GET /api/musicas/stream/:features/:titulo/:username
router.get('/stream/:id', musicaController.streamMusica);
router.post('/visualizar', authenticateToken, musicaController.registarView);
router.get('/:id/is-liked', authenticateToken, musicaController.isMusicLiked);
router.post('/like', authenticateToken, musicaController.darLikeMusica);
router.delete('/like/:id', authenticateToken, musicaController.unlikeMusic);
router.get('/trending', authenticateToken, musicaController.obterMusicasTrending);
router.get('/discover', authenticateToken, musicaController.obterDiscoverMusics);
// GET /api/musicas/genres-playlists
router.get('/genres-playlists', authenticateToken, musicaController.obterPlaylistsPorGenero);
router.get('/genres/:genre', authenticateToken, listarMusicasPorGeneroEspecifico);
router.get('/:id/similar', musicaController.getSimilarMusicas);
router.get('/utilizador/:username', musicaController.listarMusicasPorUtilizador);
router.get('/:id', authenticateToken, musicaController.getMusicDetails);

module.exports = router;