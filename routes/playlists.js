const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authenticateToken = require('../middleware/auth');

router.get('/utilizador/:username', playlistController.listarPlaylistsPorUtilizador);
router.get('/:playlist_nome/:playlist_username', playlistController.getPlaylistByName);
router.get('/:playlist_nome/:playlist_username/musicas', playlistController.listarMusicasDaPlaylist);

router.get('/top', playlistController.listarTopPlaylists);
router.post('/', authenticateToken, playlistController.criarPlaylist);
router.post('/adicionar-musica', authenticateToken, playlistController.adicionarMusicaAPlaylist);
router.post('/like', authenticateToken, playlistController.darLikePlaylist);
router.get('/playlists-explore', authenticateToken, playlistController.obterMainPlaylists)

module.exports = router;