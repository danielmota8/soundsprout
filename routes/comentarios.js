const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, comentarioController.postarComentario);
router.get('/', comentarioController.listarComentariosPorMusica);
router.get('/replies/:idComentario', comentarioController.listarRepliesPorComentario);
router.delete('/:idComentario', authenticateToken, comentarioController.apagarComentario);

module.exports = router;