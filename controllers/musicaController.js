const fs = require('fs');
const path = require('path');
const queries = require('../queries/queries');

// Publicar música com upload de ficheiro

async function publicarMusica(req, res) {
    try {
        const { titulo, descricao, video, categorias } = req.body;
        const username = req.user.username;

        // ─── ÁUDIO ────────────────────────────────────────────────────
        const audioFile = req.files?.audio?.[0];
        const tipoFicheiro = audioFile
            ? path.extname(audioFile.filename).slice(1)  // "mp3"
            : null;
        const pathFicheiro = audioFile
            ? `uploads/musicas/${audioFile.filename}`
            : null;

        // ─── CAPA ─────────────────────────────────────────────────────
        const fotoFile = req.files?.foto?.[0];
        const foto = fotoFile
            ? `uploads/fotos/${fotoFile.filename}`
            : null;

        // ─── LETRA ────────────────────────────────────────────────────
        let letra = null;
        const lyricFile = req.files?.lyric?.[0];
        if (lyricFile) {
            const lyricsPath = path.join(__dirname, '../uploads/lyrics', lyricFile.filename);
            letra = fs.readFileSync(lyricsPath, 'utf8');
            // se não quiseres guardar o txt, apaga depois de ler:
            //fs.unlinkSync(lyricsPath);
        }

        // ─── INSERÇÃO NA BD ───────────────────────────────────────────
        const musica = await queries.publicarMusica(
            titulo,
            username,
            descricao || null,
            new Date(),
            tipoFicheiro,
            pathFicheiro,
            video || null,
            foto,
            letra            // agora passas a letra para a query
        );

        // ─── CATEGORIAS (opcional) ───────────────────────────────────
        if (Array.isArray(categorias)) {
            for (const cat of categorias) {
                const existe = await queries.verificarCategoria(cat);
                if (!existe) throw new Error(`Categoria "${cat}" não existe`);
                await queries.associarMusicaACategoria(musica.id, cat);
            }
        }

        return res.status(201).json(musica);
    } catch (err) {
        console.error('Erro ao publicar música:', err);
        return res.status(500).json({ error: err.message });
    }
}

// Stream de música suportando Range requests
const streamMusica = async (req, res) => {
    const { id } = req.params;
    try {
        const musica = await queries.obterMusicaById(id);
        if (!musica) {
            return res.status(404).json({ error: 'Música não encontrada' });
        }

        let filePath;
        if (musica.pathFicheiro.startsWith('uploads/')) {
            filePath = path.join(__dirname, '..', musica.pathFicheiro);
        } else {
            filePath = path.join(__dirname, '../uploads/musicas', musica.pathFicheiro);
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const stream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': musica.tipoFicheiro || 'audio/mpeg'
            });
            return stream.pipe(res);
        }

        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': musica.tipoFicheiro || 'audio/mpeg'
        });
        fs.createReadStream(filePath).pipe(res);

    } catch (err) {
        console.error('Erro ao fazer stream de música:', err);
        res.status(500).json({ error: 'Erro ao transmitir música', details: err.message });
    }
};

const registarView = async (req, res) => {
    const { musica_id } = req.body;
    const username = req.user?.username || null;
    try {
        const atualizado = await queries.registarVisualizacao(musica_id, username);
        // devolvemos status 204 (sem conteúdo) ou o novo contador
        return res.status(200).json({ visualizacoes: atualizado.visualizacoes });
    } catch (err) {
        console.error('Erro ao registar visualização:', err);
        return res.status(500).json({ error: 'Erro ao registar visualização' });
    }
};

