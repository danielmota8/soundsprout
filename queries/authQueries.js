const db = require('../config/database');

// Depois de adicionar ao tables.sql, cria estas funções:

async function salvarRefreshToken(username, refreshToken) {
    const sql = `
    INSERT INTO refresh_tokens(username, token)
    VALUES ($1, $2)
    ON CONFLICT (token) DO NOTHING
  `;
    await db.query(sql, [username, refreshToken]);
}

async function obterRefreshToken(token) {
    const { rows } = await db.query(
        'SELECT username FROM refresh_tokens WHERE token = $1',
        [token]
    );
    return rows[0]; // se existir, rows[0].username
}

async function apagarRefreshToken(token) {
    await db.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [token]
    );
}

module.exports = {
    salvarRefreshToken,
    obterRefreshToken,
    apagarRefreshToken,
};
