const queries = require('../queries/queries');


const getRecommendedLives = async (req, res) => {
    try {
        const lives = await queries.obterLivesRecomendadas(req.user.username)
        res.json(lives)
    } catch (err) {
        console.error('Erro em getRecommended:', err)
        res.status(500).json({ error: 'Não foi possível obter recomendações' })
    }
}

const getTopLives = async (_req, res) => {
    try {
        const lives = await queries.obterLivesTop()
        res.json(lives)
    } catch (err) {
        console.error('Erro em getTop:', err)
        res.status(500).json({ error: 'Não foi possível obter top live streams' })
    }
}

const getFavouritesArtistsLive = async (req, res) => {
    try {
        const lives = await queries.obterLivesFavoritas(req.user.username)
        res.json(lives)
    } catch (err) {
        console.error('Erro em getFavouritesArtistsLive:', err)
        res.status(500).json({ error: 'Não foi possível obter artistas favoritos em livestream' })
    }
}

const searchLive = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
    try {
        const lives = await queries.searchLives(q);
        res.json(lives);
    } catch (err) {
        console.error('Erro em liveController.search:', err);
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports = {
    getRecommendedLives,
    getTopLives,
    getFavouritesArtistsLive,
    searchLive,
}