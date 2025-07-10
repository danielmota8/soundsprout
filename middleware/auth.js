// middleware/auth.js
const jwt = require('jsonwebtoken');

// Usa o mesmo secret que o controller de login usa para sign
const accessSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    // Pega o header “Authorization: Bearer <token>”
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verifica com o mesmo secret
    jwt.verify(token, accessSecret, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }
        // Coloca o payload em req.user para os controllers usarem
        req.user = payload;
        next();
    });
}

module.exports = authenticateToken;
