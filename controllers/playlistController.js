const queries = require('../queries/queries');
const {obterPlaylistsExplore} = require("../queries/queries");

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

async function listarTopPlaylists(req, res) {
    try {
        const limitParam = parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitParam) && limitParam > 0
            ? limitParam
            : 50;
        const playlists = await queries.getTopPlaylists(limit);
        return res.json(playlists);
    } catch (err) {
        console.error('❌ Erro em listarTopPlaylists:', err);  // <— log completo
        return res.status(500).json({ error: 'Falha ao obter Top Playlists.' });
    }
}


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

// Shuffle Fisher–Yates
function baralharArray(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const obterMainPlaylists = async (req, res) => {
    try {
        const todas = await queries.obterPlaylistsExplore();
        // baralha e devolve apenas as primeiras N
        const N = 8;
        const selecionadas = baralharArray(todas).slice(0, N);
        return res.json(selecionadas);
    } catch (err) {
        console.error('Erro em obterMainPlaylists:', err);
        return res.status(500).json({ error: 'Não foi possível obter Main Playlists' });
    }
};

async function getPlaylistByName(req, res) {
    const { playlist_nome, playlist_username } = req.params;
    try {
        const pl = await queries.obterPlaylist(playlist_nome, playlist_username);
        if (!pl) {
            return res.status(404).json({ error: 'Playlist não encontrada' });
        }
        res.json({
            title: pl.nome,
            owner: pl.username,
            cover: pl.foto,
            type: pl.privacidade === 'publico' ? 'Public' : 'Private',
            listens: parseInt(pl.total_likes, 10),
            songs: parseInt(pl.total_songs, 10),
            // duration: opcional, se quiser adicionar
        });
    } catch (err) {
        console.error('Erro em getPlaylistByName:', err);
        res.status(500).json({ error: 'Erro ao obter playlist' });
    }
}

module.exports = {
    criarPlaylist,
    listarTopPlaylists,
    adicionarMusicaAPlaylist,
    listarPlaylistsPorUtilizador,
    listarMusicasDaPlaylist,
    darLikePlaylist,
    obterMainPlaylists,
    getPlaylistByName,
};