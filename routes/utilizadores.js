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

module.exports = router;