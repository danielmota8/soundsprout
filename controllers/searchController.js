// backend/controllers/searchController.js
const pool = require('../config/database');

exports.searchAll = async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const like = `%${q}%`;

    try {
        // Disparar as três pesquisas em paralelo
        const [musics, playlists, users] = await Promise.all([
            pool.query(
                `SELECT id, titulo AS title, foto 
         FROM Musica 
         WHERE titulo ILIKE $1 
         LIMIT 5`,
                [like]
            ),
            pool.query(
                `SELECT nome AS name, username AS owner, foto 
         FROM Playlist 
         WHERE nome ILIKE $1 
         LIMIT 5`,
                [like]
            ),
            pool.query(
                `SELECT username, foto 
         FROM Utilizador 
         WHERE username ILIKE $1 
         LIMIT 5`,
                [like]
            )
        ]);

        // Normalizar resultados
        const results = [
            ...musics.rows.map(m => ({
                type: 'Song',
                id: m.id,
                title: m.title,
                subtitle: null,
                imageUrl: m.foto || null
            })),
            ...playlists.rows.map(p => ({
                type: 'Playlist',
                id: `${p.owner}/${p.name}`,   // usar “username/nome” para identificar
                title: p.name,
                subtitle: p.owner,
                imageUrl: p.foto || null
            })),
            ...users.rows.map(u => ({
                type: 'User',
                id: u.username,
                title: u.username,
                subtitle: null,
                imageUrl: u.foto || null
            }))
        ];

        res.json(results);
    } catch (err) {
        console.error('Erro em searchAll:', err);
        res.status(500).json({ error: 'Erro a pesquisar' });
    }
};
