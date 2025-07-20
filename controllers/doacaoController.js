const queries = require('../queries/queries');

const fazerDoacao = async (req, res) => {
    const { features, titulo, musica_username, valor } = req.body;
    const doador_username = req.user.username;
    try {
        const doacao = await queries.fazerDoacao(
            doador_username,
            features,
            titulo,
            musica_username,
            valor,
            new Date()
        );

        const descricao = `💰 ${doador_username} doou ${valor}€ à tua música "${titulo}".`;
        await queries.criarNotificacaoParaUser(musica_username, descricao, 'doacao');

        res.status(201).json(doacao);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao fazer doação' });
    }
};

const listarDoacoesPorMusica = async (req, res) => {
    const { features, titulo, musica_username } = req.params;
    try {
        const doacoes = await queries.listarDoacoesPorMusica(features, titulo, musica_username);
        res.json(doacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar doações' });
    }
};

const listarDoacoesDoadas = async (req, res) => {
    const doador_username = req.user.username;
    try {
        const doacoes = await queries.listarDoacoesPorDoador(doador_username);
        res.json(doacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar doações feitas' });
    }
};

// Nova função para listar doações recebidas
const listarDoacoesRecebidas = async (req, res) => {
    const destinatario_username = req.user.username;
    try {
        const doacoes = await queries.listarDoacoesPorDestinatario(destinatario_username);
        res.json(doacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar doações recebidas' });
    }
};

module.exports = {
    fazerDoacao,
    listarDoacoesPorMusica,

    listarDoacoesDoadas,
    listarDoacoesRecebidas,
};