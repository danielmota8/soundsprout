const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, comentarioController.postarComentario);
router.get('/replies/:idComentario', comentarioController.listarRepliesPorComentario);
router.delete('/:idComentario', authenticateToken, comentarioController.apagarComentario);


// GET /api/comentarios/musica/:id → listar todos os comentários de uma música
router.get('/musica/:id', comentarioController.listarComentariosPorMusica);
module.exports = router;
