const jwt = require('jsonwebtoken');
const queries = require('../queries/queries');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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
    uploadProfilePhoto: upload.single('foto'),
    updateProfile,
    seguirUtilizador,
    listarTopArtists,
    getProfileStats,
};