const listarMusicasPorUtilizador = async (req, res) => {
    const { username } = req.params;
    try {
        const musicas = await queries.listarMusicasPorUtilizador(username);
        res.json(musicas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar músicas' });
    }
};

const darLikeMusica = async (req, res) => {
    const { id } = req.body;
    const username = req.user.username;
    try {
        const like = await queries.darLikeMusica(username, id);
        if (!like) {
            return res.status(400).json({ error: 'Você já deu like nesta música' });
        }
        res.status(201).json(like);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao dar like na música' });
    }
};

// nao esta implementado
const obterMusicasTrending = async (req, res) => {
    const username = req.user.username;
    try {
        const musicas = await queries.obterMusicasTrending(username);
        res.json(musicas);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao obter músicas trending' });
    }
};

const obterMusicasRecomendadas = async (req, res) => {
    const username = req.user.username;
    try {
        // lista de categorias favoritas do utilizador - contagem de músicas por categoria
        const catCounts = await queries.obterCategoriasFavoritas(username);
        //console.log('Categorias do user:', catCounts);
        const nomes = catCounts.map(r => r.nome_categoria).slice(0, 3);

        let musicas;
        if (nomes.length >= 2) {
            musicas = await queries.obterMusicasPorCategorias(nomes, 8);
        }
        if (!musicas || musicas.length === 0) {
            // Fallback robusto, mesmo que o branch anterior falhe ou não devolva nada
            musicas = await queries.obterMusicasAleatorias(8);
        }

        return res.json(musicas);
    } catch (err) {
        //console.error('Erro em obterMusicasRecomendadas:', err.message, err.stack);
        return res.status(500).json({ error: err.message });
    }
};


const obterDiscoverMusics = async (req, res) => {
    const username = req.user.username;
    const DAYS_AGO = 7;          // últimos 7 dias
    try {
        const musicas = await queries.obterMusicasDiscover(username, DAYS_AGO);
        return res.json(musicas);
    } catch (err) {
        console.error('Erro em obterDiscoverMusics:', err);
        return res.status(500).json({ error: 'Não foi possível obter Discover Musics' });
    }
};

const obterPlaylistsPorGenero = async (req, res) => {
    try {
        // busca flat: cada linha = [categoria, música]
        const rows = await queries.obterCategoriasComMusicas();

        // agrupa em objectos { genre, songs: […] }
        const map = {};
        for (const r of rows) {
            const genre = r.nome_categoria;
            if (!map[genre]) {
                map[genre] = [];
            }
            // se não houver música (LEFT JOIN), r.musica_id será null
            if (r.musica_id) {
                map[genre].push({
                    id:             r.musica_id,
                    titulo:         r.titulo,
                    artista:        r.artista,
                    capa:           r.capa,
                    dataPublicacao: r.dataPublicacao,
                });
            }
        }

        // transforma em array para resposta
        const result = Object.entries(map).map(([genre, songs]) => ({
            genre,
            songs
        }));

        return res.json(result);
    } catch (err) {
        console.error('Erro em obterPlaylistsPorGenero:', err);
        return res.status(500).json({ error: 'Não foi possível obter playlists por género' });
    }
};

async function getMusicDetails(req, res) {
    try {
        const { id } = req.params;
        const musica = await queries.obterMusicaById(id);
        if (!musica) return res.status(404).json({ error: 'Música não encontrada' });
        res.json(musica);
    } catch (err) {
        console.error('Erro em getMusicDetails:', err);
        res.status(500).json({ error: 'Erro ao obter detalhes da música' });
    }
}

async function getSimilarMusicas(req, res) {
    try {
        const { id } = req.params;
        const musica = await queries.obterMusicaById(id);
        if (!musica) return res.status(404).json({ error: 'Música não encontrada' });

        // busca categorias desta música
        const categorias = await queries.obterCategoriasPorMusica(id);

        // busca até 12 músicas que ou sejam do mesmo autor, ou partilhem alguma categoria
        const similares = await queries.obterMusicasSemelhantes(
            id,
            musica.username,
            categorias,
            12
        );
        return res.json(similares);
    } catch (err) {
        console.error('Erro em getSimilarMusicas:', err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    publicarMusica,
    streamMusica,
    registarView,
    listarMusicasPorUtilizador,
    darLikeMusica,
    obterMusicasTrending,

    obterMusicasRecomendadas,
    obterDiscoverMusics,
    obterPlaylistsPorGenero,

    getMusicDetails,
    getSimilarMusicas,
};