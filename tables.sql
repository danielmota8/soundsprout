ROLLBACK;
BEGIN TRANSACTION;


-- Tabela Utilizador
CREATE TABLE Utilizador (
    username       VARCHAR(50) PRIMARY KEY,
    premium        BOOLEAN NOT NULL,
    email          VARCHAR(100) NOT NULL,
    password       VARCHAR(100) NOT NULL,
    foto           VARCHAR(255)  -- opcional
);

-- Tabela Categoria
CREATE TABLE Categoria (
    nome_categoria VARCHAR(50) PRIMARY KEY
);

-- Tabela Música (entidade fraca)
-- Chave primária composta: (features, titulo, username)
CREATE TABLE Musica (
    features       VARCHAR(50) NOT NULL,
    titulo         VARCHAR(100) NOT NULL,
    username       VARCHAR(50) NOT NULL,  
	descricao TEXT,
    dataPublicacao DATE,
    tipoFicheiro   VARCHAR(20),
    pathFicheiro   VARCHAR(255),
    video          VARCHAR(255),  -- opcional
    foto           VARCHAR(255),  -- opcional
	visualizacoes INT DEFAULT 0,
    PRIMARY KEY (features, titulo, username),
    FOREIGN KEY (username) REFERENCES Utilizador(username)
);

-- Tabela Playlist (entidade fraca)
-- Chave primária composta: (nome, username)
CREATE TABLE Playlist (
    nome         VARCHAR(100) NOT NULL,
    username     VARCHAR(50) NOT NULL,  -- criador da playlist
    dataCriacao  DATE,
    privacidade  VARCHAR(20),         -- 'publico' ou 'privado'
    onlyPremium  BOOLEAN,             -- indica se apenas users premium podem criar
    foto         VARCHAR(255),        -- opcional
    PRIMARY KEY (nome, username),
    FOREIGN KEY (username) REFERENCES Utilizador(username)
);


-- Tabela Notificacao
-- Adicionamos um id_notificacao para servir de chave primária
CREATE TABLE Notificacao (
    id_notificacao SERIAL PRIMARY KEY,
    dataNotificacao DATE,
    descricao     TEXT
);

-- Tabela Live (entidade fraca)
-- Chave primária composta: (url, criador_username)
CREATE TABLE Live (
    url              VARCHAR(255) NOT NULL,
    criador_username VARCHAR(50) NOT NULL,  
    titulo           VARCHAR(100),
    dataHora         TIMESTAMP,
    PRIMARY KEY (url, criador_username),
    FOREIGN KEY (criador_username) REFERENCES Utilizador(username)
);

CREATE TABLE Comentario (
    idcomentario         SERIAL PRIMARY KEY,  -- ID único para cada comentário
    comentario_timestamp TIMESTAMP NOT NULL,  -- Momento em que o comentário foi postado
    autor_username       VARCHAR(50) NOT NULL,  -- Quem postou o comentário
    musica_username      VARCHAR(50) NOT NULL,  -- dono da música comentada
    features             VARCHAR(50) NOT NULL,
    titulo               VARCHAR(100) NOT NULL,
    conteudo             TEXT NOT NULL,  -- Evita comentários vazios
    tempoNaMusica        TIME,  -- Tempo na música (min:seg)
    
    -- Campo para identificar a resposta (comentário pai)
    parentId             INTEGER DEFAULT NULL,
    
    -- Relacionamento com o autor do comentário
    FOREIGN KEY (autor_username) REFERENCES Utilizador(username),
    
    -- Relacionamento com a música
    FOREIGN KEY (features, titulo, musica_username)
        REFERENCES Musica(features, titulo, username),
    
    -- Relacionamento para permitir respostas a comentários
    FOREIGN KEY (parentId) REFERENCES Comentario(idcomentario)
        ON DELETE CASCADE
);



-- Tabela Doacao (entidade fraca)
-- Usamos "doador_username" para o usuário que efetua a doação e
-- (features, titulo, musica_username) para identificar a música (e assim o usuário que recebe a doação)
CREATE TABLE Doacao (
    id_doacao        SERIAL NOT NULL,
    doador_username  VARCHAR(50) NOT NULL,
    musica_username  VARCHAR(50) NOT NULL,
    features         VARCHAR(50) NOT NULL,
    titulo           VARCHAR(100) NOT NULL,
    valor            NUMERIC(10,2),
    data             DATE,
    PRIMARY KEY (id_doacao, doador_username, features, titulo, musica_username),
    FOREIGN KEY (doador_username) REFERENCES Utilizador(username),
    FOREIGN KEY (features, titulo, musica_username)
        REFERENCES Musica(features, titulo, username)
);

-- Relação: Utilizador dá like a Playlists
CREATE TABLE Like_Playlist (
    username         VARCHAR(50) NOT NULL,   -- user que deu like
    playlist_nome    VARCHAR(100) NOT NULL,
    playlist_username VARCHAR(50) NOT NULL,  -- dono da playlist
    like_timestamp   TIMESTAMP,
    PRIMARY KEY (username, playlist_nome, playlist_username),
    FOREIGN KEY (username) REFERENCES Utilizador(username),
    FOREIGN KEY (playlist_nome, playlist_username)
        REFERENCES Playlist(nome, username)
);

