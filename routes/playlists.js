const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const authenticateToken = require('../middleware/auth');
const { uploadCover }    = require('../controllers/playlistController');

router.get('/utilizador/:username', playlistController.listarPlaylistsPorUtilizador);
router.get('/utilizador/:username/com-musica/:musicaId', authenticateToken, playlistController.listarPlaylistsUsuarioComMusica);
router.get('/:playlist_nome/:playlist_username', authenticateToken, playlistController.getPlaylistByName);
router.get('/:playlist_nome/:playlist_username/musicas', playlistController.listarMusicasDaPlaylist);
router.get('/utilizador/:username/library', authenticateToken, playlistController.listarBibliotecaPlaylists);

router.get('/top', playlistController.listarTopPlaylists);
router.post('/', authenticateToken, playlistController.criarPlaylist);
router.post('/with-cover', authenticateToken, playlistController.uploadCover.single('foto'), playlistController.criarPlaylistComCover);
router.post('/atualizar-musicas', authenticateToken, playlistController.atualizarMusicas);
router.post('/like', authenticateToken, playlistController.darLikePlaylist);
router.get('/:playlist_nome/:playlist_username/is-liked', authenticateToken, playlistController.isPlaylistLiked);
router.delete('/like/:playlist_nome/:playlist_username', authenticateToken, playlistController.unlikePlaylist);
router.get('/playlists-explore', authenticateToken, playlistController.obterMainPlaylists)

module.exports = router;