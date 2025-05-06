const queries = require('../queries/queries');

const publicarMusica = async (req, res) => {
    const { features, titulo, descricao, dataPublicacao, tipoFicheiro, pathFicheiro, video, foto, categorias } = req.body;
    const username = req.user.username;
    try {
        const musica = await queries.publicarMusica(
            features,
            titulo,
            username,
            descricao,
            dataPublicacao || new Date(),
            tipoFicheiro,
            pathFicheiro,
            video,
            foto
        );

        if (categorias && categorias.length > 0) {
            for (const categoria of categorias) {
                // Verificar se a categoria existe
                const categoriaExiste = await queries.verificarCategoria(categoria);
                if (!categoriaExiste) {
                    throw new Error(`Categoria "${categoria}" não existe`);
                }
                await queries.associarMusicaACategoria(features, titulo, username, categoria);
            }
        }

        res.status(201).json(musica);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao publicar música' });
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
    listarMusicasPorUtilizador,
    incrementarVisualizacoes,
    darLikeMusica,
    obterMusicasTrending,
};