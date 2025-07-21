rollback;
BEGIN TRANSACTION;




CREATE TABLE Utilizador (
                            username VARCHAR(50) PRIMARY KEY,
                            premium BOOLEAN default FALSE,
                            email VARCHAR(100) NOT NULL,
                            password VARCHAR(100) NOT NULL,
                            foto VARCHAR(255),
                            resetPasswordToken VARCHAR(255),
                            resetPasswordExpires TIMESTAMP,
                            stripe_account_id VARCHAR(255)
);

CREATE TABLE Utilizador_Settings (
                                     username                         VARCHAR(50) PRIMARY KEY,
                                     linguagem                        VARCHAR(5)    NOT NULL DEFAULT 'pt',
                                     tema                             VARCHAR(10)   NOT NULL DEFAULT 'day'
                                         CHECK (tema IN ('day','night')),
                                     autoplay                         BOOLEAN       NOT NULL DEFAULT FALSE,
                                     playlists_ativas                 BOOLEAN       NOT NULL DEFAULT TRUE,
                                     compartilhar_atividade           BOOLEAN       NOT NULL DEFAULT FALSE,
                                     mostrar_artistas_recentemente    BOOLEAN       NOT NULL DEFAULT FALSE,
                                     mostrar_listas_publicas          BOOLEAN       NOT NULL DEFAULT FALSE,
                                     FOREIGN KEY (username)
                                         REFERENCES Utilizador(username)
                                         ON UPDATE CASCADE
                                         ON DELETE CASCADE
);




CREATE TABLE Categoria (
                           nome_categoria VARCHAR(50) PRIMARY KEY
);


CREATE TABLE Musica (
                        id              SERIAL PRIMARY KEY,
                        titulo          VARCHAR(100) NOT NULL,
                        username        VARCHAR(50)  NOT NULL,
                        descricao       TEXT,
                        dataPublicacao  DATE,
                        tipoFicheiro    VARCHAR(20),
                        pathFicheiro    VARCHAR(255),
                        video           VARCHAR(255),
                        foto            VARCHAR(255),
                        visualizacoes   INT DEFAULT 0,
                        letra TEXT,

                        CONSTRAINT fk_musica_utilizador
                            FOREIGN KEY (username)
                                REFERENCES Utilizador(username)
                                ON UPDATE CASCADE
                                ON DELETE CASCADE


);

