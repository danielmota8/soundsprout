const express = require('express')
const router = express.Router()
const authenticateToken = require('../middleware/auth')
const liveController = require('../controllers/liveController')

// Recommended — user segue o criador
router.get('/recommended', authenticateToken, liveController.getRecommendedLives)

// Top — pelos mais vistos
router.get('/top', authenticateToken, liveController.getTopLives)

// Favourites — streams de artistas favoritos
router.get('/favourites', authenticateToken, liveController.getFavouritesArtistsLive)
router.get('/search', authenticateToken, liveController.searchLive);
module.exports = router
