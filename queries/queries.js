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
            dataPublicacao AS "dataPublicacao",
            tipoFicheiro   AS "tipoFicheiro",
            pathFicheiro   AS "pathFicheiro",
            video,
            letra AS "letra",
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

const obterCategoriasFavoritas = async (username) => {
    const sql = `
    SELECT mc.nome_categoria,
           COUNT(*) AS cnt
      FROM Like_Musica lm
      JOIN Musica_Categoria mc
        ON lm.musica_id = mc.musica_id
     WHERE lm.username = $1
     GROUP BY mc.nome_categoria
     ORDER BY cnt DESC;
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows;
};


const obterMusicasPorCategorias = async (categorias, limit) => {
    const sql = `
        SELECT m.*
        FROM Musica m
        WHERE m.id IN (
            SELECT mc.musica_id
            FROM Musica_Categoria mc
            WHERE mc.nome_categoria = ANY($1)
        )
        ORDER BY random()
        LIMIT $2;
    `;
    const { rows } = await pool.query(sql, [categorias, limit]);
    return rows;
};


const obterMusicasAleatorias = async (limit) => {
    const sql = `
    SELECT *
      FROM Musica
     ORDER BY random()
     LIMIT $1;
  `;
    const { rows } = await pool.query(sql, [limit]);
    return rows;
};

// Puxa artistas mais “gostados” pelo user, limitado a N resultados
const obterArtistasFavoritos = async (username) => {
    const sql = `
    SELECT
      m.username       AS artist_username,
      u.foto            AS artist_foto,
      COUNT(*)          AS likes_count
    FROM Like_Musica lm
    JOIN Musica m
      ON lm.musica_id = m.id
    JOIN Utilizador u
      ON m.username = u.username
    WHERE lm.username = $1
    GROUP BY m.username, u.foto
    ORDER BY likes_count DESC
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows;  // [{ artist_username, artist_foto, likes_count }, …]
};

// músicas publicadas nos últimos `daysAgo` dias,
// excluindo as que o user já deu like, e retorna aleatoriamente até `limit`.
const obterMusicasDiscover = async (username, daysAgo) => {
    const sql = `
    SELECT *
      FROM Musica m
     WHERE m.dataPublicacao >= (CURRENT_DATE - $2 * INTERVAL '1 day')
       -- excluir as que o user já gostou
       AND m.id NOT IN (
         SELECT musica_id
           FROM Like_Musica
          WHERE username = $1
       )
     ORDER BY random()

  `;
    const values = [ username, daysAgo ];
    const { rows } = await pool.query(sql, values);
    return rows;
};

// Puxa todas as categorias com as músicas associadas
const obterCategoriasComMusicas = async () => {
    const sql = `
    SELECT
      c.nome_categoria,
      m.id           AS musica_id,
      m.titulo,
      m.username     AS artista,
      m.foto         AS capa,
      m.dataPublicacao
    FROM Categoria c
    LEFT JOIN Musica_Categoria mc
      ON mc.nome_categoria = c.nome_categoria
    LEFT JOIN Musica m
      ON m.id = mc.musica_id
    ORDER BY c.nome_categoria, m.dataPublicacao DESC;
  `;
    const { rows } = await pool.query(sql);
    return rows;
};

const obterPlaylistsExplore = async () => {
    const sql = `
    SELECT
      nome,
      username,
      foto,
      dataCriacao,
      privacidade,
      onlyPremium
    FROM Playlist;
  `;
    const { rows } = await pool.query(sql);
    return rows;  // array de { nome, username, foto, dataCriacao, privacidade, onlyPremium }
};

//  Puxa artistas (Utilizador) que tenham pelo menos 1 música,
//  excluindo o próprio user e quem já segue, e retorna aleatoriamente até 'limit'
const obterArtistasExplore = async (username, limit) => {
    const sql = `
    SELECT u.username, u.foto
      FROM Utilizador u
     WHERE u.username <> $1
       AND EXISTS (
         SELECT 1
           FROM Musica m
          WHERE m.username = u.username
       )
       AND u.username NOT IN (
         SELECT seguido_username
           FROM Segue_Utilizador
          WHERE seguidor_username = $1
       )
     ORDER BY random()
     LIMIT $2;
  `;
    const values = [ username, limit ];
    const { rows } = await pool.query(sql, values);
    return rows;  // [ { username, foto }, … ]
};

