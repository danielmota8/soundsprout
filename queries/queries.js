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
    titulo,
    username,
    descricao,
    dataPublicacao,
    tipoFicheiro,
    pathFicheiro,
    video,
    foto,
    letra
) => {
    const sql = `
        INSERT INTO Musica (
            titulo, username,
            descricao, dataPublicacao,
            tipoFicheiro, pathFicheiro,
            video, foto, letra, visualizacoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
            RETURNING *;
    `;
    const values = [
        titulo,
        username,
        descricao,
        dataPublicacao,
        tipoFicheiro,
        pathFicheiro,
        video,
        foto,
        letra
    ];
    const { rows } = await pool.query(sql, values);
    return rows[0];
};


// Obter informação de uma música específica
const obterMusicaById = async (id) => {
    const sql = `
        SELECT
            id,
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
        WHERE id = $1
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0];
};



const associarMusicaACategoria = async (musicaId, nomeCategoria) => {
    const query = `
        INSERT INTO Musica_Categoria (musica_id, nome_categoria)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const result = await pool.query(query, [musicaId, nomeCategoria]);
    return result.rows[0];
};

const listarMusicasPorUtilizador = async (username) => {
    const sql = `
        SELECT * FROM Musica
        WHERE username = $1
        ORDER BY dataPublicacao DESC
    `;
    const { rows } = await pool.query(sql, [username]);
    return rows;
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

// Regista uma nova visualização e incrementa o contador agregado
async function registarVisualizacao(musicaId, username) {
    // 1) Insere na tabela detalhada
    await pool.query(
        `INSERT INTO Visualizacao (musica_id, view_username)
     VALUES ($1, $2)`,
        [musicaId, username]
    );
    // 2) Incrementa o campo agregado em Musica
    const result = await pool.query(
        `UPDATE Musica
     SET visualizacoes = visualizacoes + 1
     WHERE id = $1
     RETURNING visualizacoes`,
        [musicaId]
    );
    return result.rows[0]; // devolve o novo visualizacoes se precisares
}

const incrementarVisualizacoesMusica = async (id) => {
    const query = `
        UPDATE Musica
        SET visualizacoes = visualizacoes + 1
        WHERE id = $1
        RETURNING *;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};
// Funções para Playlist

async function getTopPlaylists(limit = 50) {
    const query = `
        SELECT
            p.nome,
            p.username,
            p.foto,
            COUNT(lp.username) AS total_likes
        FROM playlist p
                 LEFT JOIN like_playlist lp
                           ON p.nome             = lp.playlist_nome
                               AND p.username         = lp.playlist_username
        GROUP BY p.nome, p.username, p.foto
        ORDER BY total_likes DESC
        LIMIT $1
    `;
    const { rows } = await pool.query(query, [limit]);
    return rows;
}

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


const adicionarMusicaAPlaylist = async (playlist_nome, playlist_username, musica_id) => {
    const query = `
        INSERT INTO Playlist_Musica (playlist_nome, playlist_username, musica_id)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [playlist_nome, playlist_username, musica_id];
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
                 JOIN Playlist_Musica pm
                      ON m.id = pm.musica_id
        WHERE pm.playlist_nome    = $1
          AND pm.playlist_username = $2
    `;
    const result = await pool.query(query, [playlist_nome, playlist_username]);
    return result.rows;
};
// Funções para Doação
const fazerDoacao = async (doador_username, musica_id, valor, data) => {
    const query = `
        INSERT INTO Doacao (doador_username, musica_id, valor, data)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const values = [doador_username, musica_id, valor, data];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const listarDoacoesPorMusica = async (musica_id) => {
    const query = `
        SELECT *
        FROM Doacao
        WHERE musica_id = $1
        ORDER BY data DESC;
    `;
    const result = await pool.query(query, [musica_id]);
    return result.rows;
};
// Funções para Comentário
const postarComentario = async (
    autor_username,
    musica_id,
    conteudo,
    tempoNaMusica,
    parentId  // pode ser NULL
) => {
    const query = `
        INSERT INTO Comentario
        (comentario_timestamp, autor_username, musica_id, conteudo, tempoNaMusica, parentId)
        VALUES
            (NOW(), $1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [autor_username, musica_id, conteudo, tempoNaMusica, parentId];
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

const listarComentariosPorMusica = async (musica_id) => {
    const query = `
        SELECT *
        FROM Comentario
        WHERE musica_id = $1
        ORDER BY comentario_timestamp DESC;
    `;
    const result = await pool.query(query, [musica_id]);
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
const darLikeMusica = async (username, musicaId) => {
    const query = `
        INSERT INTO Like_Musica (username, musica_id, like_timestamp)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (username, musica_id) DO NOTHING
        RETURNING *;
    `;
    const values = [username, musicaId];
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

const contarPlaylistsPorUtilizador = async (username) => {
    const { rows } = await pool.query(
        'SELECT COUNT(*) FROM Playlist WHERE username = $1',
        [username]
    );
    return parseInt(rows[0].count, 10);
};

const contarMusicasPorUtilizador = async (username) => {
    const { rows } = await pool.query(
        'SELECT COUNT(*) FROM Musica WHERE username = $1',
        [username]
    );
    return parseInt(rows[0].count, 10);
};

const contarSeguidores = async (username) => {
    const { rows } = await pool.query(
        'SELECT COUNT(*) FROM Segue_Utilizador WHERE seguido_username = $1',
        [username]
    );
    return parseInt(rows[0].count, 10);
};

const contarSeguindo = async (username) => {
    const { rows } = await pool.query(
        'SELECT COUNT(*) FROM Segue_Utilizador WHERE seguidor_username = $1',
        [username]
    );
    return parseInt(rows[0].count, 10);
};

const atualizarUsername = async (oldUsername, newUsername) => {
    const { rows } = await pool.query(
        `UPDATE Utilizador 
     SET username = $1 
     WHERE username = $2 
     RETURNING *;`,
        [newUsername, oldUsername]
    );
    return rows[0];
};

// Atualiza foto
const atualizarFoto = async (username, fotoPath) => {
    const { rows } = await pool.query(
        `UPDATE Utilizador 
     SET foto = $1 
     WHERE username = $2 
     RETURNING *;`,
        [fotoPath, username]
    );
    return rows[0];
};


module.exports = {
    criarUtilizador,
    obterUtilizadorPorEmail,
    obterUtilizadorPorUsername,
    obterMusicaById,
    publicarMusica,
    listarMusicasPorUtilizador,
    associarMusicaACategoria,
    incrementarVisualizacoesMusica,
    criarPlaylist,
    getTopPlaylists,
    adicionarMusicaAPlaylist,
    listarPlaylistsPorUtilizador,
    getTopArtists,
    registarVisualizacao,
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
    contarPlaylistsPorUtilizador,
    contarMusicasPorUtilizador,
    contarSeguidores,
    contarSeguindo,
    atualizarUsername,
    atualizarFoto,
};