const jwt = require('jsonwebtoken');
const queries = require('../queries/queries');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { logHistoricoUsuario } = require('../queries/queries');

const fotosDir = path.join(__dirname, '../uploads/fotos');
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir, { recursive: true });
}

// --- Configuração Multer com diskStorage para manter extensão ---
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fotosDir),
    filename:    (_req, file, cb) => {
        // foto-<timestamp>.<ext>
        const uniqueName = `foto-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

async function updateProfile(req, res) {
    try {
        const authUsername = req.user.username;
        const { username: newUsername } = req.body;
        let targetUsername = authUsername;

        // 1) troca de username
        if (newUsername && newUsername !== authUsername) {
            const exists = await queries.obterUtilizadorPorUsername(newUsername);
            if (exists) return res.status(400).json({ error: 'Username já existe' });
            await queries.atualizarUsername(authUsername, newUsername);
            targetUsername = newUsername;
        }

        // 2) Se veio ficheiro de foto, grava-o (com extensão), apaga o antigo e atualiza DB
        let oldFotoPath;
        if (req.file) {
            // obter o caminho da foto antiga antes de sobrescrever
            const before = await queries.obterUtilizadorPorUsername(targetUsername);
            oldFotoPath = before.foto; // ex: "/uploads/fotos/foto-123.png"
            console.log('[DEBUG] oldFotoPath from DB:', oldFotoPath);

            // gravar a nova
            const newFotoPath = `/uploads/fotos/${req.file.filename}`;
            await queries.atualizarFoto(targetUsername, newFotoPath);

            // apagar o ficheiro antigo
            if (oldFotoPath) {

                const allFiles = fs.readdirSync(fotosDir);

                if (oldFotoPath) {
                    // retira leading slash para o path.join funcionar corretamente
                    const filename = path.basename(oldFotoPath);
                    const fullOldPath = path.resolve(fotosDir, filename);

                    try {
                        if (fs.existsSync(fullOldPath)) {
                            fs.unlinkSync(fullOldPath);
                            console.log('Foto antiga apagada:', fullOldPath);
                        } else {
                            console.warn('Foto antiga não encontrada para apagar:', fullOldPath);
                        }
                    } catch (unlinkErr) {
                        console.error('Erro ao apagar foto antiga:', fullOldPath, unlinkErr);
                    }
                }
            }
        }

        // 3) busca o utilizador atualizado
        const updated = await queries.obterUtilizadorPorUsername(targetUsername);
        if (!updated) throw new Error('Utilizador não encontrado após a atualização');

        // 4) gera novo access token
        const accessToken = jwt.sign(
            { username: updated.username },
            process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // 5) devolve user + token
        return res.json({
            user: {
                username: updated.username,
                email: updated.email,
                premium: updated.premium,
                foto: updated.foto
            },
            accessToken
        });
    } catch (err) {
        console.error('💥 Erro em updateProfile:', err);
        return res.status(500).json({ error: 'Falha ao atualizar perfil' });
    }
}

const seguirUtilizador = async (req, res) => {
    const seguido_username = req.body.seguido_username;
    const seguidor_username = req.user.username;
    try {
        const result = await queries.seguirUtilizador(seguidor_username, seguido_username);
        if (!result) {
            return res.status(400).json({ error: 'Você já segue este utilizador' });
        }

        //Criar notificação para o seguido

        if (seguido_username !== seguidor_username) {
            const descricao = `${seguidor_username} começou a seguir-te.`;
            await queries.criarNotificacaoParaUser(seguido_username, descricao, 'follow');
        }

        void (async () => {
            try {
                const badgeName = 'Follower';
                const notOwned = await queries.getNotOwnedBadgeTiers(seguidor_username, badgeName);
                for (const { badge_tier: tier, threshold } of notOwned) {
                    const newState = await queries.upsertBadgeProgress(seguidor_username, badgeName, tier);
                    if (newState >= threshold) {
                        await queries.awardBadgeToUser(seguidor_username, badgeName, tier);
                        await queries.criarNotificacaoParaUser(
                            seguidor_username,
                            `Parabéns! Conquistaste o badge '${badgeName}' (${tier}).`
                        );
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar progresso/atribuir badge Follower:', err);
            }
        })();

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

const obterFavoriteArtists = async (req, res) => {
    const username = req.user.username;
    try {
        const artists = await queries.obterArtistasFavoritos(username);
        // só mostramos se o user tiver gostado de >= 3 artistas
        if (artists.length < 3) {
            return res.json([]);        // seção fica oculta no frontend
        }
        // devolve array de { artist_username, artist_foto, likes_count }
        return res.json(artists);
    } catch (err) {
        console.error('Erro ao obter artistas favoritos:', err);
        return res.status(500).json({ error: 'Não foi possível obter artistas favoritos' });
    }
};

const obterExploreArtists = async (req, res) => {
    const username = req.user.username;
    const LIMIT = 20;  // quantos artistas mostrar
    try {
        const artists = await queries.obterArtistasExplore(username, LIMIT);
        return res.json(artists);
    } catch (err) {
        console.error('Erro em obterExploreArtists:', err);
        return res.status(500).json({ error: 'Não foi possível obter artistas para explorar' });
    }
};


const getSettings = async (req, res) => {
    try {
        const s = await queries.obterSettings(req.user.username);
        // Se não existir ainda, criar registo com defaults?
        if (!s) {
            // opcional: inserir linha default aqui…
            return res.json({
                linguagem: 'pt',
                tema: 'day',
                autoplay: false,
                playlists_ativas: true,
                compartilhar_atividade: false,
                mostrar_artistas_recentemente: false,
                mostrar_listas_publicas: false
            });
        }
        res.json(s);
    } catch (err) {
        console.error('Erro ao obter settings:', err);
        res.status(500).json({ error: 'Não foi possível obter settings' });
    }
};

const putSettings = async (req, res) => {
    try {
        // mapeia frontend → colunas SQL
        const body = req.body;
        const allowed = {
            linguagem:                   'linguagem',
            isDarkMode:                  'tema',                       // true→'night', false→'day'
            isAutoplayOn:                'autoplay',
            isPublishPlaylistsProfileOn: 'playlists_ativas',
            isShareListeningActivityOn:  'compartilhar_atividade',
            isShowRecentArtistsOn:       'mostrar_artistas_recentemente',
            isFollowerAndFollowingOn:    'mostrar_listas_publicas'
        };
        const fields = {};
        for (const [k, col] of Object.entries(allowed)) {
            if (body[k] !== undefined) {
                // special case tema
                if (k === 'isDarkMode') fields[col] = body[k] ? 'night' : 'day';
                else fields[col] = body[k];
            }
        }
        if (body.selectedLanguage) {
            // map e.g. 'English' → 'en', 'Português'→'pt', etc.
            const mapLang = { English:'en', Español:'es', Français:'fr', Deutsch:'de', Italiano:'it', Português:'pt' };
            fields['linguagem'] = mapLang[body.selectedLanguage];
        }
        const updated = await queries.atualizarSettings(req.user.username, fields);
        res.json(updated);
    } catch (err) {
        console.error('Erro ao atualizar settings:', err);
        res.status(500).json({ error: 'Não foi possível atualizar settings' });
    }
};

async function topArtistsMonth(req, res) {
    try {
        const username = req.params.username;
        const limit    = parseInt(req.query.limit, 10) || null;
        // primeiro dia do mês atual:
        const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const artists = await queries.getTopArtistsForUser(username, since, limit);
        return res.json(artists);
    } catch (err) {
        console.error('Erro em topArtistsMonth:', err);
        return res.status(500).json({ error: 'Falha ao obter Top Artists deste mês.' });
    }
}

async function topTracksMonth(req, res) {
    try {
        const username = req.params.username;
        const limitParam = parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;
        // primeiro dia do mês atual
        const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const tracks = await queries.getTopTracksForUser(username, since, limit);
        return res.json(tracks);
    } catch (err) {
        console.error('Erro em topTracksMonth:', err);
        return res.status(500).json({ error: 'Falha ao obter Top Tracks deste mês.' });
    }
}

async function recentPlaylistsMonth(req, res) {
    try {
        const username   = req.params.username;
        const limitParam = parseInt(req.query.limit, 10);
        const limit      = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;

        const playlists = await queries.getRecentlyLikedPlaylistsForUser(username, limit);
        return res.json(playlists);
    } catch (err) {
        console.error('Erro em recentPlaylistsMonth:', err);
        return res.status(500).json({ error: 'Falha ao obter Playlists gostadas recentemente.' });
    }
}

async function recentSongsMonth(req, res) {
    try {
        const username   = req.params.username;
        const limitParam = parseInt(req.query.limit, 10);
        const limit      = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;
        const songs = await queries.getRecentlyLikedSongsForUser(username, limit);
        return res.json(songs);
    } catch (err) {
        console.error('Erro em recentSongsMonth:', err);
        return res.status(500).json({ error: 'Falha ao obter músicas gostadas recentemente.' });
    }
}

async function listarSeguidores(req, res) {                                    // CHANGED
    try {
        const username   = req.params.username;
        const limitParam = parseInt(req.query.limit, 10);
        const limit      = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;

        const seguidores = await queries.getFollowersForUser(username, limit);
        return res.json(seguidores);
    } catch (err) {
        console.error('Erro em listarSeguidores:', err);
        return res.status(500).json({ error: 'Falha ao obter seguidores.' });
    }
}

async function listarFollowing(req, res) {           // ← ALTERAÇÃO
    try {
        const username = req.params.username;
        const limitParam = parseInt(req.query.limit, 10);
        const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : null;
        const following = await queries.getFollowingForUser(username, limit);
        return res.json(following);
    } catch (err) {
        console.error('Erro em listarFollowing:', err);
        return res.status(500).json({ error: 'Falha ao obter following.' });
    }
}

async function listarAchievements(req, res) {
      try {
            const username = req.params.username;

          if (req.user && req.user.username !== username) {
              try {
                  await logHistoricoUsuario(req.user.username, username); // ⬅ Alteração
                  console.debug(`Historico: ${req.user.username} visitou achievements de ${username}`);
              } catch (err) {
                  console.error('Falha ao registar histórico de achievements:', err);
              }
          }
          const badges = await queries.getBadgesForUser(username);
          return res.json(badges);
      } catch (err) {
          console.error('Erro em listarAchievements:', err);
          return res.status(500).json({ error: 'Falha ao obter achievements.' });
      }
}

async function getUserByUsername(req, res) {
    try {
        const username = req.params.username;
        const u = await queries.obterUtilizadorPorUsername(username);
        if (!u) return res.status(404).json({ error: 'Utilizador não encontrado' });

        if (req.user && req.user.username !== username) {
            try {
                await logHistoricoUsuario(req.user.username, username); // ⬅ Alteração
                console.debug(`Historico: ${req.user.username} visitou perfil ${username}`);
            } catch (err) {
                console.error('Falha ao registar histórico de perfil:', err);
            }
        }

        // só devolvemos o que é público
        return res.json({
            username: u.username,
            foto:     u.foto,
            premium:  u.premium,
            email:    u.email
        });
    } catch (err) {
        console.error('Erro em getUserByUsername:', err);
        return res.status(500).json({ error: 'Falha ao obter utilizador' });
    }
}

async function listarSelectedAchievements(req, res) {
    try {
        const username = req.params.username;
        const rows = await queries.getSelectedBadges(username);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Falha ao obter selected badges' });
    }
}

// PUT atualiza os 3 selecionados (só o próprio user)
async function updateSelectedAchievements(req, res) {
    try {
        const authUser = req.user.username;
        const { username } = req.params;
        if (authUser !== username) return res.status(403).json({ error: 'Forbidden' });

        const { selected } = req.body;
        if (!Array.isArray(selected) || selected.length > 3) {
            return res.status(400).json({ error: 'Invalid payload' });
        }
        await queries.setSelectedBadges(username, selected);
        return res.status(204).send();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao atualizar selected badges' });
    }
}

async function listarNotOwnedAchievements(req, res) {
    try {
        const username = req.params.username;
        const badges = await queries.getNotOwnedBadgesForUser(username);
        return res.json(badges);
    } catch (err) {
        console.error('Erro em listarNotOwnedAchievements:', err);
        return res.status(500).json({ error: 'Falha ao obter Not Owned Achievements.' });
    }
}

async function deixarDeSeguirUtilizador(req, res) {
    const seguidor_username = req.user.username;
    const { seguido_username } = req.params;

    console.log('[DEBUG][Unfollow] seguidor:', seguidor_username, 'seguido:', seguido_username);

    try {
        const result = await queries.unfollowUtilizador(seguidor_username, seguido_username);

        console.log('[DEBUG][Unfollow] query result:', result);

        if (!result) {
            // Vai mostrar no cliente o erro 404 para sabermos que não bateu com nada
            return res.status(404).json({ error: 'Nenhum registo para apagar' });
        }

        return res.status(204).send();
    } catch (err) {
        console.error('Erro em deixarDeSeguirUtilizador:', err);
        return res.status(500).json({ error: 'Erro ao deixar de seguir utilizador' });
    }
}

async function updateStatus(req, res) {
    const username = req.user.username;
    const { current_musica_id, is_listening } = req.body;
    try {
        await queries.upsertUserStatus(username, current_musica_id, is_listening);
        res.status(204).end();
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        res.status(500).json({ error: 'Não foi possível atualizar status' });
    }
}

async function listarFollowingWithStatus(req, res) {
    const follower = req.user.username;
    try {
        const list = await queries.getFollowingWithStatus(follower);
        // para cada um, carregamos as playlists públicas
        const enriched = await Promise.all(list.map(async u => {
            const pls = await queries.listarPlaylistsPorUtilizador(u.username);
            return {
                ...u,
                playlists: pls.filter(pl => pl.privacidade?.toLowerCase()==='publico')
            };
        }));
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Falha ao obter following com status' });
    }
}

module.exports = {
    uploadProfilePhoto: upload.single('foto'),
    updateProfile,
    seguirUtilizador,
    deixarDeSeguirUtilizador,
    listarTopArtists,
    getProfileStats,

    obterFavoriteArtists,
    obterExploreArtists,
    getSettings,
    putSettings,

    topArtistsMonth,
    topTracksMonth,
    recentPlaylistsMonth,
    recentSongsMonth,
    listarSeguidores,
    listarFollowing,
    listarAchievements,
    getUserByUsername,

    listarSelectedAchievements,
    updateSelectedAchievements,
    listarNotOwnedAchievements,

    updateStatus,
    listarFollowingWithStatus,
};