// controllers/historicoController.js
const { getHistoricoPorTipo } = require('../queries/queries');
const pool = require('../config/database');

async function getRecentHistorico(req, res) {
    try {
        const { username, tipo } = req.params;
        const limit = parseInt(req.query.limit, 10) || 20;

        let data;

        if (tipo === 'musica') {
            // buscamos junto com os metadados da Musica
            const sql = `
            SELECT h.id_musica   AS id,
                   m.titulo      AS titulo,
                   m.username    AS username,
                   h.visited_at  AS visited_at
              FROM Historico h
              JOIN Musica m
                ON h.id_musica = m.id
             WHERE h.username = $1
               AND h.tipo     = 'musica'
             ORDER BY h.visited_at DESC
             LIMIT $2;
          `;
            const { rows } = await pool.query(sql, [username, limit]);
            data = rows.map(r => ({
                id: r.id,
                titulo: r.titulo,
                username: r.username,
                visited_at: r.visited_at
            }));
        }
        else if (tipo === 'usuario') {

            // **ALTERAÇÃO**: buscar também a foto do utilizador
            const sql = `
            SELECT
              h.profile_username AS username,
              u.foto             AS foto,
              h.visited_at
            FROM Historico h
            JOIN Utilizador u
              ON u.username = h.profile_username
            WHERE h.username = $1
              AND h.tipo     = 'usuario'
            ORDER BY h.visited_at DESC
            LIMIT $2;
            `;
            const { rows } = await pool.query(sql, [username, limit]);
            data = rows.map(r => ({
                username:   r.username,
                foto: r.foto,       // **ALTERAÇÃO**: inclui foto na resposta
                visited_at: r.visited_at
            }));

        } else if (tipo === 'playlist') {
            // mantemos o genérico para playlists
            const rows = await getHistoricoPorTipo(username, tipo, limit);
            data = rows.map(r => ({
                nome:       r.playlist_nome,
                owner:      r.playlist_username,
                visited_at: r.visited_at
            }));

        } else {
            return res.status(400).json({ error: 'Tipo inválido' });
        }

        res.json(data);
    } catch (err) {
        console.error('Erro ao obter histórico:', err);
        res.status(500).json({ error: 'Falha ao obter histórico' });
    }
}

module.exports = {
    getRecentHistorico,
};
