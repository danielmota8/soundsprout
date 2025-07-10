const queries = require('../queries/queries');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '../uploads/fotos') });

async function updateProfile(req, res) {
    const oldUsername = req.user.username;
    const { username: newUsername } = req.body;
    let targetUsername = oldUsername;

    // 1) Se mudou username, valida unicidade
    if (newUsername && newUsername !== oldUsername) {
        const exists = await queries.obterUtilizadorPorUsername(newUsername);
        if (exists) {
            return res.status(400).json({ error: 'Username já existe' });
        }
        // faz update do username
        await queries.atualizarUsername(oldUsername, newUsername);
        targetUsername = newUsername;
    }

    // 2) Se veio ficheiro de foto, move/renomeia e faz update da coluna foto
    if (req.file) {
        // multer já guardou em uploads/fotos/<filename>
        const fileName = req.file.filename;
        const fotoPath = `/uploads/fotos/${fileName}`;
        await queries.atualizarFoto(targetUsername, fotoPath);
    }

    // 3) Retorna o perfil atualizado
    const updated = await queries.obterUtilizadorPorUsername(targetUsername);
    return res.json({
        username: updated.username,
        email: updated.email,
        premium: updated.premium,
        foto: updated.foto
    });
}

const seguirUtilizador = async (req, res) => {
    const seguido_username = req.body.seguido_username; // Evitando desestruturação
    const seguidor_username = req.user.username;
    try {
        const result = await queries.seguirUtilizador(seguidor_username, seguido_username);
        if (!result) {
            return res.status(400).json({ error: 'Você já segue este utilizador' });
        }

        const notificacao = await queries.criarNotificacao(
            new Date(),
            `${seguidor_username} começou a seguir você`
        );
        await queries.enviarNotificacaoParaUtilizador(seguido_username, notificacao.id_notificacao);

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao seguir utilizador' });
    }
};

async function listarTopArtists(req, res) {
    try {
        // Podes receber, via query string, ?limit=5
        const limitParam = parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;

        const artistas = await queries.getTopArtists(limit);
        // Cada elemento tem username, foto e totalviews
        return res.json(artistas);
    } catch (err) {
        console.error('Erro em listarTopArtists:', err);
        return res.status(500).json({ error: 'Falha ao obter Top Artists.' });
    }
}

async function getProfileStats(req, res) {
    const username = req.params.username;
    try {
        const [playlists, songs, followers, following] = await Promise.all([
            queries.contarPlaylistsPorUtilizador(username),
            queries.contarMusicasPorUtilizador(username),
            queries.contarSeguidores(username),
            queries.contarSeguindo(username),
        ]);
        return res.json({ username, playlists, songs, followers, following });
    } catch (err) {
        console.error('Erro em getProfileStats:', err);
        return res.status(500).json({ error: 'Falha ao obter estatísticas' });
    }
}



module.exports = {
    seguirUtilizador,
    listarTopArtists,
    getProfileStats,
    updateProfile,
};