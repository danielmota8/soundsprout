const queries = require('../queries/queries');

const listarNotificacoesPorUtilizador = async (req, res) => {
    const username = req.user.username;
    try {
        const notificacoes = await queries.listarNotificacoesPorUtilizador(username);
        res.json(notificacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar notificações' });
    }
};

module.exports = {
    listarNotificacoesPorUtilizador,
};