// Obter settings do utilizador
const obterSettings = async (username) => {
    const sql = `
    SELECT linguagem,
           tema,
           autoplay,
           playlists_ativas,
           compartilhar_atividade,
           mostrar_artistas_recentemente,
           mostrar_listas_publicas
      FROM Utilizador_Settings
     WHERE username = $1;
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows[0] || null;
};

// atualizarSettings (em queries.js)
const atualizarSettings = async (username, fields) => {
    const sets = []
    const values = []
    let idx = 1
    for (const [key, val] of Object.entries(fields)) {
        sets.push(`${key} = $${idx}`)
        values.push(val)
        idx++
    }
    if (sets.length === 0) return null
    const sql = `
        UPDATE Utilizador_Settings
        SET ${sets.join(', ')}
        WHERE username = $${idx}
     RETURNING *
  `
    values.push(username)
    const { rows } = await pool.query(sql, values)
    return rows[0]
}

//queries GABRIEL NOVAS

// ── novo em queries.js ──
async function getTopArtistsForUser(username, since, limit = null) {
    let sql = `
    SELECT 
      m.username        AS username,
      u.foto            AS foto,
      COUNT(*)          AS plays
    FROM Visualizacao v
    JOIN Musica m
      ON v.musica_id = m.id
    JOIN Utilizador u
      ON m.username = u.username
    WHERE 
      v.view_username = $1
      AND v.visto_em   >= $2
    GROUP BY m.username, u.foto
    ORDER BY plays DESC
  `;
    const params = [username, since];
    if (limit) {
        sql += ` LIMIT $3`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows; // [{ username, foto, plays }, …]
}

async function getTopTracksForUser(username, since, limit = null) {
    let sql = `
    SELECT
      m.id,
      m.titulo,
      m.username,
      m.foto,
      COUNT(*) AS plays
    FROM Visualizacao v
    JOIN Musica m
      ON v.musica_id = m.id
    WHERE
      v.view_username = $1
      AND v.visto_em >= $2
    GROUP BY m.id, m.titulo, m.username, m.foto
    ORDER BY plays DESC
  `;
    const params = [username, since];
    if (limit) {
        sql += ` LIMIT $3`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
}

async function getRecentlyLikedPlaylistsForUser(username, limit = null) {
    let sql = `
    SELECT
      p.nome            AS playlist_name,
      p.username        AS creator_username,
      p.foto            AS playlist_photo,
      lp.like_timestamp AS liked_at
    FROM Like_Playlist lp
    JOIN Playlist p
      ON p.nome     = lp.playlist_nome
     AND p.username = lp.playlist_username
    WHERE lp.username        = $1
      AND p.privacidade = 'publico'
    ORDER BY lp.like_timestamp DESC
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows; // array de { playlist_name, creator_username, playlist_photo, liked_at }
}

async function getRecentlyLikedSongsForUser(username, limit = null) {
    let sql = `
    SELECT
      m.id,
      m.titulo,
      m.username        AS artist_username,
      m.foto            AS cover,
      lm.like_timestamp AS liked_at
    FROM Like_Musica lm
    JOIN Musica m
      ON m.id = lm.musica_id
    WHERE lm.username = $1
    ORDER BY lm.like_timestamp DESC
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows; // [{ id, titulo, artist_username, cover, liked_at }, …]
}

async function getFollowersForUser(username, limit = null) {                    // CHANGED
    let sql = `
    SELECT
      u.username AS follower_username,
      u.foto AS follower_photo
    FROM Segue_Utilizador s
    JOIN Utilizador u
      ON u.username = s.seguidor_username
    WHERE s.seguido_username = $1
    ORDER BY s.seguidor_username
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
}

