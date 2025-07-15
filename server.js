require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Servir ficheiros de música como estáticos
app.use(
    '/uploads/musicas',
    express.static(path.join(__dirname, 'uploads/musicas'))
);

app.use(
    '/uploads/fotos',
    express.static(path.join(__dirname, 'uploads/fotos'))
);

app.use('/api/search', require('./routes/search'));

// Rotas
const authRoutes = require('./routes/auth');
const musicaRoutes = require('./routes/musicas');
const playlistRoutes = require('./routes/playlists');
const doacaoRoutes = require('./routes/doacoes');
const comentarioRoutes = require('./routes/comentarios');
const utilizadorRoutes = require('./routes/utilizadores');
const notificacaoRoutes = require('./routes/notificacoes');
const liveRoutes = require('./routes/lives')

app.use('/api/auth', authRoutes);
app.use('/api/musicas', musicaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/doacoes', doacaoRoutes);
app.use('/api/comentarios', comentarioRoutes);
app.use('/api/utilizadores', utilizadorRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/lives', liveRoutes)

// Rota de teste
app.get('/', (req, res) => {
    res.send('Servidor está a funcionar! 🎶');
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});
