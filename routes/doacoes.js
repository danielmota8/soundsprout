const express = require('express');
const router = express.Router();
const doacaoController = require('../controllers/doacaoController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, doacaoController.fazerDoacao);
router.get('/:features/:titulo/:musica_username', doacaoController.listarDoacoesPorMusica);

router.get('/given', authenticateToken, doacaoController.listarDoacoesDoadas);
router.get('/received', authenticateToken, doacaoController.listarDoacoesRecebidas);

module.exports = router;