async function getFollowingForUser(username, limit = null) { // ← ALTERAÇÃO
    let sql = `
    SELECT
      u.username AS following_username,
      u.foto     AS following_photo
    FROM Segue_Utilizador s
    JOIN Utilizador u
      ON u.username = s.seguido_username
    WHERE s.seguidor_username = $1
    ORDER BY u.username
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;  // [{ following_username, following_photo }, …]
}

async function getBadgesForUser(username) {
    const sql = `
    SELECT
      b.nome        AS badge_name,
      b.tier        AS badge_tier,
      b.descricao,
      ub.data_atribuicao
    FROM Utilizador_Badge ub
    JOIN Badge b
      ON b.nome = ub.badge_nome
     AND b.tier = ub.badge_tier
    WHERE ub.nome_utilizador = $1
    ORDER BY ub.data_atribuicao DESC
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows; // [{ badge_name, badge_tier, descricao, data_atribuicao }, …]
}
// ── novo em queries.js ──
async function getTopArtistsForUser(username, since, limit = null) {
    let sql = `
    SELECT 
      m.username        AS username,
      u.foto            AS foto,
      COUNT(*)          AS plays
    FROM Visualizacao v
    JOIN Musica m
      ON v.musica_id = m.id
    JOIN Utilizador u
      ON m.username = u.username
    WHERE 
      v.view_username = $1
      AND v.visto_em   >= $2
    GROUP BY m.username, u.foto
    ORDER BY plays DESC
  `;
    const params = [username, since];
    if (limit) {
        sql += ` LIMIT $3`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows; // [{ username, foto, plays }, …]
}

async function getTopTracksForUser(username, since, limit = null) {
    let sql = `
    SELECT
      m.id,
      m.titulo,
      m.username,
      m.foto,
      COUNT(*) AS plays
    FROM Visualizacao v
    JOIN Musica m
      ON v.musica_id = m.id
    WHERE
      v.view_username = $1
      AND v.visto_em >= $2
    GROUP BY m.id, m.titulo, m.username, m.foto
    ORDER BY plays DESC
  `;
    const params = [username, since];
    if (limit) {
        sql += ` LIMIT $3`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
}

async function getRecentlyLikedPlaylistsForUser(username, limit = null) {
    let sql = `
    SELECT
      p.nome            AS playlist_name,
      p.username        AS creator_username,
      p.foto            AS playlist_photo,
      lp.like_timestamp AS liked_at
    FROM Like_Playlist lp
    JOIN Playlist p
      ON p.nome     = lp.playlist_nome
     AND p.username = lp.playlist_username
    WHERE lp.username        = $1
      AND p.privacidade = 'publico'
    ORDER BY lp.like_timestamp DESC
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows; // array de { playlist_name, creator_username, playlist_photo, liked_at }
}

async function getRecentlyLikedSongsForUser(username, limit = null) {
    let sql = `
    SELECT
      m.id,
      m.titulo,
      m.username        AS artist_username,
      m.foto            AS cover,
      lm.like_timestamp AS liked_at
    FROM Like_Musica lm
    JOIN Musica m
      ON m.id = lm.musica_id
    WHERE lm.username = $1
    ORDER BY lm.like_timestamp DESC
  `;
      const params = [username];
      if (limit) {
            sql += ` LIMIT $2`;
            params.push(limit);
          }
      const { rows } = await pool.query(sql, params);
      return rows; // [{ id, titulo, artist_username, cover, liked_at }, …]
}

async function getFollowersForUser(username, limit = null) {                    // CHANGED
    let sql = `
    SELECT
      u.username AS follower_username,
      u.foto AS follower_photo
    FROM Segue_Utilizador s
    JOIN Utilizador u
      ON u.username = s.seguidor_username
    WHERE s.seguido_username = $1
    ORDER BY s.seguidor_username
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;
}

async function getFollowingForUser(username, limit = null) { // ← ALTERAÇÃO
    let sql = `
    SELECT
      u.username AS following_username,
      u.foto     AS following_photo
    FROM Segue_Utilizador s
    JOIN Utilizador u
      ON u.username = s.seguido_username
    WHERE s.seguidor_username = $1
    ORDER BY u.username
  `;
    const params = [username];
    if (limit) {
        sql += ` LIMIT $2`;
        params.push(limit);
    }
    const { rows } = await pool.query(sql, params);
    return rows;  // [{ following_username, following_photo }, …]
}

async function getBadgesForUser(username) {
          const sql = `
    SELECT
      b.nome        AS badge_name,
      b.tier        AS badge_tier,
      b.descricao,
      ub.data_atribuicao
    FROM Utilizador_Badge ub
    JOIN Badge b
      ON b.nome = ub.badge_nome
     AND b.tier = ub.badge_tier
    WHERE ub.nome_utilizador = $1
    ORDER BY ub.data_atribuicao DESC
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows; // [{ badge_name, badge_tier, descricao, data_atribuicao }, …]
}

// --- metadata de uma playlist ---
async function obterPlaylist(nome, username) {
    const sql = `
    SELECT
      p.nome,
      p.username,
      p.foto,
      p.privacidade,
      COUNT(pm.musica_id)     AS total_songs,
      COUNT(lp.username)      AS total_likes
    FROM Playlist p
    LEFT JOIN Playlist_Musica pm
      ON p.nome = pm.playlist_nome
     AND p.username = pm.playlist_username
    LEFT JOIN Like_Playlist lp
      ON p.nome = lp.playlist_nome
     AND p.username = lp.playlist_username
    WHERE p.nome = $1 AND p.username = $2
    GROUP BY p.nome, p.username, p.foto, p.privacidade;
  `;
    const { rows } = await pool.query(sql, [nome, username]);
    return rows[0];
}

const criarSettings = async (username) => {
    const sql = `
    INSERT INTO Utilizador_Settings (username)
    VALUES ($1)
    RETURNING *
  `
    const { rows } = await pool.query(sql, [username])
    return rows[0]
}

const obterCategoriasPorMusica = async (musicaId) => {
    const sql = `
    SELECT nome_categoria
      FROM Musica_Categoria
     WHERE musica_id = $1
  `;
    const { rows } = await pool.query(sql, [musicaId]);
    return rows.map(r => r.nome_categoria);
};

// ── busca músicas semelhantes (mesma categoria ou mesmo usuário)
const obterMusicasSemelhantes = async (musicaId, username, categorias, limit) => {
    const sql = `
    SELECT
      m.*,
      random() AS _rnd
    FROM Musica m
    WHERE m.id <> $1
      AND (
        m.username = $2
        OR EXISTS (
          SELECT 1
          FROM Musica_Categoria mc
          WHERE mc.musica_id = m.id
            AND mc.nome_categoria = ANY($3)
        )
      )
    ORDER BY _rnd
    LIMIT $4
`;
    const values = [musicaId, username, categorias, limit];
    const { rows } = await pool.query(sql, values);
    // opcional: remover a coluna _rnd antes de retornar
    return rows.map(({ _rnd, ...rest }) => rest);
    };

async function getSelectedBadges(username) {
    const sql = `
    SELECT badge_nome AS badge_name, badge_tier, position
      FROM Utilizador_Seleciona_Badge
     WHERE username = $1
    ORDER BY position
  `;
    const { rows } = await pool.query(sql, [username]);
    return rows; // [{ badge_name, badge_tier, position }, …]
}

// grava um novo conjunto de selecção (máx 3), limpa antes
async function setSelectedBadges(username, badges) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `DELETE FROM Utilizador_Seleciona_Badge WHERE username = $1`,
            [username]
        );
        const insert = `
    INSERT INTO Utilizador_Seleciona_Badge
        (username, badge_nome, badge_tier, position)
    VALUES ($1, $2, $3, $4)
    `;
        for (let i = 0; i < badges.length; i++) {
            const { badge_name, badge_tier } = badges[i];
            await client.query(insert, [username, badge_name, badge_tier, i]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

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

    obterCategoriasFavoritas,
    obterMusicasPorCategorias,
    obterMusicasAleatorias,
    obterArtistasFavoritos,
    obterMusicasDiscover,
    obterCategoriasComMusicas,
    obterPlaylistsExplore,
    obterArtistasExplore,
    obterSettings,
    atualizarSettings,

    getTopArtistsForUser,
    getTopTracksForUser,
    getRecentlyLikedPlaylistsForUser,
    getRecentlyLikedSongsForUser,
    getFollowersForUser,
    getFollowingForUser,
    getBadgesForUser,
    getTopArtistsForUser,
    getTopTracksForUser,
    getRecentlyLikedPlaylistsForUser,
    getRecentlyLikedSongsForUser,
    getFollowersForUser,
    getFollowingForUser,
    getBadgesForUser,
    obterPlaylist,
    criarSettings,
    obterCategoriasPorMusica,
    obterMusicasSemelhantes,
    getSelectedBadges,
    setSelectedBadges,
};