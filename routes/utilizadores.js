const express = require('express');
const router = express.Router();
const utilizadorController = require('../controllers/utilizadorController');

const multer = require('multer');
const path = require('path');

const authenticateToken = require('../middleware/auth');
const { listarTopArtists, updateProfile, uploadProfilePhoto, getUserByUsername, listarAchievements } = require('../controllers/utilizadorController');

router.put('/password', authenticateToken, utilizadorController.changePassword);

router.get('/top-artists', listarTopArtists);
router.get('/favorite-artists', authenticateToken, utilizadorController.obterFavoriteArtists);
router.get('/explore-artists', authenticateToken, utilizadorController.obterExploreArtists);
router.post('/seguir', authenticateToken, utilizadorController.seguirUtilizador);
router.delete('/seguir/:seguido_username', authenticateToken, utilizadorController.deixarDeSeguirUtilizador);
router.get('/:username/stats', utilizadorController.getProfileStats);
router.get('/:username/top-artists-month', utilizadorController.topArtistsMonth);
router.get('/:username/top-tracks-month', utilizadorController.topTracksMonth);
router.get('/:username/recent-playlists-month', utilizadorController.recentPlaylistsMonth);
router.get('/:username/recent-songs-month', utilizadorController.recentSongsMonth);
router.get('/:username/followers', utilizadorController.listarSeguidores);
router.get('/:username/following', utilizadorController.listarFollowing);
router.get('/:username/following-with-status', authenticateToken, utilizadorController.listarFollowingWithStatus);
router.post('/status', authenticateToken, utilizadorController.updateStatus);
router.get('/:username/not-owned-achievements', utilizadorController.listarNotOwnedAchievements);
router.get('/:username/achievements', authenticateToken, listarAchievements);

router.get('/:username/selected-achievements', utilizadorController.listarSelectedAchievements);
router.put('/:username/selected-achievements', authenticateToken, utilizadorController.updateSelectedAchievements);
router.get('/settings',   authenticateToken, utilizadorController.getSettings)
router.put('/settings',   authenticateToken, utilizadorController.putSettings)
router.get('/:username', authenticateToken, getUserByUsername);

router.patch('/:username', authenticateToken, uploadProfilePhoto, updateProfile);

router.get('/:username', utilizadorController.getUserByUsername);

module.exports = router;