CREATE TABLE Visualizacao (
                              id               SERIAL PRIMARY KEY,
                              musica_id        SERIAL       NOT NULL REFERENCES Musica(id) ON DELETE CASCADE,
                              view_username VARCHAR(50)
                                  REFERENCES Utilizador(username) ON DELETE SET NULL
                                      ON UPDATE CASCADE,
                              visto_em         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visualizacao_musica_data
    ON Visualizacao(musica_id, visto_em);

CREATE INDEX idx_visualizacao_user_date
    ON Visualizacao(view_username, visto_em);


CREATE TABLE Feature (
                         musica_id           SERIAL          NOT NULL,
                         feature_username    VARCHAR(50)  NOT NULL
                             REFERENCES Utilizador(username)
                                 ON UPDATE CASCADE
                                 ON DELETE CASCADE,

                         PRIMARY KEY (musica_id, feature_username),
                         FOREIGN KEY (musica_id)        REFERENCES Musica(id),
                         FOREIGN KEY (feature_username) REFERENCES Utilizador(username)
);




CREATE TABLE Playlist (
                          nome         VARCHAR(100) NOT NULL,
                          username     VARCHAR(50) NOT NULL,
                          dataCriacao  DATE,
                          privacidade  VARCHAR(20),
                          onlyPremium  BOOLEAN,
                          foto         VARCHAR(255),
                          PRIMARY KEY (nome, username),
                          FOREIGN KEY (username)
                              REFERENCES Utilizador(username)
                              ON UPDATE CASCADE
                              ON DELETE CASCADE
);




CREATE TABLE Notificacao (
                             id_notificacao SERIAL PRIMARY KEY,
                             dataNotificacao DATE,
                             descricao     TEXT,
                             tipo VARCHAR(50)
);






CREATE TABLE Live (
                      url VARCHAR(255) NOT NULL,
                      criador_username VARCHAR(50) NOT NULL,
                      titulo VARCHAR(100),
                      dataHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      tipo VARCHAR(50),
                      descricao TEXT,
                      capa VARCHAR(255),
                      viewers INT DEFAULT 0,
                      is_live BOOLEAN DEFAULT TRUE,
                      PRIMARY KEY (url, criador_username),
                      FOREIGN KEY (criador_username)
                          REFERENCES Utilizador(username)
                          ON UPDATE CASCADE
                          ON DELETE CASCADE
);

CREATE TABLE Comentario (
                            idcomentario         SERIAL PRIMARY KEY,
                            comentario_timestamp TIMESTAMP NOT NULL,
                            autor_username       VARCHAR(50) NOT NULL
                                REFERENCES Utilizador(username)
                                    ON UPDATE CASCADE
                                    ON DELETE CASCADE,
                            musica_id            INT          NOT NULL,
                            conteudo             TEXT         NOT NULL,
                            tempoNaMusica        TIME,
                            parentId             INTEGER      DEFAULT NULL,
                            FOREIGN KEY (autor_username)
                                REFERENCES Utilizador(username),
                            FOREIGN KEY (musica_id)
                                REFERENCES Musica(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,
                            FOREIGN KEY (parentId)
                                REFERENCES Comentario(idcomentario)
                                ON DELETE CASCADE
);

CREATE TABLE Doacao (
                        id_doacao           SERIAL PRIMARY KEY,
                        doador_username     VARCHAR(50) NOT NULL
                            REFERENCES Utilizador(username)
                                ON UPDATE CASCADE ON DELETE CASCADE,
                        destinatario_username VARCHAR(50),
                        musica_id           SERIAL,
                        valor               NUMERIC(10,2),
                        data                DATE,
                        FOREIGN KEY (musica_id)
                            REFERENCES Musica(id)
                            ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE Doacao
    ALTER COLUMN musica_id DROP NOT NULL;

CREATE TABLE Badge (
                       nome         VARCHAR(100) NOT NULL,
                       threshold    INT          NOT NULL,
                       tier         VARCHAR(10)  NOT NULL,
                       descricao    TEXT,
                       PRIMARY KEY (nome, tier)
);

CREATE TABLE Utilizador_Badge (
                                  nome_utilizador     VARCHAR(50) NOT NULL
                                      REFERENCES Utilizador(username)
                                          ON UPDATE CASCADE
                                          ON DELETE CASCADE,
                                  badge_nome    VARCHAR(100) NOT NULL,
                                  badge_tier    VARCHAR(10)  NOT NULL,
                                  data_atribuicao DATE NOT NULL DEFAULT CURRENT_DATE,
                                  PRIMARY KEY (nome_utilizador, badge_nome, badge_tier),
                                  FOREIGN KEY (nome_utilizador) REFERENCES Utilizador(username),
                                  FOREIGN KEY (badge_nome, badge_tier) REFERENCES Badge(nome, tier) ON DELETE CASCADE
);

CREATE TABLE Utilizador_Badge_Progresso (
                                            username       VARCHAR(50)   NOT NULL,
                                            badge_nome     VARCHAR(100)  NOT NULL,
                                            badge_tier     VARCHAR(10)   NOT NULL,
                                            current_state  INT           NOT NULL DEFAULT 0,
                                            PRIMARY KEY (username, badge_nome, badge_tier),
                                            CONSTRAINT fk_ubp_user
                                                FOREIGN KEY (username)
                                                    REFERENCES Utilizador(username)
                                                    ON UPDATE CASCADE
                                                    ON DELETE CASCADE,
                                            CONSTRAINT fk_ubp_badge
                                                FOREIGN KEY (badge_nome, badge_tier)
                                                    REFERENCES Badge(nome, tier)
                                                    ON UPDATE CASCADE
                                                    ON DELETE CASCADE
);


CREATE TABLE Utilizador_Seleciona_Badge (
                                            username     VARCHAR(50)    NOT NULL,
                                            badge_nome   VARCHAR(100)   NOT NULL,
                                            badge_tier   VARCHAR(10)    NOT NULL,
                                            position     SMALLINT       NOT NULL,
                                            PRIMARY KEY (username, badge_nome, badge_tier),
                                            UNIQUE (username, position),
                                            FOREIGN KEY (username)
                                                REFERENCES Utilizador(username)
                                                ON UPDATE CASCADE
                                                ON DELETE CASCADE,
                                            FOREIGN KEY (badge_nome, badge_tier)
                                                REFERENCES Badge(nome, tier)
                                                ON UPDATE CASCADE
                                                ON DELETE CASCADE
);


CREATE TABLE Evento (
                        url              VARCHAR(255) NOT NULL,
                        criador_username VARCHAR(50)  NOT NULL,
                        genero           VARCHAR(50)  NOT NULL,
                        dataHoraInicio   TIMESTAMP,
                        dataHoraFim      TIMESTAMP,
                        descricao        TEXT,
                        PRIMARY KEY (url, criador_username),
                        FOREIGN KEY (url, criador_username)
                            REFERENCES Live (url, criador_username)
);


CREATE TABLE Evento_Utilizador (
                                   url               VARCHAR(255) NOT NULL,
                                   criador_username  VARCHAR(50)  NOT NULL,
                                   username          VARCHAR(50)  NOT NULL
                                       REFERENCES Utilizador(username)
                                           ON UPDATE CASCADE
                                           ON DELETE CASCADE,
                                   joined_at         TIMESTAMP    NOT NULL
                                       DEFAULT CURRENT_TIMESTAMP,
                                   PRIMARY KEY (url, criador_username, username),
                                   FOREIGN KEY (url, criador_username)
                                       REFERENCES Evento (url, criador_username),
                                   FOREIGN KEY (username)
                                       REFERENCES Utilizador (username)
);




CREATE TABLE Evento_Sugestao (
                                 id_sugestao      SERIAL PRIMARY KEY,
                                 url              VARCHAR(255) NOT NULL,
                                 criador_username VARCHAR(50)  NOT NULL,
                                 autor_username   VARCHAR(50)  NOT NULL
                                     REFERENCES Utilizador(username)
                                         ON UPDATE CASCADE
                                         ON DELETE CASCADE,
                                 musica_id        SERIAL,
                                 comentario       TEXT,
                                 timestamp        TIMESTAMP     NOT NULL
                                     DEFAULT CURRENT_TIMESTAMP,
                                 FOREIGN KEY (url, criador_username)
                                     REFERENCES Evento(url, criador_username),
                                 FOREIGN KEY (autor_username)
                                     REFERENCES Utilizador(username),
                                 FOREIGN KEY (musica_id)
                                     REFERENCES Musica(id)
                                     ON DELETE SET NULL
                                     ON UPDATE CASCADE
);


CREATE TABLE Evento_Voto (
                             id_sugestao       INT          NOT NULL,
                             username          VARCHAR(50)  NOT NULL
                                 REFERENCES Utilizador(username)
                                     ON UPDATE CASCADE
                                     ON DELETE CASCADE,
                             voto              BOOLEAN      NOT NULL,
                             timestamp         TIMESTAMP    NOT NULL
                                 DEFAULT CURRENT_TIMESTAMP,
                             PRIMARY KEY (id_sugestao, username),
                             FOREIGN KEY (id_sugestao)
                                 REFERENCES Evento_Sugestao (id_sugestao),
                             FOREIGN KEY (username)
                                 REFERENCES Utilizador (username)
);


CREATE TABLE Like_Playlist (
                               username         VARCHAR(50) NOT NULL
                                   REFERENCES Utilizador(username)
                                       ON UPDATE CASCADE
                                       ON DELETE CASCADE,
                               playlist_nome    VARCHAR(100) NOT NULL,
                               playlist_username VARCHAR(50) NOT NULL,
                               like_timestamp   TIMESTAMP,
                               PRIMARY KEY (username, playlist_nome, playlist_username),
                               FOREIGN KEY (username) REFERENCES Utilizador(username),
                               FOREIGN KEY (playlist_nome, playlist_username)
                                   REFERENCES Playlist(nome, username)
                                   ON UPDATE CASCADE
                                   ON DELETE CASCADE
);


CREATE TABLE Like_Musica (
                             username       VARCHAR(50) NOT NULL
                                 REFERENCES Utilizador(username)
                                     ON UPDATE CASCADE
                                     ON DELETE CASCADE,
                             musica_id      SERIAL          NOT NULL,
                             like_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
                             PRIMARY KEY (username, musica_id),
                             FOREIGN KEY (username)
                                 REFERENCES Utilizador(username),
                             FOREIGN KEY (musica_id)
                                 REFERENCES Musica(id)
                                 ON DELETE CASCADE
                                 ON UPDATE CASCADE
);

CREATE INDEX idx_like_musica_user_date
    ON Like_Musica(username, like_timestamp DESC);



CREATE TABLE Segue_Utilizador (
                                  seguidor_username VARCHAR(50) NOT NULL
                                      REFERENCES Utilizador(username)
                                          ON UPDATE CASCADE
                                          ON DELETE CASCADE,
                                  seguido_username  VARCHAR(50) NOT NULL
                                      REFERENCES Utilizador(username)
                                          ON UPDATE CASCADE
                                          ON DELETE CASCADE,
                                  PRIMARY KEY (seguidor_username, seguido_username),
                                  FOREIGN KEY (seguidor_username) REFERENCES Utilizador(username),
                                  FOREIGN KEY (seguido_username) REFERENCES Utilizador(username)
);


CREATE TABLE Live_Aderir (
                             username             VARCHAR(50) NOT NULL
                                 REFERENCES Utilizador(username)
                                     ON UPDATE CASCADE
                                     ON DELETE CASCADE,
                             live_url             VARCHAR(255) NOT NULL,
                             live_criador_username VARCHAR(50) NOT NULL,
                             PRIMARY KEY (username, live_url, live_criador_username),
                             FOREIGN KEY (username) REFERENCES Utilizador(username),
                             FOREIGN KEY (live_url, live_criador_username)
                                 REFERENCES Live(url, criador_username)
);


CREATE TABLE Utilizador_Notificacao (
                                        username         VARCHAR(50) NOT NULL
                                            REFERENCES Utilizador(username)
                                                ON UPDATE CASCADE
                                                ON DELETE CASCADE,
                                        id_notificacao   INTEGER NOT NULL,
                                        visto BOOLEAN DEFAULT false,

                                        PRIMARY KEY (username, id_notificacao),
                                        FOREIGN KEY (username) REFERENCES Utilizador(username),
                                        FOREIGN KEY (id_notificacao) REFERENCES Notificacao(id_notificacao)
);




CREATE TABLE Playlist_Musica (
                                 playlist_nome     VARCHAR(100) NOT NULL,
                                 playlist_username VARCHAR(50)  NOT NULL,
                                 musica_id         SERIAL           NOT NULL,
                                 PRIMARY KEY (playlist_nome, playlist_username, musica_id),
                                 FOREIGN KEY (playlist_nome, playlist_username)
                                     REFERENCES Playlist(nome, username),
                                 FOREIGN KEY (playlist_nome, playlist_username)
                                     REFERENCES Playlist(nome, username)
                                     ON UPDATE CASCADE
                                     ON DELETE CASCADE,
                                 FOREIGN KEY (musica_id)
                                     REFERENCES Musica(id)
                                     ON DELETE CASCADE
                                     ON UPDATE CASCADE
);


CREATE TABLE Playlist_Categoria (
                                    playlist_nome  VARCHAR(100) NOT NULL,
                                    playlist_username           VARCHAR(50) NOT NULL,
                                    nome_categoria   VARCHAR(50) NOT NULL,
                                    PRIMARY KEY (playlist_nome, playlist_username, nome_categoria),
                                    FOREIGN KEY (playlist_nome, playlist_username)
                                        REFERENCES Playlist(nome, username),
                                    FOREIGN KEY (playlist_nome, playlist_username)
                                        REFERENCES Playlist(nome, username)
                                        ON UPDATE CASCADE
                                        ON DELETE CASCADE,
                                    FOREIGN KEY (nome_categoria) REFERENCES Categoria(nome_categoria)
);




CREATE TABLE Musica_Categoria (
                                  musica_id      SERIAL          NOT NULL,
                                  nome_categoria VARCHAR(50)  NOT NULL,
                                  PRIMARY KEY (musica_id, nome_categoria),
                                  FOREIGN KEY (musica_id)
                                      REFERENCES Musica(id)
                                      ON DELETE CASCADE
                                      ON UPDATE CASCADE,
                                  FOREIGN KEY (nome_categoria)
                                      REFERENCES Categoria(nome_categoria)
);


CREATE TABLE Reporte_Comentario (
                                    id_reporte       SERIAL PRIMARY KEY,
                                    reporter_username VARCHAR(50) NOT NULL,
                                    idcomentario      INTEGER NOT NULL,
                                    dataReporte       DATE NOT NULL DEFAULT CURRENT_DATE,
                                    motivo            VARCHAR(50) NOT NULL CHECK (motivo IN ('linguagem inadequada', 'spam', 'outro')),
                                    FOREIGN KEY (reporter_username) REFERENCES Utilizador(username),
                                    FOREIGN KEY (idcomentario) REFERENCES Comentario(idcomentario)
);


CREATE TABLE Reage_Live (
                            username             VARCHAR(50) NOT NULL,
                            live_url             VARCHAR(255) NOT NULL,
                            live_criador_username VARCHAR(50) NOT NULL,
                            valor                NUMERIC(10,2) NOT NULL CHECK (valor > 0),
                            mensagem             TEXT,
                            timestamp            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (username, live_url, live_criador_username, timestamp),
                            FOREIGN KEY (username) REFERENCES Utilizador(username),
                            FOREIGN KEY (live_url, live_criador_username)
                                REFERENCES Live(url, criador_username)
);



CREATE TABLE refresh_tokens (
                                username     TEXT       NOT NULL
                                    REFERENCES Utilizador(username)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE,
                                token        TEXT       NOT NULL PRIMARY KEY,
                                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TYPE pagina_tipo AS ENUM ('musica', 'playlist', 'usuario');


CREATE TABLE Historico (
                           id SERIAL PRIMARY KEY,
                           username VARCHAR(50) NOT NULL,
                           tipo pagina_tipo NOT NULL,
                           id_musica INT,
                           playlist_nome VARCHAR(100),
                           playlist_username VARCHAR(50),
                           profile_username VARCHAR(50),
                           visited_at TIMESTAMP NOT NULL DEFAULT NOW(),


                           FOREIGN KEY(username) REFERENCES Utilizador(username)
                               ON UPDATE CASCADE ON DELETE CASCADE,
                           FOREIGN KEY(id_musica) REFERENCES Musica(id)
                               ON UPDATE CASCADE ON DELETE CASCADE,
                           FOREIGN KEY (playlist_nome, playlist_username)
                               REFERENCES Playlist(nome, username)
                               ON UPDATE CASCADE ON DELETE CASCADE,
                           FOREIGN KEY(profile_username) REFERENCES Utilizador(username)
                               ON UPDATE CASCADE ON DELETE CASCADE,


                           CHECK (
                               (tipo='musica'   AND id_musica IS NOT NULL      AND playlist_nome IS NULL AND profile_username IS NULL)
                                   OR (tipo='playlist' AND playlist_nome IS NOT NULL  AND id_musica IS NULL     AND profile_username IS NULL)
                                   OR (tipo='usuario'  AND profile_username IS NOT NULL AND id_musica IS NULL    AND playlist_nome IS NULL)
                               )
);


CREATE TABLE Usuario_Status (
                                username           VARCHAR(50) PRIMARY KEY
                                    REFERENCES Utilizador(username)
                                        ON UPDATE CASCADE
                                        ON DELETE CASCADE,
                                current_musica_id  SERIAL          REFERENCES Musica(id)
                                                                       ON DELETE SET NULL,
                                is_listening       BOOLEAN      NOT NULL DEFAULT FALSE,
                                updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX ux_historico_user_musica
    ON Historico(username, id_musica)
    WHERE tipo = 'musica';

CREATE UNIQUE INDEX ux_historico_user_playlist
    ON Historico(username, playlist_nome, playlist_username)
    WHERE tipo = 'playlist';

CREATE UNIQUE INDEX ux_historico_user_usuario
    ON Historico(username, profile_username)
    WHERE tipo = 'usuario';


COMMIT;