-- Relação: Utilizador dá like a Músicas
CREATE TABLE Like_Musica (
    username         VARCHAR(50) NOT NULL,  -- user que dá like
    features         VARCHAR(50) NOT NULL,
    titulo           VARCHAR(100) NOT NULL,
    musica_username  VARCHAR(50) NOT NULL,  -- dono da música
    like_timestamp   TIMESTAMP,
    PRIMARY KEY (username, features, titulo, musica_username),
    FOREIGN KEY (username) REFERENCES Utilizador(username),
    FOREIGN KEY (features, titulo, musica_username)
        REFERENCES Musica(features, titulo, username)
);


-- Relação: Utilizador segue Utilizador (self-referencing)
CREATE TABLE Segue_Utilizador (
    seguidor_username VARCHAR(50) NOT NULL,  -- quem segue
    seguido_username  VARCHAR(50) NOT NULL,  -- quem é seguido
    PRIMARY KEY (seguidor_username, seguido_username),
    FOREIGN KEY (seguidor_username) REFERENCES Utilizador(username),
    FOREIGN KEY (seguido_username) REFERENCES Utilizador(username)
);

-- Relação: Utilizador adere a Lives
CREATE TABLE Live_Aderir (
    username             VARCHAR(50) NOT NULL,  -- user que adere à live
    live_url             VARCHAR(255) NOT NULL,
    live_criador_username VARCHAR(50) NOT NULL, -- dono (criador) da live
    PRIMARY KEY (username, live_url, live_criador_username),
    FOREIGN KEY (username) REFERENCES Utilizador(username),
    FOREIGN KEY (live_url, live_criador_username)
        REFERENCES Live(url, criador_username)
);

-- Relação: Notificações enviadas para Utilizadores (muitos-para-muitos)
CREATE TABLE Utilizador_Notificacao (
    username         VARCHAR(50) NOT NULL,
    id_notificacao   INTEGER NOT NULL,
    PRIMARY KEY (username, id_notificacao),
    FOREIGN KEY (username) REFERENCES Utilizador(username),
    FOREIGN KEY (id_notificacao) REFERENCES Notificacao(id_notificacao)
);

-- Relação: Uma Playlist contém várias Músicas (muitos-para-muitos)
CREATE TABLE Playlist_Musica (
    playlist_nome     VARCHAR(100) NOT NULL,
    playlist_username VARCHAR(50) NOT NULL,
    features          VARCHAR(50) NOT NULL,
    titulo            VARCHAR(100) NOT NULL,
    musica_username   VARCHAR(50) NOT NULL,
    PRIMARY KEY (playlist_nome, playlist_username, features, titulo, musica_username),
    FOREIGN KEY (playlist_nome, playlist_username)
        REFERENCES Playlist(nome, username),
    FOREIGN KEY (features, titulo, musica_username)
        REFERENCES Musica(features, titulo, username)
);

-- Relação: Uma Playlist tem uma ou mais Categorias (muitos-para-muitos)
CREATE TABLE Playlist_Categoria (
    playlist_nome  VARCHAR(100) NOT NULL,
    playlist_username           VARCHAR(50) NOT NULL,
    nome_categoria   VARCHAR(50) NOT NULL,
    PRIMARY KEY (playlist_nome, playlist_username, nome_categoria),
    FOREIGN KEY (playlist_nome, playlist_username)
        REFERENCES Playlist(nome, username),
    FOREIGN KEY (nome_categoria) REFERENCES Categoria(nome_categoria)
);

-- Relação: Uma Música tem uma ou mais Categorias (muitos-para-muitos)
CREATE TABLE Musica_Categoria (
    features         VARCHAR(50) NOT NULL,
    titulo           VARCHAR(100) NOT NULL,
    musica_username  VARCHAR(50) NOT NULL,
    nome_categoria   VARCHAR(50) NOT NULL,
    PRIMARY KEY (features, titulo, musica_username, nome_categoria),
    FOREIGN KEY (features, titulo, musica_username)
        REFERENCES Musica(features, titulo, username),
    FOREIGN KEY (nome_categoria) REFERENCES Categoria(nome_categoria)
);



CREATE TABLE Reporte_Comentario (
    id_reporte       SERIAL PRIMARY KEY,
    reporter_username VARCHAR(50) NOT NULL,  -- user que reportou
    idcomentario      INTEGER NOT NULL,         -- id do comentário reportado
    dataReporte       DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo            VARCHAR(50) NOT NULL CHECK (motivo IN ('linguagem inadequada', 'spam', 'outro')),
    FOREIGN KEY (reporter_username) REFERENCES Utilizador(username),
    FOREIGN KEY (idcomentario) REFERENCES Comentario(idcomentario)
);


CREATE TABLE Reage_Live (
    username             VARCHAR(50) NOT NULL,  -- user que reage à live
    live_url             VARCHAR(255) NOT NULL, -- URL da live
    live_criador_username VARCHAR(50) NOT NULL, -- criador da live
    valor                NUMERIC(10,2) NOT NULL CHECK (valor > 0), -- valor da doação
    mensagem             TEXT,                  -- mensagem opcional
    timestamp            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- data e hora da reação
    PRIMARY KEY (username, live_url, live_criador_username, timestamp),
    FOREIGN KEY (username) REFERENCES Utilizador(username),
    FOREIGN KEY (live_url, live_criador_username)
        REFERENCES Live(url, criador_username)
);

COMMIT;
