const pool = require('../config/database');



// Funções para Utilizador
const criarUtilizador = async (username, email, password, premium = false, foto = null) => {
    const query = `
        INSERT INTO Utilizador (username, email, password, premium, foto)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [username, email, password, premium, foto];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const obterUtilizadorPorEmail = async (email) => {
    const query = `
        SELECT * FROM Utilizador
        WHERE email = $1;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
};

const obterUtilizadorPorUsername = async (username) => {
    const query = `
        SELECT * FROM Utilizador
        WHERE username = $1;
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
};

// Funções para Música

// Inserir nova música no banco de dados
const publicarMusica = async (
    features,
    titulo,
    username,
    descricao,
    dataPublicacao,
    tipoFicheiro,
    pathFicheiro,
    video,
    foto
) => {
    const sql = `
    INSERT INTO Musica (
      features, titulo, username,
      descricao, dataPublicacao,
      tipoFicheiro, pathFicheiro,
      video, foto, visualizacoes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
    RETURNING *;
  `;
    const values = [
        features,
        titulo,
        username,
        descricao,
        dataPublicacao,
        tipoFicheiro,
        pathFicheiro,
        video,
        foto
    ];
    const { rows } = await pool.query(sql, values);
    return rows[0];
};

// Obter informação de uma música específica
const obterMusica = async (features, titulo, username) => {
    const sql = `
    SELECT
      features,
      titulo,
      username,
      descricao,
      dataPublicacao,
      tipoFicheiro   AS "tipoFicheiro",
      pathFicheiro   AS "pathFicheiro",
      video,
      foto,
      visualizacoes
    FROM Musica
    WHERE features = $1
      AND titulo = $2
      AND username = $3
  `;
    const { rows } = await pool.query(sql, [features, titulo, username]);
    return rows[0];
};


const associarMusicaACategoria = async (features, titulo, musica_username, nome_categoria) => {
    const query = `
        INSERT INTO Musica_Categoria (features, titulo, musica_username, nome_categoria)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [features, titulo, musica_username, nome_categoria];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const listarMusicasPorUtilizador = async (username) => {
    const query = `
        SELECT * FROM Musica
        WHERE username = $1
        ORDER BY dataPublicacao DESC;
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
};

async function getTopArtists(limit = null) {
    let query = `
    SELECT 
      u.username,
      u.foto,
      SUM(m.visualizacoes) AS totalviews
    FROM Musica m
    JOIN Utilizador u
      ON m.username = u.username
    GROUP BY u.username, u.foto
    ORDER BY totalviews DESC
  `;
    const values = [];

    if (limit) {
        query += ` LIMIT $1`;
        values.push(limit);
    }

    const { rows } = await pool.query(query, values);
    return rows; // array de objetos { username, foto, totalviews }
}

const incrementarVisualizacoesMusica = async (features, titulo, musica_username) => {
    const query = `
        UPDATE Musica
        SET visualizacoes = visualizacoes + 1
        WHERE features = $1 AND titulo = $2 AND username = $3
        RETURNING *;
    `;
    const result = await pool.query(query, [features, titulo, musica_username]);
    return result.rows[0];
};

// Funções para Playlist
const criarPlaylist = async (nome, username, dataCriacao, privacidade, onlyPremium, foto) => {
    const query = `
        INSERT INTO Playlist (nome, username, dataCriacao, privacidade, onlyPremium, foto)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const values = [nome, username, dataCriacao, privacidade, onlyPremium, foto];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const adicionarMusicaAPlaylist = async (playlist_nome, playlist_username, features, titulo, musica_username) => {
    const query = `
        INSERT INTO Playlist_Musica (playlist_nome, playlist_username, features, titulo, musica_username)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [playlist_nome, playlist_username, features, titulo, musica_username];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const listarPlaylistsPorUtilizador = async (username) => {
    const query = `
        SELECT * FROM Playlist
        WHERE username = $1
        ORDER BY dataCriacao DESC;
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
};

const listarMusicasDaPlaylist = async (playlist_nome, playlist_username) => {
    const query = `
        SELECT m.*
        FROM Musica m
        JOIN Playlist_Musica pm ON m.features = pm.features AND m.titulo = pm.titulo AND m.username = pm.musica_username
        WHERE pm.playlist_nome = $1 AND pm.playlist_username = $2;
    `;
    const result = await pool.query(query, [playlist_nome, playlist_username]);
    return result.rows;
};

// Funções para Doação
const fazerDoacao = async (doador_username, features, titulo, musica_username, valor, data) => {
    const query = `
        INSERT INTO Doacao (doador_username, musica_username, features, titulo, valor, data)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const values = [doador_username, musica_username, features, titulo, valor, data];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const listarDoacoesPorMusica = async (features, titulo, musica_username) => {
    const query = `
        SELECT * FROM Doacao
        WHERE features = $1 AND titulo = $2 AND musica_username = $3
        ORDER BY data DESC;
    `;
    const result = await pool.query(query, [features, titulo, musica_username]);
    return result.rows;
};

// Funções para Comentário
const postarComentario = async (autor_username, features, titulo, musica_username, conteudo, tempoNaMusica, parentId) => {
    const query = `
        INSERT INTO Comentario (comentario_timestamp, autor_username, features, titulo, musica_username, conteudo, tempoNaMusica, parentId)
        VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const values = [autor_username, features, titulo, musica_username, conteudo, tempoNaMusica, parentId];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const verificarCategoria = async (nome_categoria) => {
    const query = `
        SELECT 1
        FROM Categoria
        WHERE nome_categoria = $1;
    `;
    const result = await pool.query(query, [nome_categoria]);
    return result.rows.length > 0;
};

const listarComentariosPorMusica = async (features, titulo, musica_username) => {
    const query = `
        SELECT * FROM Comentario
        WHERE features = $1 AND titulo = $2 AND musica_username = $3
        ORDER BY comentario_timestamp DESC;
    `;
    const values = [features, titulo, musica_username];
    const result = await pool.query(query, values);
    return result.rows;
};

const listarRepliesPorComentario = async (idComentario) => {
    const query = `
        SELECT * FROM Comentario
        WHERE parentId = $1
        ORDER BY comentario_timestamp;
    `;
    const values = [idComentario];
    const result = await pool.query(query, values);
    return result.rows;
};

const apagarComentario = async (idComentario) => {
    const query = `
        DELETE FROM Comentario
        WHERE idcomentario = $1
        RETURNING *;
    `;
    const values = [idComentario];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Funções para Likes
const darLikeMusica = async (username, features, titulo, musica_username) => {
    const query = `
        INSERT INTO Like_Musica (username, features, titulo, musica_username, like_timestamp)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (username, features, titulo, musica_username)
        DO NOTHING
        RETURNING *;
    `;
    const values = [username, features, titulo, musica_username];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const darLikePlaylist = async (username, playlist_nome, playlist_username) => {
    const query = `
        INSERT INTO Like_Playlist (username, playlist_nome, playlist_username, like_timestamp)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (username, playlist_nome, playlist_username)
        DO NOTHING
        RETURNING *;
    `;
    const values = [username, playlist_nome, playlist_username];
    const result = await pool.query(query, values);
    return result.rows[0];
};


// Funções para Recomendações (Músicas Trending)
// to do

// Funções para Seguir Utilizadores
const seguirUtilizador = async (seguidor_username, seguido_username) => {
    const query = `
        INSERT INTO Segue_Utilizador (seguidor_username, seguido_username)
        VALUES ($1, $2)
        ON CONFLICT (seguidor_username, seguido_username)
        DO NOTHING
        RETURNING *;
    `;
    const values = [seguidor_username, seguido_username];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Funções para Notificações
const criarNotificacao = async (dataNotificacao, descricao) => {
    const query = `
        INSERT INTO Notificacao (dataNotificacao, descricao)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const values = [dataNotificacao, descricao];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const enviarNotificacaoParaUtilizador = async (username, id_notificacao) => {
    const query = `
        INSERT INTO Utilizador_Notificacao (username, id_notificacao)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const values = [username, id_notificacao];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const listarNotificacoesPorUtilizador = async (username) => {
    const query = `
        SELECT n.*
        FROM Notificacao n
        JOIN Utilizador_Notificacao un ON n.id_notificacao = un.id_notificacao
        WHERE un.username = $1
        ORDER BY n.dataNotificacao DESC;
    `;
    const result = await pool.query(query, [username]);
    return result.rows;
};

// Funcoes para livestream

const iniciarLive = async (url, criador_username, titulo, dataHora) => {
    const query = `
        INSERT INTO Live (url, criador_username, titulo, dataHora)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [url, criador_username, titulo, dataHora];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const aderirLive = async (username, live_url, live_criador_username) => {
    const query = `
        INSERT INTO Live_Aderir (username, live_url, live_criador_username)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [username, live_url, live_criador_username];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const reagirLive = async (username, live_url, live_criador_username, valor, mensagem) => {
    const query = `
        INSERT INTO Reage_Live (username, live_url, live_criador_username, valor, mensagem)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [username, live_url, live_criador_username, valor, mensagem];
    const result = await pool.query(query, values);
    return result.rows[0];
};


module.exports = {
    criarUtilizador,
    obterUtilizadorPorEmail,
    obterUtilizadorPorUsername,
    obterMusica,
    publicarMusica,
    listarMusicasPorUtilizador,
    associarMusicaACategoria,
    incrementarVisualizacoesMusica,
    criarPlaylist,
    adicionarMusicaAPlaylist,
    listarPlaylistsPorUtilizador,
    getTopArtists,
    listarMusicasDaPlaylist,
    fazerDoacao,
    listarDoacoesPorMusica,
    verificarCategoria,
    postarComentario,
    apagarComentario,
    listarRepliesPorComentario,
    listarComentariosPorMusica,
    darLikeMusica,
    darLikePlaylist,
    seguirUtilizador,
    criarNotificacao,
    enviarNotificacaoParaUtilizador,
    listarNotificacoesPorUtilizador,
    iniciarLive,
    aderirLive,
    reagirLive,
};