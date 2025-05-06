const express = require('express');
const router = express.Router();
const doacaoController = require('../controllers/doacaoController');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, doacaoController.fazerDoacao);
router.get('/:features/:titulo/:musica_username', doacaoController.listarDoacoesPorMusica);

module.exports = router;