const express = require('express');
const router = express.Router();
const utilizadorController = require('../controllers/utilizadorController');
const authenticateToken = require('../middleware/auth');
const { listarTopArtists } = require('../controllers/utilizadorController');

router.post('/seguir', authenticateToken, utilizadorController.seguirUtilizador);
router.get('/top-artists', listarTopArtists);

module.exports = router;