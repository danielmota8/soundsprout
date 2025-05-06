const pool = require('../config/database');
const queries = require('../queries/queries');

const postarComentario = async (req, res) => {
    const { features, titulo, musica_username, conteudo, tempoNaMusica, parentId } = req.body;
    const autor_username = req.user.username;
    try {
        const comentario = await queries.postarComentario(
            autor_username,
            features,
            titulo,
            musica_username,
            conteudo,
            tempoNaMusica,
            parentId
        );
        res.status(201).json(comentario);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao comentar música' });
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

const listarComentariosPorMusica = async (req, res) => {
    const { features, titulo, musica_username } = req.query;
    try {
        const comentarios = await queries.listarComentariosPorMusica(features, titulo, musica_username);
        res.json(comentarios);
    } catch (err) {
        console.error(err);
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