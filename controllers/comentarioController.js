const pool = require('../config/database');
const queries = require('../queries/queries');

// POST /api/comentarios/
const postarComentario = async (req, res) => {
    const { musica_id, conteudo, tempoNaMusica, parentId } = req.body;
    const autor = req.user.username;
    try {
        const cm = await queries.postarComentario(
            autor,
            musica_id,
            conteudo,
            tempoNaMusica || null,
            parentId || null
        );
        res.status(201).json(cm);
    } catch (err) {
        console.error('Erro ao postar comentário:', err);
        res.status(500).json({ error: 'Erro ao postar comentário' });
    }
};

const apagarComentario = async (req, res) => {
    const { idComentario } = req.params;
    const autor_username = req.user.username;
    try {
        // Verificar se o comentário pertence ao utilizador autenticado
        const comentario = await pool.query(
            'SELECT * FROM Comentario WHERE idComentario = $1 AND autor_username = $2',
            [idComentario, autor_username]
        );
        if (comentario.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para apagar este comentário' });
        }

        const comentarioApagado = await queries.apagarComentario(idComentario);
        res.json({ message: 'Comentário apagado com sucesso', comentario: comentarioApagado });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao apagar comentário' });
    }
};

// GET /api/comentarios/musica/:id
const listarComentariosPorMusica = async (req, res) => {
    const musicaId = req.params.id;
    try {
        const lista = await queries.listarComentariosPorMusica(musicaId);
        res.json(lista);
    } catch (err) {
        console.error('Erro ao listar comentários:', err);
        res.status(500).json({ error: 'Erro ao listar comentários' });
    }
};


const listarRepliesPorComentario = async (req, res) => {
    const { idComentario } = req.params;
    try {
        const replies = await queries.listarRepliesPorComentario(idComentario);
        res.json(replies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar replies' });
    }
};

module.exports = {
    postarComentario,
    listarComentariosPorMusica,
    listarRepliesPorComentario,
    apagarComentario,
};
