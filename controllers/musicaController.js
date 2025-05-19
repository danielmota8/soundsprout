const fs = require('fs');
const path = require('path');
const queries = require('../queries/queries');

// Publicar música com upload de ficheiro
const publicarMusica = async (req, res) => {
    const {
        features,
        titulo,
        descricao,
        dataPublicacao,
        video,
        foto,
        categorias
    } = req.body;

    // Multer coloca info do ficheiro em req.file
    const tipoFicheiro = req.file ? req.file.mimetype : null;
    const pathFicheiro = req.file ? req.file.filename : null;
    const username = req.user.username;

    try {
        // Criar registo da música
        const musica = await queries.publicarMusica(
            features,
            titulo,
            username,
            descricao || null,
            dataPublicacao || new Date(),
            tipoFicheiro,
            pathFicheiro,
            video || null,
            foto || null
        );

        // Associar categorias se existirem
        if (Array.isArray(categorias) && categorias.length > 0) {
            for (const categoria of categorias) {
                const categoriaExiste = await queries.verificarCategoria(categoria);
                if (!categoriaExiste) {
                    throw new Error(`Categoria "${categoria}" não existe`);
                }
                await queries.associarMusicaACategoria(features, titulo, username, categoria);
            }
        }

        res.status(201).json(musica);
    } catch (err) {
        console.error('Erro ao publicar música:', err);
        res.status(500).json({ error: 'Erro ao publicar música', details: err.message });
    }
};

// Stream de música suportando Range requests
const streamMusica = async (req, res) => {
    const { features, titulo, username } = req.params;
    try {
        const musica = await queries.obterMusica(features, titulo, username);
        console.log('STREAM:', musica, Object.keys(musica));
        if (!musica) {
            return res.status(404).json({ error: 'Música não encontrada' });
        }
// ————— Aqui é que mudámos —————
        // musica.pathFicheiro pode ser:
        //  • um caminho completo: "uploads/musicas/vibe_da_vida.mp3"
        //  • ou apenas o filename: "vibe_da_vida.mp3"
        let filePath;
        if (musica.pathFicheiro.startsWith('uploads/')) {
            // utiliza o caminho tal como está, relativo à raiz do projeto
            filePath = path.join(__dirname, '..', musica.pathFicheiro);
        } else {
            // junta a pasta onde armazenas as musicas
            filePath = path.join(__dirname, '../uploads/musicas', musica.pathFicheiro);
        }
        // ————————————————

        const stat     = fs.statSync(filePath);
        const fileSize = stat.size;
        const range    = req.headers.range;

        if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end   = endStr ? parseInt(endStr, 10) : fileSize - 1;
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

        // sem Range: envia o ficheiro todo
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

const incrementarVisualizacoes = async (req, res) => {
    const { features, titulo, musica_username } = req.body;
    try {
        const musica = await queries.incrementarVisualizacoesMusica(features, titulo, musica_username);
        res.json(musica);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao incrementar visualizações' });
    }
};

const darLikeMusica = async (req, res) => {
    const { features, titulo, musica_username } = req.body;
    const username = req.user.username;
    try {
        const like = await queries.darLikeMusica(username, features, titulo, musica_username);
        if (!like) {
            return res.status(400).json({ error: 'Você já deu like nesta música' });
        }
        res.status(201).json(like);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao dar like na música' });
    }
};

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

module.exports = {
    publicarMusica,
    streamMusica,
    listarMusicasPorUtilizador,
    incrementarVisualizacoes,
    darLikeMusica,
    obterMusicasTrending,
};