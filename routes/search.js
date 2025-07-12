const express = require('express');
const router  = express.Router();
const authenticateToken = require('../middleware/auth');
const { searchAll } = require('../controllers/searchController');

router.get('/', authenticateToken, searchAll);

module.exports = router;