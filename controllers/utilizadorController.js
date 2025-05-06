const queries = require('../queries/queries');

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

module.exports = {
    seguirUtilizador
};