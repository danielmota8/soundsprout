const queries = require('../queries/queries');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {obterPlaylistsExplore} = require("../queries/queries");
const { logHistoricoPlaylist } = require('../queries/queries');
const { listarPlaylistsPorUtilizadorComStatus } = require('../queries/queries');
const { atualizarMusicasEmPlaylists } = require('../queries/queries');
const coversDir = path.join(__dirname, '../uploads/fotos');
const {getNotOwnedBadgeTiers, upsertBadgeProgress, awardBadgeToUser} = require('../queries/queries');
if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
}

const coverStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, coversDir),
    filename: (_req, file, cb) => {
        const name = `playlist-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, name);
    }
});

const uploadCover = multer({ storage: coverStorage });

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

        void (async () => {
            try {
                const badgeName = 'Curator';
                // tiers ainda não ganhos
                const notOwned = await getNotOwnedBadgeTiers(username, badgeName);
                for (const { badge_tier: tier, threshold } of notOwned) {
                    const newState = await upsertBadgeProgress(username, badgeName, tier);
                    if (newState >= threshold) {
                        await awardBadgeToUser(username, badgeName, tier);
                        await queries.criarNotificacaoParaUser(
                            username,
                            `Parabéns! Conquistaste o badge '${badgeName}' (${tier}).`
                        );
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar progresso/atribuir badge Curator:', err);
            }
        })();

        return res.status(201).json(playlist);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Já existe uma playlist com esse nome' });
        }
        console.error('criarPlaylist error:', err);
        return res.status(500).json({ error: 'Erro ao criar playlist' });
    }
};

const criarPlaylistComCover = async (req, res) => {
    const { nome, dataCriacao, privacidade, onlyPremium } = req.body;
    const username = req.user.username;
    // Multer pôs o ficheiro em req.file
    const fotoPath = req.file
        ? `/uploads/fotos/${req.file.filename}`  // usa a mesma rota estática
        : null;

    try {
        const playlist = await queries.criarPlaylist(
            nome,
            username,
            dataCriacao || new Date(),
            privacidade,
            onlyPremium === 'true',
            fotoPath
        );

        void (async () => {
            try {
                const badgeName = 'Curator';
                const notOwned = await getNotOwnedBadgeTiers(username, badgeName);
                for (const { badge_tier: tier, threshold } of notOwned) {
                    const newState = await upsertBadgeProgress(username, badgeName, tier);
                    if (newState >= threshold) {
                        await awardBadgeToUser(username, badgeName, tier);
                        await queries.criarNotificacaoParaUser(
                            username,
                            `Parabéns! Conquistaste o badge '${badgeName}' (${tier}).`
                        );
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar progresso/atribuir badge Curator:', err);
            }
        })();

        return res.status(201).json(playlist);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Já existe uma playlist com esse nome' });
        }
        console.error('❌ Erro ao criar playlist com capa:', err);
        return res.status(500).json({ error: 'Erro ao criar playlist com capa' });
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
    const { playlist_nome, playlist_username, musica_id } = req.body;
    try {
        // Verificar se o utilizador é o dono da playlist
        if (req.user.username !== playlist_username) {
            return res.status(403).json({ error: 'Apenas o dono da playlist pode adicionar músicas' });
        }

        const result = await queries.adicionarMusicaAPlaylist(
            playlist_nome,
            playlist_username,
            musica_id
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

        void (async () => {
            try {
                const badgeName = 'Appreciator';
                const notOwned = await getNotOwnedBadgeTiers(username, badgeName);
                for (const { badge_tier: tier, threshold } of notOwned) {
                    const newState = await upsertBadgeProgress(username, badgeName, tier);
                    if (newState >= threshold) {
                        await awardBadgeToUser(username, badgeName, tier);
                        await queries.criarNotificacaoParaUser(
                            username,
                            `Parabéns! Conquistaste o badge '${badgeName}' (${tier}).`
                        );
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar progresso/atribuir badge Appreciator:', err);
            }
        })();

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
        const N = 20;
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

        try {
            await logHistoricoPlaylist(
                req.user.username,
                playlist_nome,
                playlist_username
            );
            console.debug(
                `Historico: ${req.user.username} visitou ${playlist_username}/${playlist_nome}`
            );
        } catch (histErr) {
            console.error('Falha ao registar histórico:', histErr);
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

async function listarPlaylistsPorMusica(req, res) {
    const username = req.user.username;          // só vê as suas
    const musicaId = parseInt(req.params.id, 10);
    try {
        const all = await queries.listarPlaylistsPorUtilizador(username);
        const saved  = await queries.listarPlaylistsComMusica(username, musicaId);
        // Marca em cada playlist se já contém a música
        const playlists = all.map(pl => ({
            ...pl,
            hasMusic: saved.some(s => s.nome === pl.nome)
        }));
        return res.json(playlists);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Falha ao carregar playlists' });
    }
}


const listarPlaylistsUsuarioComMusica = async (req, res) => {
    const { username, musicaId } = req.params;
    // só o próprio pode ver as suas playlists
    if (req.user.username !== username) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const pls = await listarPlaylistsPorUtilizadorComStatus(username, parseInt(musicaId,10));
        res.json(pls);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Falha ao listar playlists com status' });
    }
};

async function atualizarMusicas(req, res) {
    const { playlist_username, musica_id, to_add = [], to_remove = [] } = req.body;
    if (req.user.username !== playlist_username)
        return res.status(403).json({ error: 'Só o dono pode alterar' });

    try {
        await atualizarMusicasEmPlaylists(
            playlist_username,
            musica_id,
            to_add,
            to_remove
        );
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Falha ao atualizar playlists' });
    }
}

// verifica se já gostou
async function isPlaylistLiked(req, res) {
    try {
        const u = req.user.username;
        const { playlist_nome, playlist_username } = req.params;
        const liked = await queries.verificarLikePlaylist(u, playlist_nome, playlist_username);
        return res.json({ liked });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao verificar like' });
    }
}

// un-like
async function unlikePlaylist(req, res) {
    try {
        const u = req.user.username;
        const { playlist_nome, playlist_username } = req.params;
        const removed = await queries.removerLikePlaylist(u, playlist_nome, playlist_username);
        return res.json({ removed });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover like' });
    }
}

async function listarBibliotecaPlaylists(req, res) {
    const username = req.user.username;
    try {
        const playlists = await queries.listarPlaylistsComMetadataPorUtilizador(username);
        // devolvemos a lista com todas as props necessárias
        // duration vai ser calculado no cliente, à semelhança do PlaylistPage
        res.json(playlists.map(pl => ({
            nome: pl.nome,
            username: pl.username,
            foto: pl.foto,
            songs: parseInt(pl.total_songs, 10),
            listens: parseInt(pl.total_likes, 10)
        })));
    } catch (err) {
        console.error('Erro em listarBibliotecaPlaylists:', err);
        res.status(500).json({ error: 'Falha ao carregar suas playlists' });
    }
}

module.exports = {
    criarPlaylist,
    criarPlaylistComCover,
    listarTopPlaylists,
    adicionarMusicaAPlaylist,
    listarPlaylistsPorUtilizador,
    listarPlaylistsUsuarioComMusica,
    listarMusicasDaPlaylist,
    darLikePlaylist,
    obterMainPlaylists,
    getPlaylistByName,
    listarPlaylistsPorMusica,
    atualizarMusicas,
    isPlaylistLiked,
    unlikePlaylist,
    listarBibliotecaPlaylists,
    uploadCover,
};