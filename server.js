require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
const authRoutes = require('./routes/auth');
const musicaRoutes = require('./routes/musicas');
const playlistRoutes = require('./routes/playlists');
const doacaoRoutes = require('./routes/doacoes');
const comentarioRoutes = require('./routes/comentarios');
const utilizadorRoutes = require('./routes/utilizadores');
const notificacaoRoutes = require('./routes/notificacoes');

app.use('/api/auth', authRoutes);
app.use('/api/musicas', musicaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/doacoes', doacaoRoutes);
app.use('/api/comentarios', comentarioRoutes);
app.use('/api/utilizadores', utilizadorRoutes);
app.use('/api/notificacoes', notificacaoRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('Servidor está a funcionar! 🎶');
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});