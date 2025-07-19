const queries = require('../queries/queries');


const listarNotificacoesPorUtilizador = async (req, res) => {
    const username = req.user.username;
    try {
        await queries.marcarNotificacoesComoVistas(username); // Marca como vistas
        const notificacoes = await queries.listarNotificacoesPorUtilizador(username);
        res.json(notificacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar notificações' });
    }
};

const marcarTodasComoVistas = async (req, res) => {
    const username = req.user.username;
    try {
        await queries.marcarNotificacoesComoVistas(username);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao marcar notificações como vistas' });
    }
};

const listarNotificacoesNaoVistas = async (req, res) => {
    const username = req.user.username;
    try {
        const notificacoes = await queries.listarNotificacoesPorUtilizadorNaoVistas(username);
        res.json(notificacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar notificações não vistas' });
    }
};


module.exports = {
    listarNotificacoesPorUtilizador,
    marcarTodasComoVistas,
    listarNotificacoesNaoVistas,
};