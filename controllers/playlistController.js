const queries = require('../queries/queries');

const criarPlaylist = async (req, res) => {
    const { nome, dataCriacao, privacidade, onlyPremium, foto } = req.body;
    const username = req.user.username;
    try {
        const playlist = await queries.criarPlaylist(
            nome,
            username,
            dataCriacao || new Date(),
            privacidade,
            onlyPremium || false,
            foto
        );
        res.status(201).json(playlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar playlist' });
    }
};

const adicionarMusicaAPlaylist = async (req, res) => {
    const { playlist_nome, playlist_username, features, titulo, musica_username } = req.body;
    try {
        // Verificar se o utilizador é o dono da playlist
        if (req.user.username !== playlist_username) {
            return res.status(403).json({ error: 'Apenas o dono da playlist pode adicionar músicas' });
        }

        const result = await queries.adicionarMusicaAPlaylist(
            playlist_nome,
            playlist_username,
            features,
            titulo,
            musica_username
        );
        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao adicionar música à playlist' });
    }
};

const listarPlaylistsPorUtilizador = async (req, res) => {
    const { username } = req.params;
    try {
        const playlists = await queries.listarPlaylistsPorUtilizador(username);
        res.json(playlists);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar playlists' });
    }
};

const listarMusicasDaPlaylist = async (req, res) => {
    const { playlist_nome, playlist_username } = req.params;
    try {
        const musicas = await queries.listarMusicasDaPlaylist(playlist_nome, playlist_username);
        res.json(musicas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar músicas da playlist' });
    }
};

const darLikePlaylist = async (req, res) => {
    const { playlist_nome, playlist_username } = req.body;
    const username = req.user.username;
    try {
        const like = await queries.darLikePlaylist(username, playlist_nome, playlist_username);
        if (!like) {
            return res.status(400).json({ error: 'Você já deu like nesta playlist' });
        }
        res.status(201).json(like);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao dar like na playlist' });
    }
};

module.exports = {
    criarPlaylist,
    adicionarMusicaAPlaylist,
    listarPlaylistsPorUtilizador,
    listarMusicasDaPlaylist,
    darLikePlaylist,
};