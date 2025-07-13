const express = require('express');
const router = express.Router();
const utilizadorController = require('../controllers/utilizadorController');

const multer = require('multer');
const path = require('path');

const authenticateToken = require('../middleware/auth');
const { listarTopArtists } = require('../controllers/utilizadorController');

const { updateProfile, uploadProfilePhoto } = require('../controllers/utilizadorController');

router.post('/seguir', authenticateToken, utilizadorController.seguirUtilizador);
router.get('/top-artists', listarTopArtists);
router.get('/:username/stats', utilizadorController.getProfileStats);

router.patch(
    '/:username',
    authenticateToken,
    uploadProfilePhoto,
    updateProfile
);

//aqui
router.get('/favorite-artists', authenticateToken, utilizadorController.obterFavoriteArtists);
router.get(
    '/explore-artists',
    authenticateToken,
    utilizadorController.obterExploreArtists
);

router.get('/settings',   authenticateToken, utilizadorController.getSettings)
router.put('/settings',   authenticateToken, utilizadorController.putSettings)

router.get('/:username/top-artists-month', utilizadorController.topArtistsMonth);
router.get('/:username/top-tracks-month', utilizadorController.topTracksMonth);
router.get('/:username/recent-playlists-month', utilizadorController.recentPlaylistsMonth);
router.get('/:username/recent-songs-month', utilizadorController.recentSongsMonth);
router.get('/:username/followers', utilizadorController.listarSeguidores);
router.get('/:username/following', utilizadorController.listarFollowing);
router.get('/:username/achievements', utilizadorController.listarAchievements);


router.get('/:username', utilizadorController.getUserByUsername);



module.exports = router;