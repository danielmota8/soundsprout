const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authenticateToken = require('../middleware/auth');

router.get(
    '/top',
    playlistController.listarTopPlaylists
);

router.post('/', authenticateToken, playlistController.criarPlaylist);
router.post('/adicionar-musica', authenticateToken, playlistController.adicionarMusicaAPlaylist);
router.get('/utilizador/:username', playlistController.listarPlaylistsPorUtilizador);
router.get('/:playlist_nome/:playlist_username/musicas', playlistController.listarMusicasDaPlaylist);
router.post('/like', authenticateToken, playlistController.darLikePlaylist);

module.exports = router;