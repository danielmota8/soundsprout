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

// 1. Guardar token e expiração
async function setResetToken(usernameOrEmail, token, expires) {
    const query = `
    UPDATE Utilizador
    SET resetPasswordToken = $1,
        resetPasswordExpires = $2
    WHERE username = $3 OR email = $3
    RETURNING *;
  `;
    const values = [token, expires, usernameOrEmail];
    const result = await db.query(query, values);
    return result.rows[0];
}

// 2. Obter utilizador por token (e que não esteja expirado)
async function getUserByResetToken(token) {
    const query = `
    SELECT * FROM Utilizador
    WHERE resetPasswordToken = $1
      AND resetPasswordExpires > NOW();
  `;
    const values = [token];
    const result = await db.query(query, values);
    return result.rows[0];
}

// 3. Atualizar a nova password e limpar o token
async function updatePasswordWithToken(username, newHashedPassword) {
    const query = `
        UPDATE Utilizador
        SET password = $1,
            resetPasswordToken = NULL,
            resetPasswordExpires = NULL
        WHERE username = $2
        RETURNING *;
    `;
    const values = [newHashedPassword, username];
    const result = await db.query(query, values);
    return result.rows[0];
}


module.exports = {
    salvarRefreshToken,
    obterRefreshToken,
    apagarRefreshToken,
    setResetToken,
    getUserByResetToken,
    updatePasswordWithToken,
};
